"""
CREST — Complaints API Router
All complaint lifecycle endpoints: ingest, queue, resolve, audit export.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session


from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from backend.utils.runtime import DEV_MOCK, USE_PGVECTOR
from backend.models.complaint import ComplaintIngest, ComplaintOut, ResolveRequest, AssignRequest, EscalateRequest, ApproveDraftRequest
from backend.services.complaint_service import (
    ingest_complaint, get_priority_queue, assign_complaint,
    resolve_complaint, approve_draft, export_audit_trail, find_similar,
    find_least_loaded_employee
)
from ai.embeddings.embedder import embed
from ai.agents.classifier_agent import classify
from ai.ner.extractor import extract
from ai.rag.retriever import generate_draft_reply
from asgiref.sync import async_to_sync
from backend.utils.socket import broadcast_queue_update, broadcast_new_complaint
from backend.api.deps import get_current_user
from backend.models.user import User
from backend.services.translation_service import translator

router = APIRouter(prefix="/api/complaints", tags=["complaints"])
logger = get_logger("crest.api.complaints")


async def ingest_complaint_logic(payload_dict: dict, db: Session):
    """
    Core ingestion logic including AI pipeline with Bhashini bidirectional translation and auto-detection.
    Reused by SMS, WhatsApp, and testing endpoints.
    """
    body = payload_dict.get("body", "")
    subject = payload_dict.get("subject", "")
    language = payload_dict.get("language", "en")

    # ── Check for region update follow-up ──
    from backend.models.complaint import Complaint
    from backend.models.user import Region
    
    customer_id = payload_dict.get("customer_id", "unknown")
    channel = (payload_dict.get("channel") or "app").lower().strip()
    
    if customer_id != "unknown" and channel != "twitter" and db is not None:
        open_complaint = (
            db.query(Complaint)
            .filter(Complaint.customer_id == customer_id)
            .filter(Complaint.status == "open")
            .filter(Complaint.region_id == None)
            .order_by(Complaint.created_at.desc())
            .first()
        )
        if open_complaint:
            # Check if body mentions any of our active regions (Delhi, Mumbai, Bangalore)
            regions = db.query(Region).all()
            matched_region = None
            body_lower = body.lower()
            for r in regions:
                if r.name.lower() in body_lower:
                    matched_region = r
                    break
            
            if matched_region:
                open_complaint.region_id = matched_region.id
                db.commit()
                
                ref_id = open_complaint.external_ref or str(open_complaint.id)
                portal_url = "https://crest-ui-0uc4.onrender.com"
                tracking_link = f"{portal_url}/track?ref={ref_id}&contact={customer_id}"
                
                confirm_msg = (
                    f"Thank you! We have successfully routed your ticket to our {matched_region.name} branch.\n\n"
                    f"Here is your reference ID:\n"
                    f"(Ticket Ref: {ref_id})\n\n"
                    f"You can track your live grievance status directly here without entering details:\n"
                    f"{tracking_link}\n\n"
                    f"Thank you! 🙏"
                )
                
                try:
                    if channel == "email" or "@" in customer_id:
                        from integrations.email.sender import send_customer_reply
                        send_customer_reply(
                            recipient=customer_id,
                            reply_body=confirm_msg,
                            subject=f"Re: [Ticket Ref: {ref_id[:8]}] Region Updated",
                            in_reply_to=payload_dict.get("external_ref")
                        )
                    elif channel == "whatsapp":
                        from integrations.whatsapp.sender import send_whatsapp_reply
                        send_whatsapp_reply(
                            recipient_phone=customer_id,
                            reply_body=confirm_msg,
                            external_ref=payload_dict.get("external_ref")
                        )
                    elif channel == "sms":
                        from integrations.sms.sender import send_sms_reply
                        send_sms_reply(
                            recipient_phone=customer_id,
                            reply_body=confirm_msg,
                            external_ref=payload_dict.get("external_ref")
                        )
                except Exception as auto_err:
                    logger.error(f"Failed to dispatch region confirmation response: {auto_err}")
                
                return open_complaint
    
    # Bidirectional Pivot-Translation for regional Indian languages (MeitY Bhashini Gateway) abhi ke liye google translate fallback
    if language and language.strip().lower() != "en":
        body_for_ai = await translator.translate(body, source_lang=language, target_lang="en")
        subject_for_ai = await translator.translate(subject, source_lang=language, target_lang="en")
    else:
        # Auto-detect language for intake channels (Email, SMS, default Web calls)
        body_for_ai, detected_lang = await translator.detect_and_translate(body, target_lang="en")
        if detected_lang != "en":
            language = detected_lang
            subject_for_ai = await translator.translate(subject, source_lang=language, target_lang="en")
        else:
            subject_for_ai = subject
    
    classification  = classify(body_for_ai)
    entities        = extract(body_for_ai)
    embedding       = embed(body_for_ai)
    rag_result      = generate_draft_reply(
        complaint_body    = body_for_ai,
        complaint_subject = subject_for_ai,
        named_entities    = entities.to_dict(),
        category          = classification.category,
        embedding         = embedding,
        customer_name     = payload_dict.get("customer_name"),
    )
    
    # Translate generated response back to customer's input language
    draft_reply = rag_result["draft"]
    if language and language.strip().lower() != "en" and draft_reply:
        draft_reply_final = await translator.translate(draft_reply, source_lang="en", target_lang=language)
    else:
        draft_reply_final = draft_reply

    
    complaint = ingest_complaint(
        db            = db,
        channel_name  = payload_dict.get("channel", "app"),
        customer_id   = payload_dict.get("customer_id", "unknown"),
        body          = body,  # Keep the original typed regional text for compliance record
        embedding     = embedding,
        subject       = subject,
        customer_name = payload_dict.get("customer_name"),
        external_ref  = payload_dict.get("external_ref"),
        language      = language,
        sla_hours     = payload_dict.get("sla_hours", 720),
        severity      = classification.severity,
        anger_score   = classification.anger_score,
        sentiment     = classification.sentiment,
        category      = classification.category,
        sub_category  = classification.sub_category,
        named_entities= entities.to_dict(),
        draft_reply   = draft_reply_final,  # Store the back-translated draft!
        draft_metadata= rag_result["sources"],
        region_id     = payload_dict.get("region_id"),
    )
    
    try:
        await broadcast_queue_update()
        await broadcast_new_complaint(str(complaint.id), complaint.severity, complaint.category)
    except Exception as ws_err:
        logger.error(f"WebSocket broadcast failed: {ws_err}")

    # Dispatch dynamic, polite region request auto-responses (EXCEPT for Twitter)
    channel = (payload_dict.get("channel") or "app").lower().strip()
    recipient = payload_dict.get("customer_id")
    
    if channel != "twitter" and recipient and recipient != "unknown":
        ref = payload_dict.get("external_ref") or str(complaint.id)[:8]
        msg = (
            "Hello! 👋 \n\n"
            "We have received your complaint: \n\n"
            "To help us route this to the nearest nodal branch and provide you with faster support, "
            "could you please reply with your city or region? \n\n"
            "Thank you! 🙏"
        )
        
        try:
            if channel == "email" or "@" in recipient:
                from integrations.email.sender import send_customer_reply
                send_customer_reply(
                    recipient=recipient,
                    reply_body=msg,
                    subject=f"Re: [Ticket Ref: {ref}] {complaint.subject or 'Complaint Registration'}",
                    in_reply_to=payload_dict.get("external_ref")
                )
                logger.info(f"Polite region request email sent to {recipient}")
            elif channel == "whatsapp":
                from integrations.whatsapp.sender import send_whatsapp_reply
                send_whatsapp_reply(
                    recipient_phone=recipient,
                    reply_body=msg,
                    external_ref=payload_dict.get("external_ref")
                )
                logger.info(f"Polite region request WhatsApp sent to {recipient}")
            elif channel == "sms":
                from integrations.sms.sender import send_sms_reply
                send_sms_reply(
                    recipient_phone=recipient,
                    reply_body=msg,
                    external_ref=payload_dict.get("external_ref")
                )
                logger.info(f"Polite region request SMS sent to {recipient}")
        except Exception as auto_err:
            logger.error(f"Failed to dispatch polite region request for channel {channel}: {auto_err}")

    return complaint



# ── Ingest (sync path — for testing; production uses Kafka → Celery) ──

@router.post("/ingest", response_model=dict, status_code=201)
async def ingest(payload: ComplaintIngest, db: Optional[Session] = Depends(get_db_optional)):
    """
    Synchronous ingest endpoint.
    Runs the full AI pipeline in-request (use for testing / low-volume channels).
    """
    if DEV_MOCK:
        return mock_ingest(payload.model_dump())

    try:
        complaint = await ingest_complaint_logic(payload.model_dump(), db)
        return {
            "complaint_id":  str(complaint.id),
            "category":      complaint.category,
            "severity":      complaint.severity,
            "priority_score":float(complaint.priority_score),
            "is_duplicate":  complaint.is_duplicate,
            "duplicate_of":  str(complaint.duplicate_of) if complaint.duplicate_of else None,
            "sla_deadline":  complaint.sla_deadline.isoformat(),
            "region_prompt": (
                f"Hello! 👋 We have received your complaint (Ticket Ref: {str(complaint.id)[:8]}). "
                f"To help us route this to the nearest nodal branch and provide you with faster support, "
                f"could you please select or tell us your city or region?"
            )
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Ingest failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ingest failed")


# --------------Priority Queue ------------------------

@router.get("/queue", response_model=list[dict])
def priority_queue(
    limit: int = Query(50, le=200),
    region_id: Optional[int] = Query(None),
    db: Optional[Session] = Depends(get_db_optional),
    user: User = Depends(get_current_user)
):
    """
    Live Emotion-Decay Priority Queue.
    Returns open complaints ranked by priority_score descending.
    Strictly scoped by user role (Regional/Employee scoping).
    """
    if DEV_MOCK:
        return mock_get_priority_queue(limit=limit)

    # Scoping logic based on role
    effective_region_id = region_id
    if user.role == "SUB_ADMIN":
        effective_region_id = user.region_id
    elif user.role == "EMPLOYEE":
        # Employees see their assigned queue, handled by service if we pass user filter
        # For now, let's just use the regional filter if they are regional
        effective_region_id = user.region_id

    complaints = get_priority_queue(db, limit=limit, region_id=effective_region_id)
    
    for c in complaints:
        if c.assigned_employee_id is None and c.region_id is not None:
            new_assignee = find_least_loaded_employee(db, c.region_id)
            if new_assignee:
                assign_complaint(db, str(c.id), str(new_assignee))
                c.assigned_employee_id = new_assignee
    
    if user.role == "EMPLOYEE":
        complaints = [c for c in complaints if c.assigned_employee_id == user.id]

    return [
        {
            "id":             str(c.id),
            "channel":        c.channel.name if c.channel else None,
            "customer_id":    c.customer_id,
            "subject":        c.subject,
            "category":       c.category,
            "severity":       c.severity,
            "anger_score":    float(c.anger_score) if c.anger_score else None,
            "priority_score": float(c.priority_score) if c.priority_score else 0,
            "sla_deadline":   c.sla_deadline.isoformat() if c.sla_deadline else None,
            "sla_status":     c.sla_status,
            "status":         c.status,
            "region_id":      c.region_id,
            "assigned_employee_id": c.assigned_employee_id,
            "is_escalated":   c.is_escalated,
            "draft_approved": c.draft_approved,
            "language":       c.language,
            "created_at":     c.created_at.isoformat(),
        }
        for c in complaints
    ]


# -------------- Single Complaint --------------------

@router.get("/{complaint_id}", response_model=dict)
def get_complaint(
    complaint_id: str, 
    db: Optional[Session] = Depends(get_db_optional),
    user: User = Depends(get_current_user)
):
    if DEV_MOCK:
        complaint = mock_get_complaint(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return complaint

    from backend.models.complaint import Complaint
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Access Control check
    if user.role == "SUB_ADMIN" and c.region_id != user.region_id:
        raise HTTPException(status_code=403, detail="Access denied to other regions")
        
    is_superior_takeover = False
    if c.assigned_employee_id:
        assigned_user = db.query(User).filter(User.id == c.assigned_employee_id).first()
        if assigned_user and assigned_user.role in ["SUB_ADMIN", "ADMIN"]:
            is_superior_takeover = True

    if user.role == "EMPLOYEE":
        if c.assigned_employee_id != user.id:
            if not is_superior_takeover or c.region_id != user.region_id:
                raise HTTPException(status_code=403, detail="Complaint not assigned to you")

    return {
        "id":              str(c.id),
        "channel":         c.channel.name if c.channel else None,
        "customer_id":     c.customer_id,
        "customer_name":   c.customer_name,
        "subject":         c.subject,
        "body":            c.body,
        "category":        c.category,
        "sub_category":    c.sub_category,
        "severity":        c.severity,
        "anger_score":     float(c.anger_score) if c.anger_score else None,
        "sentiment":       c.sentiment,
        "named_entities":  c.named_entities,
        "priority_score":  float(c.priority_score) if c.priority_score else 0,
        "sla_deadline":    c.sla_deadline.isoformat() if c.sla_deadline else None,
        "sla_status":      c.sla_status,
        "status":          c.status,
        "region_id":       c.region_id,
        "assigned_employee_id": c.assigned_employee_id,
        "is_escalated":    c.is_escalated,
        "is_duplicate":    c.is_duplicate,
        "duplicate_of":    str(c.duplicate_of) if c.duplicate_of else None,
        "draft_reply":     c.draft_reply,
        "draft_metadata":  c.draft_metadata,
        "draft_approved":  c.draft_approved,
        "language":        c.language,
        "is_superior_takeover": is_superior_takeover,
        "resolution_note": c.resolution_note,
        "created_at":      c.created_at.isoformat(),
        "resolved_at":     c.resolved_at.isoformat() if c.resolved_at else None,
    }


# ----------------- Similar Complaints (DNA Fingerprint) ------------------

@router.get("/{complaint_id}/similar", response_model=list[dict])
def similar_complaints(
    complaint_id: str,
    top_k: int = Query(5, le=20),
    db: Optional[Session] = Depends(get_db_optional),
):
    """
    Find complaints with similar Complaint DNA (cosine similarity > 0.75).
    Shown to agents as context: 'These related complaints may help you resolve this.'
    """
    if DEV_MOCK:
        return mock_find_similar(complaint_id, top_k=top_k)

    from backend.models.complaint import Complaint
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if not USE_PGVECTOR or c.embedding is None:
        return []

    embedding = c.embedding if isinstance(c.embedding, list) else list(c.embedding)
    similar = find_similar(embedding, top_k=top_k)
    return [s for s in similar if str(s["id"]) != complaint_id]


#------- Assign to employee-------

@router.patch("/{complaint_id}/assign", response_model=dict)
def assign(complaint_id: str, body: AssignRequest, db: Optional[Session] = Depends(get_db_optional)):
    if DEV_MOCK:
        return {"status": "mock_assigned"}

    try:
        c = assign_complaint(db, complaint_id, str(body.employee_id))
        c.assigned_employee_id = body.employee_id
        db.commit()
        try:
            async_to_sync(broadcast_queue_update)()
        except Exception:
            pass
        return {"status": "assigned", "employee_id": c.assigned_employee_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{complaint_id}/escalate", response_model=dict)
def escalate(complaint_id: str, body: EscalateRequest, db: Optional[Session] = Depends(get_db_optional)):
    """
    Escalates a complaint to the regional Sub-Admin.
    """
    from backend.models.complaint import Complaint
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    c.is_escalated = True
    c.assigned_employee_id = None # Remove from employee's queue
    c.status = "open" # Put back in the sub-admin's regional pool
    
    db.commit()
    try:
        async_to_sync(broadcast_queue_update)()
    except Exception:
        pass
    return {"status": "escalated"}


# ----------- Approve Draft-------------------

@router.patch("/{complaint_id}/approve-draft", response_model=dict)
def approve_draft_reply(complaint_id: str, body: ApproveDraftRequest, db: Optional[Session] = Depends(get_db_optional)):
    try:
        if DEV_MOCK:
            result = mock_approve_draft(complaint_id, body.agent)
            if not result:
                raise HTTPException(status_code=404, detail="Complaint not found")
            try:
                async_to_sync(broadcast_queue_update)()
            except Exception:
                pass
            return result

        res = approve_draft(db, complaint_id, body.agent, body.draft_reply)
        try:
            async_to_sync(broadcast_queue_update)()
        except Exception:
            pass
        return res
    except ValueError as e:
        message = str(e)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)
    except Exception as e:
        logger.error(f"Approve draft failed: {e}", exc_info=True)
        detail = str(e).strip() or "Approve draft failed"
        raise HTTPException(status_code=502, detail=detail)


# --------------------- Resolve----------------------

@router.patch("/{complaint_id}/resolve", response_model=dict)
def resolve(complaint_id: str, body: ResolveRequest, db: Optional[Session] = Depends(get_db_optional)):
    if DEV_MOCK:
        complaint = mock_resolve_complaint(complaint_id, body.agent, body.resolution_note, body.csat)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return {
            "status": "resolved",
            "sla_status": complaint["sla_status"],
            "resolved_at": complaint["resolved_at"],
        }

    try:
        c = resolve_complaint(
            db, complaint_id, body.agent, body.resolution_note,
            add_to_kb=body.add_to_kb, csat=body.csat,
        )
        try:
            async_to_sync(broadcast_queue_update)()
        except Exception:
            pass
        return {
            "status":     "resolved",
            "sla_status": c.sla_status,
            "resolved_at":c.resolved_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ----------------- RBI Audit Export ---------------------------

@router.get("/{complaint_id}/audit", response_model=list[dict])
def audit_trail(complaint_id: str, db: Optional[Session] = Depends(get_db_optional)):
    """
    Full immutable audit trail for a complaint.
    Source for RBI-compliant PDF export.
    """
    if DEV_MOCK:
        return mock_export_audit_trail(complaint_id)
    return export_audit_trail(db, complaint_id)


# --------------- Public Tracking ------------------------------

@router.get("/track/{complaint_id}", response_model=dict)
def track_complaint(complaint_id: str, db: Optional[Session] = Depends(get_db_optional)):
    """
    Public-facing endpoint for customer tracking.
    Returns safe, non-sensitive status info.
    """
    if DEV_MOCK:
        complaint = mock_get_complaint(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return {
            "id":             complaint["id"],
            "status":         complaint["status"],
            "category":       complaint["category"],
            "subject":        complaint["subject"],
            "sla_deadline":   complaint["sla_deadline"],
            "created_at":     complaint["created_at"],
            "resolved_at":    complaint["resolved_at"],
            "resolution_note":complaint.get("resolution_note") if complaint["status"] == "resolved" else None
        }

    from backend.models.complaint import Complaint
    try:
        c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Complaint ID format")
        
    if not c:
        raise HTTPException(status_code=404, detail="Grievance not found")

    return {
        "id":              str(c.id),
        "status":          c.status,
        "category":        c.category,
        "subject":         c.subject,
        "sla_deadline":    c.sla_deadline.isoformat() if c.sla_deadline else None,
        "created_at":      c.created_at.isoformat(),
        "resolved_at":     c.resolved_at.isoformat() if c.resolved_at else None,
        "resolution_note": c.resolution_note if c.status == "resolved" else None
    }


# -------Internal Worker Hooks -----------------------

from pydantic import BaseModel

class WebhookBroadcast(BaseModel):
    complaint_id: Optional[str] = None
    severity:     Optional[int] = None
    category:     Optional[str] = None
    surge_pct:    Optional[float] = None
    rca_insight:  Optional[str] = None
    type:         str = "complaint"  # complaint or spike


@router.post("/internal/broadcast", status_code=200)
def celery_broadcast_webhook(payload: WebhookBroadcast):
    """
    Called strictly by background workers to trigger Socket.IO via Uvicorn master thread.
    """
    try:
        from backend.utils.socket import broadcast_queue_update, broadcast_new_complaint, broadcast_spike_alert
        
        if payload.type == "spike":
            async_to_sync(broadcast_spike_alert)(payload.category, payload.surge_pct, payload.rca_insight)
        else:
            async_to_sync(broadcast_queue_update)()
            if payload.complaint_id:
                async_to_sync(broadcast_new_complaint)(payload.complaint_id, payload.severity, payload.category)
        
        return {"status": "broadcast_fired"}
    except Exception as e:
        logger.error(f"Celery webhook broadcast failed: {e}")
        raise HTTPException(status_code=500, detail="Socket broadcast failed")

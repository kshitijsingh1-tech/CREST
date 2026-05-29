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
from backend.mock_store import (
    approve_draft as mock_approve_draft,
    assign_complaint as mock_assign_complaint,
    export_audit_trail as mock_export_audit_trail,
    find_similar as mock_find_similar,
    get_complaint as mock_get_complaint,
    get_priority_queue as mock_get_priority_queue,
    ingest as mock_ingest,
    resolve_complaint as mock_resolve_complaint,
)
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
from backend.utils.portal import build_tracking_link

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
    
    if customer_id != "unknown" and db is not None:
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
                
                ref_id = str(open_complaint.id)
                tracking_link = build_tracking_link(ref_id, customer_id)

                confirm_msg = (
                    f"Thank you! We have successfully routed your ticket to our {matched_region.name} branch.\n\n"
                    f"Ticket Ref: {ref_id}\n\n"
                    f"Track your live grievance status here:\n"
                    f"{tracking_link}\n\n"
                    f"Thank you! 🙏"
                )
                
                try:
                    if channel == "email":
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
                    elif channel == "instagram":
                        from integrations.instagram.sender import send_instagram_dm
                        send_instagram_dm(
                            customer_username=customer_id,
                            reply_text=confirm_msg,
                        )
                    elif channel == "telegram":
                        from integrations.telegram.sender import send_telegram_reply
                        send_telegram_reply(
                            chat_id=customer_id,
                            reply_text=confirm_msg,
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

    # Dispatch dynamic, polite region request auto-responses
    channel = (payload_dict.get("channel") or "app").lower().strip()
    recipient = payload_dict.get("customer_id")
    
    if recipient and recipient != "unknown":
        ref = str(complaint.id)
        tracking_link = build_tracking_link(ref, recipient)
        # Adjust message if region was already provided (like in web portal)
        if complaint.region_id:
            msg = (
                "Hello! 👋\n\n"
                "We have successfully received your complaint.\n\n"
                f"Ticket Ref: {ref}\n\n"
                "Track your grievance status anytime here:\n"
                f"{tracking_link}\n\n"
                "Thank you! 🙏"
            )
        else:
            msg = (
                "Hello! 👋\n\n"
                "We have received your complaint.\n\n"
                f"Ticket Ref: {ref}\n\n"
                "Track your grievance status anytime here:\n"
                f"{tracking_link}\n\n"
                "📍 QUICK BRANCH ROUTING:\n"
                "To route this to the nearest branch immediately, click one of the links below:\n"
                f"• Route to Delhi Nodal Branch: {tracking_link}?set_region=Delhi\n"
                f"• Route to Mumbai Nodal Branch: {tracking_link}?set_region=Mumbai\n"
                f"• Route to Bangalore Nodal Branch: {tracking_link}?set_region=Bangalore\n\n"
                f"Alternatively, you can reply directly to this {channel} mentioning your city/region.\n\n"
                "Thank you! 🙏"
            )
        
        try:
            from integrations.email.sender import is_email_address
            if channel == "email" or is_email_address(recipient):
                if is_email_address(recipient):
                    from integrations.email.sender import send_customer_reply
                    send_customer_reply(
                        recipient=recipient,
                        reply_body=msg,
                        subject=f"Re: [Ticket Ref: {ref}] {complaint.subject or 'Complaint Registration'}",
                        in_reply_to=payload_dict.get("external_ref")
                    )
                    logger.info(f"Confirmation email sent to {recipient}")
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
            elif channel == "instagram":
                from integrations.instagram.sender import send_instagram_dm
                send_instagram_dm(
                    customer_username=recipient,
                    reply_text=msg,
                )
                logger.info(f"Polite region request Instagram DM sent to {recipient}")
            elif channel == "telegram":
                from integrations.telegram.sender import send_telegram_reply
                send_telegram_reply(
                    chat_id=recipient,
                    reply_text=msg,
                    external_ref=ref
                )
                logger.info(f"Polite region request Telegram sent to {recipient}")
            elif channel == "discord":
                from integrations.discord.sender import send_discord_dm
                send_discord_dm(
                    recipient_user_id=recipient,
                    reply_text=msg
                )
                logger.info(f"Polite region request Discord DM sent to {recipient}")

        except Exception as auto_err:
            logger.error(f"Failed to dispatch polite region request for channel {channel}: {auto_err}")

    # --- AUTO-APPROVE AI DRAFT ---
    # If AUTO_APPROVE_DRAFTS is enabled, we automatically approve and dispatch the draft reply
    import os
    from backend.utils.runtime import is_truthy
    if is_truthy(os.getenv("AUTO_APPROVE_DRAFTS", "0")):
        try:
            from backend.services.complaint_service import approve_draft
            logger.info(f"Auto-approving draft for complaint {complaint.id} due to AUTO_APPROVE_DRAFTS=1")
            approve_draft(db, str(complaint.id), agent="AI Auto-Responder")
        except Exception as auto_approve_err:
            logger.error(f"Failed to auto-approve draft for complaint {complaint.id}: {auto_approve_err}")

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
    if user.role == "EMPLOYEE":
        complaints = get_priority_queue(db, limit=limit, assigned_employee_id=user.id)
    else:
        effective_region_id = region_id
        if user.role == "SUB_ADMIN":
            effective_region_id = user.region_id

        complaints = get_priority_queue(db, limit=limit, region_id=effective_region_id)
        
        for c in complaints:
            if c.assigned_employee_id is None and c.region_id is not None:
                new_assignee = find_least_loaded_employee(db, c.region_id)
                if new_assignee:
                    assign_complaint(db, str(c.id), str(new_assignee))
                    c.assigned_employee_id = new_assignee

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
            "region_name":    c.region.name if c.region else None,
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
        "region_name":      c.region.name if c.region else None,
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
    Escalates a complaint:
    - From EMPLOYEE: Sets is_escalated=True, puts back in Sub-Admin's regional pool (assigned_employee_id=None).
    - From SUB_ADMIN: Sets region_id=None (HQ/Super Admin), sets is_escalated=True, assigned_employee_id=None.
    """
    from backend.models.complaint import Complaint, ComplaintAudit
    from backend.models.user import User
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    escalator = db.query(User).filter(User.id == body.employee_id).first()
    if not escalator:
        raise HTTPException(status_code=404, detail="User not found")

    old_region = c.region_id
    old_assignee = c.assigned_employee_id

    if escalator.role == "EMPLOYEE":
        c.is_escalated = True
        c.assigned_employee_id = None
        c.status = "open"
        action_detail = "escalated_to_sub_admin"
    elif escalator.role in ("SUB_ADMIN", "SUPER_ADMIN"):
        c.is_escalated = True
        c.region_id = None  # Route to HQ / Super Admin
        c.assigned_employee_id = None
        c.status = "open"
        action_detail = "escalated_to_super_admin"
    else:
        raise HTTPException(status_code=400, detail="Invalid role for escalation")

    audit = ComplaintAudit(
        complaint_id=c.id,
        actor=f"{escalator.name} ({escalator.role})",
        action=action_detail,
        old_value={"region_id": old_region, "assigned_employee_id": old_assignee},
        new_value={"region_id": c.region_id, "assigned_employee_id": c.assigned_employee_id, "is_escalated": True}
    )
    db.add(audit)
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
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"celery_broadcast_webhook failed: {e}")
        return {"status": "error", "detail": str(e)}


async def try_update_complaint_region(db: Session, channel_name: str, customer_id: str, text: str) -> bool:
    """
    Checks if the user has an open complaint with no region set,
    and if the input text matches one of the known regions.
    Strict token-level matching is used intentionally to prevent quoted email
    thread bodies from causing false region matches (e.g. 'Delhi' appearing in
    the previous confirmation message would trigger a wrong match if the user
    replies 'MUMBAI' via email and the full thread is passed as body).
    Returns True if region was updated, else False.
    """
    import re as _re
    from backend.models.complaint import Complaint, Channel
    from backend.models.user import Region
    from backend.services.complaint_service import find_least_loaded_employee, _write_audit

    if db is None:
        logger.warning("try_update_complaint_region: db is None, skipping")
        return False

    # 1. Build all customer_id variants to match however it was stored
    cust_id_clean = str(customer_id).replace("whatsapp:", "").replace("sms:", "").strip()
    customer_id_variants = list({
        cust_id_clean,
        f"whatsapp:{cust_id_clean}",
        f"sms:{cust_id_clean}",
        customer_id.strip(),
    })

    # 1a. Primary query: with channel join
    complaint = None
    try:
        complaint = (
            db.query(Complaint)
            .join(Complaint.channel)
            .filter(
                Complaint.customer_id.in_(customer_id_variants),
                Channel.name.ilike(channel_name),
                Complaint.region_id.is_(None),
                Complaint.status.in_(["open", "in_progress"])
            )
            .order_by(Complaint.created_at.desc())
            .first()
        )
    except Exception as q_err:
        logger.warning(f"try_update_complaint_region: primary query failed: {q_err}")

    # 1b. Fallback: without channel filter (catches channel-name mismatches)
    if not complaint:
        try:
            complaint = (
                db.query(Complaint)
                .filter(
                    Complaint.customer_id.in_(customer_id_variants),
                    Complaint.region_id.is_(None),
                    Complaint.status.in_(["open", "in_progress"])
                )
                .order_by(Complaint.created_at.desc())
                .first()
            )
        except Exception as q_err2:
            logger.warning(f"try_update_complaint_region: fallback query failed: {q_err2}")

    if not complaint:
        logger.info(
            f"try_update_complaint_region: no open regionless complaint - "
            f"customer={cust_id_clean}, channel={channel_name}"
        )
        return False

    # 2. Strict token matching only.
    # We deliberately avoid substring containment (r_name in body) because quoted
    # email threads contain old region names from confirmation messages, which
    # causes the wrong region to match when the user writes e.g. "MUMBAI" and the
    # full body still includes "Delhi" from the thread.
    cleaned_text = text.strip().lower()
    tokens = {t for t in _re.split(r"[\s,.!?;:-]+", cleaned_text) if t}
    regions = db.query(Region).all()
    matched_region = None

    for r in regions:
        significant_words = {w for w in r.name.lower().strip().split() if len(w) >= 3}
        overlap = significant_words & tokens
        if overlap:
            matched_region = r
            logger.info(
                f"try_update_complaint_region: matched region '{r.name}' "
                f"via tokens {overlap} in text '{text[:80]}'"
            )
            break

    if not matched_region:
        logger.info(f"try_update_complaint_region: no region matched in text '{text[:80]}'")
        return False

    # 3. Update the complaint with region_id
    try:
        complaint.region_id = matched_region.id
        assigned_employee_id = find_least_loaded_employee(db, matched_region.id)
        if assigned_employee_id:
            complaint.assigned_employee_id = assigned_employee_id
            from datetime import datetime, timezone
            complaint.assigned_at = datetime.now(timezone.utc)
            complaint.status = "in_progress"
        else:
            complaint.assigned_employee_id = None
            complaint.assigned_at = None
            complaint.status = "open"
        db.commit()
        db.refresh(complaint)
        _write_audit(db, complaint.id, "system", "region_assigned", None, {
            "region": matched_region.name,
            "region_id": matched_region.id,
            "assigned_employee_id": assigned_employee_id
        })
    except Exception as e:
        logger.error(f"Failed to update region for complaint {complaint.id}: {e}")
        db.rollback()
        return False

    # 4. Send confirmation message back on the originating channel
    msg = (
        f"Thank you! We have updated your nodal region to **{matched_region.name}** "
        f"and successfully routed your ticket (Ref: {complaint.id}) to our regional branch office."
    )
    try:
        if channel_name == "discord":
            from integrations.discord.sender import send_discord_dm
            send_discord_dm(recipient_user_id=customer_id, reply_text=msg)
        elif channel_name == "telegram":
            from integrations.telegram.sender import send_telegram_reply
            send_telegram_reply(chat_id=customer_id, reply_text=msg, external_ref=str(complaint.id))
        elif channel_name in ("whatsapp", "sms"):
            _cid = str(customer_id).replace("whatsapp:", "").replace("sms:", "").strip()
            from integrations.whatsapp.sender import send_whatsapp_reply
            send_whatsapp_reply(recipient_phone=_cid, reply_body=msg, external_ref=str(complaint.id))
        elif channel_name == "instagram":
            from integrations.instagram.sender import send_instagram_dm
            send_instagram_dm(customer_username=customer_id, reply_text=msg)
        elif channel_name == "email":
            from integrations.email.sender import send_customer_reply
            send_customer_reply(
                recipient=customer_id,
                reply_body=msg,
                subject=f"Re: [Ticket Ref: {complaint.id}] Region Confirmed",
                in_reply_to=complaint.external_ref
            )
    except Exception as dispatch_err:
        logger.error(f"Failed to send region confirmation: {dispatch_err}")

    try:
        from backend.utils.socket import broadcast_queue_update
        import asyncio
        asyncio.create_task(broadcast_queue_update())
    except Exception:
        pass

    return True


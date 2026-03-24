"""
CREST — Complaints API Router
All complaint lifecycle endpoints: ingest, queue, resolve, audit export.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

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
from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from backend.utils.runtime import DEV_MOCK, USE_PGVECTOR
from backend.models.complaint import ComplaintIngest, ComplaintOut, ResolveRequest, AssignRequest
from backend.services.complaint_service import (
    ingest_complaint, get_priority_queue, assign_complaint,
    resolve_complaint, approve_draft, export_audit_trail, find_similar,
)
from ai.embeddings.embedder import embed
from ai.agents.classifier_agent import classify
from ai.ner.extractor import extract
from ai.rag.retriever import generate_draft_reply
from asgiref.sync import async_to_sync
from backend.utils.socket import broadcast_queue_update, broadcast_new_complaint

router = APIRouter(prefix="/api/complaints", tags=["complaints"])
logger = get_logger("crest.api.complaints")


# ── Ingest (sync path — for testing; production uses Kafka → Celery) ──

@router.post("/ingest", response_model=dict, status_code=201)
def ingest(payload: ComplaintIngest, db: Optional[Session] = Depends(get_db_optional)):
    """
    Synchronous ingest endpoint.
    Runs the full AI pipeline in-request (use for testing / low-volume channels).
    Production: Kafka consumer dispatches to Celery ingest_worker instead.
    """
    if DEV_MOCK:
        return mock_ingest(payload.model_dump())

    try:
        classification  = classify(payload.body)
        entities        = extract(payload.body)
        embedding       = embed(payload.body)
        draft           = generate_draft_reply(
            complaint_body    = payload.body,
            complaint_subject = payload.subject,
            named_entities    = entities.to_dict(),
            category          = classification.category,
            embedding         = embedding,
            customer_name     = payload.customer_name,
        )
        complaint = ingest_complaint(
            db            = db,
            channel_name  = payload.channel,
            customer_id   = payload.customer_id,
            body          = payload.body,
            embedding     = embedding,
            subject       = payload.subject,
            customer_name = payload.customer_name,
            external_ref  = payload.external_ref,
            language      = payload.language,
            sla_hours     = payload.sla_hours,
            severity      = classification.severity,
            anger_score   = classification.anger_score,
            sentiment     = classification.sentiment,
            category      = classification.category,
            sub_category  = classification.sub_category,
            named_entities= entities.to_dict(),
            draft_reply   = draft,
        )
        
        try:
            async_to_sync(broadcast_queue_update)()
            async_to_sync(broadcast_new_complaint)(str(complaint.id), complaint.severity, complaint.category)
        except Exception as ws_err:
            logger.error(f"WebSocket broadcast failed: {ws_err}")

        return {
            "complaint_id":  str(complaint.id),
            "category":      complaint.category,
            "severity":      complaint.severity,
            "priority_score":float(complaint.priority_score),
            "is_duplicate":  complaint.is_duplicate,
            "duplicate_of":  str(complaint.duplicate_of) if complaint.duplicate_of else None,
            "sla_deadline":  complaint.sla_deadline.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Ingest failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ingest failed")


# ── Priority Queue ────────────────────────────────────────────

@router.get("/queue", response_model=list[dict])
def priority_queue(limit: int = Query(50, le=200), db: Optional[Session] = Depends(get_db_optional)):
    """
    Live Emotion-Decay Priority Queue.
    Returns open complaints ranked by priority_score descending.
    Refreshed every 5 min by Celery Beat.
    """
    if DEV_MOCK:
        return mock_get_priority_queue(limit=limit)

    complaints = get_priority_queue(db, limit=limit)
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
            "assigned_agent": c.assigned_agent,
            "draft_approved": c.draft_approved,
            "created_at":     c.created_at.isoformat(),
        }
        for c in complaints
    ]


# ── Single Complaint ──────────────────────────────────────────

@router.get("/{complaint_id}", response_model=dict)
def get_complaint(complaint_id: str, db: Optional[Session] = Depends(get_db_optional)):
    if DEV_MOCK:
        complaint = mock_get_complaint(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return complaint

    from backend.models.complaint import Complaint
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
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
        "assigned_agent":  c.assigned_agent,
        "is_duplicate":    c.is_duplicate,
        "duplicate_of":    str(c.duplicate_of) if c.duplicate_of else None,
        "draft_reply":     c.draft_reply,
        "draft_approved":  c.draft_approved,
        "resolution_note": c.resolution_note,
        "created_at":      c.created_at.isoformat(),
        "resolved_at":     c.resolved_at.isoformat() if c.resolved_at else None,
    }


# ── Similar Complaints (DNA Fingerprint) ─────────────────────

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


# ── Assign ───────────────────────────────────────────────────

@router.patch("/{complaint_id}/assign", response_model=dict)
def assign(complaint_id: str, body: AssignRequest, db: Optional[Session] = Depends(get_db_optional)):
    if DEV_MOCK:
        complaint = mock_assign_complaint(complaint_id, body.agent)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return {"status": "assigned", "agent": complaint["assigned_agent"]}

    try:
        c = assign_complaint(db, complaint_id, body.agent)
        try:
            async_to_sync(broadcast_queue_update)()
        except Exception:
            pass
        return {"status": "assigned", "agent": c.assigned_agent}
    except ValueError as e:
        message = str(e)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)


# ── Approve Draft ─────────────────────────────────────────────

@router.patch("/{complaint_id}/approve-draft", response_model=dict)
def approve_draft_reply(complaint_id: str, agent: str = Query(...), db: Optional[Session] = Depends(get_db_optional)):
    try:
        if DEV_MOCK:
            result = mock_approve_draft(complaint_id, agent)
            if not result:
                raise HTTPException(status_code=404, detail="Complaint not found")
            try:
                async_to_sync(broadcast_queue_update)()
            except Exception:
                pass
            return result

        res = approve_draft(db, complaint_id, agent)
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


# ── Resolve ───────────────────────────────────────────────────

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


# ── RBI Audit Export ──────────────────────────────────────────

@router.get("/{complaint_id}/audit", response_model=list[dict])
def audit_trail(complaint_id: str, db: Optional[Session] = Depends(get_db_optional)):
    """
    Full immutable audit trail for a complaint.
    Source for RBI-compliant PDF export.
    """
    if DEV_MOCK:
        return mock_export_audit_trail(complaint_id)
    return export_audit_trail(db, complaint_id)


# ── Internal Worker Hooks ─────────────────────────────────────

from pydantic import BaseModel

class WebhookBroadcast(BaseModel):
    complaint_id: str
    severity: int
    category: str

@router.post("/internal/broadcast", status_code=200)
def celery_broadcast_webhook(payload: WebhookBroadcast):
    """
    Called strictly by the background Celery Workers immediately after they finish
    persisting a new LLM draft reply. This triggers the WebSocket memory broadcast
    on the Uvicorn master thread!
    """
    try:
        async_to_sync(broadcast_queue_update)()
        async_to_sync(broadcast_new_complaint)(payload.complaint_id, payload.severity, payload.category)
        return {"status": "broadcast_fired"}
    except Exception as e:
        logger.error(f"Celery webhook broadcast failed: {e}")
        raise HTTPException(status_code=500, detail="Socket broadcast failed")

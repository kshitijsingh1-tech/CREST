"""
CREST — Complaint Service
Core business logic: deduplication, priority scoring, SLA management, resolution.
All vector operations use raw psycopg2 + pgvector for performance.
SQLAlchemy is used for CRUD.
"""

from __future__ import annotations

import json
import uuid
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from backend.models.complaint import Complaint, ComplaintAudit, Channel
from backend.models.knowledge import ResolutionKnowledge
from backend.utils.db import raw_conn
from backend.utils.logger import get_logger

logger = get_logger("crest.services.complaint")

DEDUP_THRESHOLD    = 0.92
SLA_DEFAULT_HOURS  = 720   # 30 days — Union Bank RBI mandate


# ─────────────────────────────────────────────
# DEDUPLICATION
# ─────────────────────────────────────────────

def find_duplicate(embedding: list[float], exclude_id: Optional[str] = None) -> Optional[dict]:
    """
    Run ANN cosine search against all open non-duplicate complaints.
    Returns the parent complaint dict if similarity > DEDUP_THRESHOLD, else None.
    """
    emb = np.array(embedding, dtype=np.float32)
    exclude_clause = "AND id != %s::uuid" if exclude_id else ""
    params = [emb, emb, DEDUP_THRESHOLD]
    if exclude_id:
        params.insert(2, exclude_id)

    with raw_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT  id, customer_id, category, status,
                        1 - (embedding <=> %s::vector) AS similarity
                FROM    complaints
                WHERE   is_duplicate = FALSE
                  AND   status NOT IN ('closed')
                  {exclude_clause}
                  AND   1 - (embedding <=> %s::vector) > %s
                ORDER   BY similarity DESC
                LIMIT   1
                """,
                params,
            )
            row = cur.fetchone()
            return dict(row) if row else None


def find_similar(embedding: list[float], top_k: int = 5, threshold: float = 0.75) -> list[dict]:
    """
    Find top_k similar complaints — used for agent context hints.
    Lower threshold than dedup (0.75 vs 0.92) to show related cases.
    """
    emb = np.array(embedding, dtype=np.float32)
    with raw_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT  id, subject, category, severity, status, created_at,
                        1 - (embedding <=> %s::vector) AS similarity
                FROM    complaints
                WHERE   is_duplicate = FALSE
                  AND   1 - (embedding <=> %s::vector) > %s
                ORDER   BY similarity DESC
                LIMIT   %s
                """,
                [emb, emb, threshold, top_k],
            )
            return [dict(r) for r in cur.fetchall()]


# ─────────────────────────────────────────────
# PRIORITY SCORING
# ─────────────────────────────────────────────

def calc_priority_score(
    severity:    int,
    anger_score: float,
    created_at:  datetime,
) -> float:
    """
    Emotion-Decay Priority formula.
    priority = severity_weight × anger_score × decay_factor

    severity_weight : P0→5, P1→4, P2→3, P3→2, P4→1
    decay_factor    : MIN(3.0,  1 + ln(1 + hours_waiting / 8))
    """
    severity_weight = max(1, 5 - severity)
    hours_waiting   = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
    decay_factor    = min(3.0, 1.0 + math.log(1 + hours_waiting / 8.0))
    return round(severity_weight * (anger_score or 0.5) * decay_factor, 4)


def refresh_all_priority_scores(db: Session) -> int:
    """
    Recalculate priority_score for every open complaint.
    Called by Celery Beat every 5 minutes.
    Returns count of updated rows.
    """
    open_complaints = (
        db.query(Complaint)
        .filter(Complaint.status.in_(["open", "in_progress"]))
        .filter(Complaint.is_duplicate == False)
        .all()
    )
    for c in open_complaints:
        c.priority_score = calc_priority_score(
            c.severity or 2,
            float(c.anger_score or 0.5),
            c.created_at,
        )
    db.commit()
    logger.info(f"Priority scores refreshed for {len(open_complaints)} complaints")
    return len(open_complaints)


# ─────────────────────────────────────────────
# INGEST
# ─────────────────────────────────────────────

def ingest_complaint(
    db:           Session,
    channel_name: str,
    customer_id:  str,
    body:         str,
    embedding:    list[float],
    *,
    subject:        Optional[str]  = None,
    customer_name:  Optional[str]  = None,
    external_ref:   Optional[str]  = None,
    language:       str            = "en",
    sla_hours:      int            = SLA_DEFAULT_HOURS,
    severity:       int            = 2,
    anger_score:    float          = 0.5,
    sentiment:      str            = "neutral",
    category:       Optional[str]  = None,
    sub_category:   Optional[str]  = None,
    named_entities: dict           = None,
    draft_reply:    Optional[str]  = None,
) -> Complaint:
    """
    Full ingest pipeline — dedup → priority → persist → audit.
    Returns the created Complaint ORM object.
    """
    # Resolve channel
    channel = db.query(Channel).filter(Channel.name == channel_name).first()
    if not channel:
        raise ValueError(f"Unknown channel: {channel_name}")

    # Dedup check
    dup = find_duplicate(embedding)
    is_dup      = dup is not None
    dup_of      = uuid.UUID(str(dup["id"])) if is_dup else None
    sim_score   = float(dup["similarity"]) if is_dup else None

    if is_dup:
        logger.info(f"Duplicate detected → parent {dup_of} (sim={sim_score:.4f})")

    # Priority
    now = datetime.now(timezone.utc)
    priority_score = calc_priority_score(severity, anger_score, now)
    sla_deadline   = now + timedelta(hours=sla_hours)

    # Build ORM object
    complaint = Complaint(
        channel_id      = channel.id,
        external_ref    = external_ref,
        customer_id     = customer_id,
        customer_name   = customer_name,
        subject         = subject,
        body            = body,
        language        = language,
        embedding       = np.array(embedding, dtype=np.float32),
        category        = category,
        sub_category    = sub_category,
        severity        = severity,
        anger_score     = anger_score,
        sentiment       = sentiment,
        named_entities  = named_entities or {},
        priority_score  = priority_score,
        sla_deadline    = sla_deadline,
        sla_status      = "on_track",
        is_duplicate    = is_dup,
        duplicate_of    = dup_of,
        similarity_score= sim_score,
        status          = "open",
        draft_reply     = draft_reply,
    )
    db.add(complaint)
    db.flush()   # get complaint.id before audit insert

    # Audit
    _write_audit(db, complaint.id, "system", "created", None, {
        "channel": channel_name,
        "severity": severity,
        "is_duplicate": is_dup,
        "duplicate_of": str(dup_of) if dup_of else None,
    })

    db.commit()
    db.refresh(complaint)
    return complaint


# ─────────────────────────────────────────────
# ASSIGNMENT & RESOLUTION
# ─────────────────────────────────────────────

def assign_complaint(db: Session, complaint_id: str, agent: str) -> Complaint:
    c = _get_or_raise(db, complaint_id)
    old_agent = c.assigned_agent
    c.assigned_agent = agent
    c.assigned_at    = datetime.now(timezone.utc)
    c.status         = "in_progress"
    _write_audit(db, c.id, agent, "assigned",
                 {"assigned_agent": old_agent},
                 {"assigned_agent": agent, "status": "in_progress"})
    db.commit()
    db.refresh(c)
    return c


def resolve_complaint(
    db:              Session,
    complaint_id:    str,
    agent:           str,
    resolution_note: str,
    *,
    add_to_kb:  bool           = True,
    csat:       Optional[float] = None,
) -> Complaint:
    c = _get_or_raise(db, complaint_id)
    now = datetime.now(timezone.utc)

    # Determine final SLA status
    sla_status = "breached" if (c.sla_deadline and now > c.sla_deadline) else "resolved"

    c.status          = "resolved"
    c.resolved_at     = now
    c.resolution_note = resolution_note
    c.sla_status      = sla_status

    _write_audit(db, c.id, agent, "resolved", None, {
        "resolution_note": resolution_note,
        "sla_status": sla_status,
    })

    # Add to knowledge base
    if add_to_kb and c.embedding is not None:
        kb_entry = ResolutionKnowledge(
            category        = c.category or "General",
            sub_category    = c.sub_category,
            title           = c.subject or "Resolved Complaint",
            problem_desc    = c.body,
            resolution_text = resolution_note,
            embedding       = c.embedding,       # reuse same vector
            avg_csat        = csat,
        )
        db.add(kb_entry)

    db.commit()
    db.refresh(c)
    return c


def approve_draft(db: Session, complaint_id: str, agent: str) -> Complaint:
    c = _get_or_raise(db, complaint_id)
    c.draft_approved = True
    _write_audit(db, c.id, agent, "draft_approved", None, {"draft_approved": True})
    db.commit()
    db.refresh(c)
    return c


# ─────────────────────────────────────────────
# SLA MONITORING
# ─────────────────────────────────────────────

def get_sla_alerts(db: Session) -> dict:
    """
    Returns complaints grouped by SLA threshold breached.
    Used by Celery Beat to trigger Slack/SendGrid alerts.
    """
    now = datetime.now(timezone.utc)
    open_q = (
        db.query(Complaint)
        .filter(Complaint.status.notin_(["resolved", "closed"]))
        .filter(Complaint.sla_deadline.isnot(None))
        .all()
    )

    alerts = {"pct_50": [], "pct_80": [], "pct_95": [], "breached": []}
    for c in open_q:
        total_secs   = (c.sla_deadline - c.created_at).total_seconds()
        elapsed_secs = (now - c.created_at).total_seconds()
        pct          = (elapsed_secs / total_secs * 100) if total_secs > 0 else 0

        if now > c.sla_deadline:
            alerts["breached"].append(c)
        elif pct >= 95:
            alerts["pct_95"].append(c)
        elif pct >= 80:
            alerts["pct_80"].append(c)
        elif pct >= 50:
            alerts["pct_50"].append(c)

    return alerts


def update_sla_statuses(db: Session) -> None:
    """Bulk update SLA statuses. Called by Celery Beat alongside priority refresh."""
    now = datetime.now(timezone.utc)
    breached = (
        db.query(Complaint)
        .filter(Complaint.sla_deadline < now)
        .filter(Complaint.sla_status == "on_track")
        .filter(Complaint.status.notin_(["resolved", "closed"]))
        .all()
    )
    for c in breached:
        c.sla_status = "breached"
    db.commit()


# ─────────────────────────────────────────────
# PRIORITY QUEUE
# ─────────────────────────────────────────────

def get_priority_queue(db: Session, limit: int = 50) -> list[Complaint]:
    return (
        db.query(Complaint)
        .filter(Complaint.status.in_(["open", "in_progress"]))
        .filter(Complaint.is_duplicate == False)
        .order_by(Complaint.priority_score.desc())
        .limit(limit)
        .all()
    )


# ─────────────────────────────────────────────
# RBI AUDIT EXPORT
# ─────────────────────────────────────────────

def export_audit_trail(db: Session, complaint_id: str) -> list[dict]:
    logs = (
        db.query(ComplaintAudit)
        .filter(ComplaintAudit.complaint_id == uuid.UUID(complaint_id))
        .order_by(ComplaintAudit.ts.asc())
        .all()
    )
    return [
        {
            "id":           row.id,
            "actor":        row.actor,
            "action":       row.action,
            "old_value":    row.old_value,
            "new_value":    row.new_value,
            "ts":           row.ts.isoformat(),
        }
        for row in logs
    ]


# ─────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────

def _get_or_raise(db: Session, complaint_id: str) -> Complaint:
    c = db.query(Complaint).filter(Complaint.id == uuid.UUID(complaint_id)).first()
    if not c:
        raise ValueError(f"Complaint {complaint_id} not found")
    return c


def _write_audit(
    db:           Session,
    complaint_id: uuid.UUID,
    actor:        str,
    action:       str,
    old_value:    Optional[dict],
    new_value:    Optional[dict],
) -> None:
    entry = ComplaintAudit(
        complaint_id = complaint_id,
        actor        = actor,
        action       = action,
        old_value    = old_value,
        new_value    = new_value,
    )
    db.add(entry)

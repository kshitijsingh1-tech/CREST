"""
CREST — Complaint Models
SQLAlchemy ORM model + Pydantic schemas for API validation.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, SmallInteger, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from backend.utils.db import Base
from backend.utils.runtime import USE_PGVECTOR

if USE_PGVECTOR:
    from pgvector.sqlalchemy import Vector

    EMBEDDING_TYPE = Vector(1536)
else:
    EMBEDDING_TYPE = JSONB


# ─────────────────────────────────────────────
# SQLAlchemy ORM
# ─────────────────────────────────────────────

class Channel(Base):
    __tablename__ = "channels"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(50), nullable=False, unique=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    complaints = relationship("Complaint", back_populates="channel")


class Complaint(Base):
    __tablename__ = "complaints"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id      = Column(Integer, ForeignKey("channels.id"))
    external_ref    = Column(String(255))
    customer_id     = Column(String(100), nullable=False)
    customer_name   = Column(String(255))

    subject         = Column(Text)
    body            = Column(Text, nullable=False)
    language        = Column(String(10), default="en")

    # Complaint DNA — 1536-dim vector
    embedding       = Column(EMBEDDING_TYPE)

    # AI classification
    category        = Column(String(100))
    sub_category    = Column(String(100))
    severity        = Column(SmallInteger)          # 0=P0 critical … 4=P4 info
    anger_score     = Column(Numeric(4, 3))
    sentiment       = Column(String(20))
    named_entities  = Column(JSONB, default=dict)

    # Emotion-decay priority
    priority_score  = Column(Numeric(8, 4), default=0)
    priority_rank   = Column(Integer)

    # SLA
    sla_deadline    = Column(DateTime(timezone=True))
    sla_status      = Column(String(20), default="on_track")
    sla_breach_fine = Column(Numeric(10, 2))

    # Deduplication
    duplicate_of    = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=True)
    is_duplicate    = Column(Boolean, default=False)
    similarity_score = Column(Numeric(5, 4))

    # Lifecycle
    status          = Column(String(20), default="open")
    assigned_agent  = Column(String(100))
    assigned_at     = Column(DateTime(timezone=True))
    resolved_at     = Column(DateTime(timezone=True))
    resolution_note = Column(Text)
    draft_reply     = Column(Text)
    draft_approved  = Column(Boolean, default=False)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    channel    = relationship("Channel", back_populates="complaints")
    audit_logs = relationship("ComplaintAudit", back_populates="complaint")


class ComplaintAudit(Base):
    __tablename__ = "complaint_audit"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False)
    actor        = Column(String(100), nullable=False)
    action       = Column(String(100), nullable=False)
    old_value    = Column(JSONB)
    new_value    = Column(JSONB)
    ts           = Column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="audit_logs")


# ─────────────────────────────────────────────
# Pydantic Schemas (API layer)
# ─────────────────────────────────────────────

class ComplaintIngest(BaseModel):
    """Payload received from channel integrations."""
    channel:       str
    customer_id:   str
    body:          str
    subject:       Optional[str]      = None
    customer_name: Optional[str]      = None
    external_ref:  Optional[str]      = None
    language:      str                = "en"
    sla_hours:     int                = 720        # 30-day Union Bank default


class ComplaintOut(BaseModel):
    """Public-facing complaint response."""
    id:             uuid.UUID
    channel:        str
    customer_id:    str
    subject:        Optional[str]
    category:       Optional[str]
    sub_category:   Optional[str]
    severity:       Optional[int]
    anger_score:    Optional[float]
    sentiment:      Optional[str]
    priority_score: Optional[float]
    sla_deadline:   Optional[datetime]
    sla_status:     str
    status:         str
    assigned_agent: Optional[str]
    is_duplicate:   bool
    duplicate_of:   Optional[uuid.UUID]
    created_at:     datetime

    class Config:
        from_attributes = True


class ResolveRequest(BaseModel):
    agent:           str
    resolution_note: str
    add_to_kb:       bool  = True
    csat:            Optional[float] = Field(None, ge=1, le=5)


class AssignRequest(BaseModel):
    agent: str

"""
CREST — Resolution Knowledge Base Model
Stores past resolutions for RAG retrieval.
"""

import uuid
from typing import Optional

from pgvector.sqlalchemy import Vector
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from backend.utils.db import Base


class ResolutionKnowledge(Base):
    __tablename__ = "resolution_knowledge"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category         = Column(String(100), nullable=False)
    sub_category     = Column(String(100))
    title            = Column(Text, nullable=False)
    problem_desc     = Column(Text, nullable=False)
    resolution_text  = Column(Text, nullable=False)
    embedding        = Column(Vector(1536))          # embedded from problem_desc
    success_count    = Column(Integer, default=1)
    avg_csat         = Column(Numeric(3, 2))
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now())


class SpikeSignal(Base):
    __tablename__ = "spike_signals"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    signal_type         = Column(String(100), nullable=False)
    description         = Column(Text)
    expected_impact     = Column(String(20))
    predicted_surge_pct = Column(Numeric(5, 2))
    signal_ts           = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at          = Column(DateTime(timezone=True), server_default=func.now())


# ── Pydantic ────────────────────────────────────────────────

class KnowledgeOut(BaseModel):
    id:              uuid.UUID
    category:        str
    sub_category:    Optional[str]
    title:           str
    problem_desc:    str
    resolution_text: str
    success_count:   int
    avg_csat:        Optional[float]
    relevance:       Optional[float] = None    # populated by RAG retrieval

    class Config:
        from_attributes = True


class SpikeSignalIn(BaseModel):
    signal_type:         str
    description:         str
    affected_categories: list[str]
    predicted_surge_pct: float
    expected_impact:     str = "medium"

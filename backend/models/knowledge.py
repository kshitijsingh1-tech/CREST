"""
CREST knowledge base models.

Stores both resolved-complaint examples and document chunks extracted from
reference PDFs for RAG retrieval.
"""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, DateTime, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from backend.utils.db import Base
from backend.utils.runtime import USE_PGVECTOR

if USE_PGVECTOR:
    from pgvector.sqlalchemy import Vector

    EMBEDDING_TYPE = Vector(768)
else:
    EMBEDDING_TYPE = JSONB


class ResolutionKnowledge(Base):
    __tablename__ = "resolution_knowledge"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100), nullable=False)
    sub_category = Column(String(100))
    title = Column(Text, nullable=False)
    problem_desc = Column(Text, nullable=False)
    resolution_text = Column(Text, nullable=False)
    embedding = Column(EMBEDDING_TYPE)
    success_count = Column(Integer, default=1)
    avg_csat = Column(Numeric(3, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


_rag_table_args = [
    UniqueConstraint("source_path", "chunk_index", name="uq_rag_document_chunk"),
    Index("idx_rag_document_source", "source_path", "chunk_index"),
]
if USE_PGVECTOR:
    _rag_table_args.append(
        Index(
            "idx_rag_document_chunks_embedding",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_with={"lists": 50},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        )
    )


class RagDocumentChunk(Base):
    __tablename__ = "rag_document_chunks"
    __table_args__ = tuple(_rag_table_args)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_path = Column(String(512), nullable=False)
    source_name = Column(String(255), nullable=False)
    document_title = Column(Text, nullable=False)
    document_type = Column(String(50), nullable=False, default="reference")
    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(JSONB, default=dict)
    embedding = Column(EMBEDDING_TYPE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class SpikeSignal(Base):
    __tablename__ = "spike_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signal_type = Column(String(100), nullable=False)
    description = Column(Text)
    expected_impact = Column(String(20))
    predicted_surge_pct = Column(Numeric(10, 2))
    signal_ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgeOut(BaseModel):
    id: uuid.UUID
    category: str
    sub_category: Optional[str]
    title: str
    problem_desc: str
    resolution_text: str
    success_count: int
    avg_csat: Optional[float]
    relevance: Optional[float] = None

    class Config:
        from_attributes = True


class RagDocumentChunkOut(BaseModel):
    id: uuid.UUID
    source_path: str
    source_name: str
    document_title: str
    document_type: str
    page_number: int
    chunk_index: int
    content: str
    chunk_metadata: dict = Field(default_factory=dict)
    relevance: Optional[float] = None

    class Config:
        from_attributes = True


class SpikeSignalIn(BaseModel):
    signal_type: str
    description: str
    affected_categories: list[str]
    predicted_surge_pct: float
    expected_impact: str = "medium"

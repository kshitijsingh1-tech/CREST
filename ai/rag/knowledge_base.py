"""
PDF-backed RAG knowledge base helpers.

This module extracts text from PDFs under the local rag dataset, chunks the
content, embeds each chunk, stores the results in PostgreSQL/pgvector, and
supports vector search for retrieval.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from pypdf import PdfReader
from sqlalchemy.orm import Session

from ai.embeddings.embedder import embed, embed_batch, get_embedding_mode
from backend.models.knowledge import RagDocumentChunk
from backend.utils.db import SessionLocal, raw_conn, serialize_embedding
from backend.utils.logger import get_logger
from backend.utils.runtime import REPO_ROOT, USE_PGVECTOR

logger = get_logger("crest.rag.knowledge")

DEFAULT_DATASET_DIR = Path(os.getenv("CREST_RAG_DATASET_DIR", "ragdataset"))
DEFAULT_CHUNK_SIZE = max(200, int(os.getenv("CREST_RAG_CHUNK_SIZE", "1200")))
DEFAULT_CHUNK_OVERLAP = max(0, int(os.getenv("CREST_RAG_CHUNK_OVERLAP", "200")))
DEFAULT_TOP_K = 4
DEFAULT_MIN_RELEVANCE = 0.45
_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "have",
    "your",
    "bank",
    "union",
    "customer",
    "customers",
    "into",
    "their",
    "there",
    "using",
    "about",
    "when",
    "where",
    "what",
    "how",
}


@dataclass(slots=True)
class ExtractedPage:
    page_number: int
    text: str


@dataclass(slots=True)
class ChunkPayload:
    source_path: str
    source_name: str
    document_title: str
    document_type: str
    page_number: int
    chunk_index: int
    content: str
    chunk_metadata: dict[str, Any] = field(default_factory=dict)
    embedding: list[float] | None = None


def resolve_dataset_dir(dataset_dir: str | Path | None = None) -> Path:
    path = Path(dataset_dir) if dataset_dir else DEFAULT_DATASET_DIR
    if not path.is_absolute():
        path = REPO_ROOT / path
    return path.resolve()


def normalize_text(text: str) -> str:
    cleaned = (text or "").replace("\x00", " ").replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\s*\n\s*", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def infer_document_type(pdf_path: Path) -> str:
    name = pdf_path.stem.lower()
    if "keyboard" in name or "screen_reader" in name or "screen-reader" in name:
        return "accessibility"
    if "procedure" in name or "guide" in name:
        return "procedure"
    if "faq" in name or "dataset" in name:
        return "faq"
    if "policy" in name or "grievance" in name or "compensation" in name:
        return "policy"
    return "reference"


def _relative_source_path(pdf_path: Path) -> str:
    try:
        return pdf_path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return pdf_path.resolve().as_posix()


def _derive_document_title(pdf_path: Path, pages: list[ExtractedPage]) -> str:
    default_title = pdf_path.stem.replace("_", " ").replace("-", " ").strip().title()
    if pages:
        for line in pages[0].text.splitlines():
            candidate = line.strip(" -:._")
            lower = candidate.lower()
            if not candidate:
                continue
            if lower.startswith("page ") or lower.startswith("table of contents"):
                continue
            if lower.startswith("annexure") or lower.startswith("classification"):
                continue
            if candidate.endswith(" of") or candidate.endswith(" and") or candidate.endswith(" with"):
                continue
            if 8 <= len(candidate) <= 180 and any(
                keyword in lower
                for keyword in (
                    "policy",
                    "procedure",
                    "manual",
                    "guide",
                    "faq",
                    "dataset",
                    "grievance",
                    "portal",
                    "banking",
                    "customer rights",
                )
            ):
                return candidate
    return default_title


def iter_pdf_paths(dataset_dir: str | Path | None = None) -> list[Path]:
    resolved = resolve_dataset_dir(dataset_dir)
    if not resolved.exists():
        raise FileNotFoundError(f"RAG dataset directory not found: {resolved}")
    return sorted(path for path in resolved.glob("*.pdf") if path.is_file())


def extract_pdf_pages(pdf_path: str | Path) -> list[ExtractedPage]:
    path = Path(pdf_path)
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        reader.decrypt("")

    pages: list[ExtractedPage] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = normalize_text(page.extract_text() or "")
        if text:
            pages.append(ExtractedPage(page_number=page_number, text=text))

    logger.info(
        "Extracted PDF text",
        extra={"source_name": path.name, "page_count": len(pages)},
    )
    return pages


def split_text_into_chunks(
    text: str,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    normalized = normalize_text(text)
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    total_length = len(normalized)

    while start < total_length:
        max_end = min(total_length, start + chunk_size)
        end = max_end

        if max_end < total_length:
            candidate_end = max(
                normalized.rfind("\n\n", start, max_end),
                normalized.rfind(". ", start, max_end),
                normalized.rfind("; ", start, max_end),
                normalized.rfind(" ", start, max_end),
            )
            if candidate_end > start + (chunk_size // 2):
                end = candidate_end
                if normalized[candidate_end:candidate_end + 2] in {". ", "; "}:
                    end += 1

        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= total_length:
            break

        next_start = max(0, end - chunk_overlap)
        if next_start <= start:
            next_start = end
        start = next_start

    return chunks


def build_pdf_chunks(
    pdf_path: str | Path,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[ChunkPayload]:
    path = Path(pdf_path)
    pages = extract_pdf_pages(path)
    if not pages:
        return []

    title = _derive_document_title(path, pages)
    document_type = infer_document_type(path)
    source_path = _relative_source_path(path)

    chunks: list[ChunkPayload] = []
    chunk_index = 0
    for page in pages:
        page_chunks = split_text_into_chunks(
            page.text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        for content in page_chunks:
            chunks.append(
                ChunkPayload(
                    source_path=source_path,
                    source_name=path.name,
                    document_title=title,
                    document_type=document_type,
                    page_number=page.page_number,
                    chunk_index=chunk_index,
                    content=content,
                    chunk_metadata={
                        "page_number": page.page_number,
                        "source_path": source_path,
                        "source_name": path.name,
                        "document_type": document_type,
                    },
                )
            )
            chunk_index += 1

    return chunks


def _serialize_chunk(chunk: ChunkPayload) -> RagDocumentChunk:
    if chunk.embedding is None:
        raise ValueError(f"Chunk {chunk.source_name}#{chunk.chunk_index} is missing an embedding")

    return RagDocumentChunk(
        source_path=chunk.source_path,
        source_name=chunk.source_name,
        document_title=chunk.document_title,
        document_type=chunk.document_type,
        page_number=chunk.page_number,
        chunk_index=chunk.chunk_index,
        content=chunk.content,
        chunk_metadata=chunk.chunk_metadata,
        embedding=serialize_embedding(chunk.embedding),
        is_active=True,
    )


def ingest_rag_dataset(
    dataset_dir: str | Path | None = None,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    persist: bool = True,
    purge_existing: bool = False,
    db: Session | None = None,
) -> dict[str, Any]:
    pdf_paths = iter_pdf_paths(dataset_dir)
    all_chunks: list[ChunkPayload] = []
    document_summaries: list[dict[str, Any]] = []

    for pdf_path in pdf_paths:
        document_chunks = build_pdf_chunks(
            pdf_path,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        all_chunks.extend(document_chunks)
        document_summaries.append(
            {
                "source_name": pdf_path.name,
                "document_title": document_chunks[0].document_title if document_chunks else pdf_path.stem,
                "document_type": infer_document_type(pdf_path),
                "chunk_count": len(document_chunks),
                "page_count": len({chunk.page_number for chunk in document_chunks}),
            }
        )

    if all_chunks:
        batch_size = 50  # Smaller batches to avoid memory/timeout issues with local SBERT
        total_chunks = len(all_chunks)
        print(f"Embedding {total_chunks} chunks in batches of {batch_size}...")
        
        for start in range(0, total_chunks, batch_size):
            end = min(start + batch_size, total_chunks)
            batch_contents = [chunk.content for chunk in all_chunks[start:end]]
            batch_embeddings = embed_batch(batch_contents)
            
            for i, embedding in enumerate(batch_embeddings):
                all_chunks[start + i].embedding = embedding
            
            print(f"  - Progress: {end}/{total_chunks} chunks embedded.")

    persisted_chunk_count = 0
    if persist and all_chunks:
        owns_session = db is None
        session = db or SessionLocal()
        try:
            if purge_existing:
                session.query(RagDocumentChunk).delete(synchronize_session=False)
            else:
                for source_path in sorted({chunk.source_path for chunk in all_chunks}):
                    session.query(RagDocumentChunk).filter(
                        RagDocumentChunk.source_path == source_path
                    ).delete(synchronize_session=False)

            session.add_all([_serialize_chunk(chunk) for chunk in all_chunks])
            session.commit()
            persisted_chunk_count = len(all_chunks)
        except Exception:
            session.rollback()
            raise
        finally:
            if owns_session:
                session.close()

    return {
        "dataset_dir": str(resolve_dataset_dir(dataset_dir)),
        "document_count": len(document_summaries),
        "chunk_count": len(all_chunks),
        "persisted_chunk_count": persisted_chunk_count,
        "persisted": persist,
        "documents": document_summaries,
    }


def _cosine_similarity(left: list[float] | np.ndarray, right: list[float] | np.ndarray) -> float:
    left_array = np.array(left, dtype=np.float32)
    right_array = np.array(right, dtype=np.float32)
    denominator = float(np.linalg.norm(left_array) * np.linalg.norm(right_array))
    if denominator == 0:
        return 0.0
    return float(np.dot(left_array, right_array) / denominator)


def _tokenize(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (text or "").lower())
        if len(token) > 2 and token not in _STOPWORDS
    }


def _keyword_score(query: str, title: str, content: str) -> float:
    query_tokens = _tokenize(query)
    if not query_tokens:
        return 0.0

    title_tokens = _tokenize(title)
    content_tokens = _tokenize(content)
    title_hits = len(query_tokens & title_tokens)
    content_hits = len(query_tokens & content_tokens)
    if title_hits == 0 and content_hits == 0:
        return 0.0

    weighted_hits = (title_hits * 2) + content_hits
    return min(1.0, weighted_hits / (len(query_tokens) * 2))


def _search_document_chunks_pgvector(
    embedding: list[float],
    *,
    top_k: int,
    min_relevance: float,
    document_type: str | None,
) -> list[dict[str, Any]]:
    serialized_embedding = serialize_embedding(embedding)
    type_filter = "AND document_type = %s" if document_type else ""
    params: list[Any] = [serialized_embedding, serialized_embedding]
    if document_type:
        params.append(document_type)
    params.extend([min_relevance, top_k])

    with raw_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT  id,
                        source_path,
                        source_name,
                        document_title,
                        document_type,
                        page_number,
                        chunk_index,
                        content,
                        chunk_metadata,
                        1 - (embedding <=> %s::vector) AS relevance
                FROM    rag_document_chunks
                WHERE   is_active = TRUE
                  {type_filter}
                  AND   1 - (embedding <=> %s::vector) > %s
                ORDER   BY relevance DESC
                LIMIT   %s
                """,
                params,
            )
            rows = [dict(row) for row in cur.fetchall()]
            for row in rows:
                if "id" in row:
                    row["id"] = str(row["id"])
            return rows


def _search_document_chunks_python(
    embedding: list[float],
    *,
    top_k: int,
    min_relevance: float,
    document_type: str | None,
) -> list[dict[str, Any]]:
    db = SessionLocal()
    try:
        query = db.query(RagDocumentChunk).filter(RagDocumentChunk.is_active == True)
        if document_type:
            query = query.filter(RagDocumentChunk.document_type == document_type)

        ranked: list[dict[str, Any]] = []
        for chunk in query.all():
            if not chunk.embedding:
                continue
            relevance = _cosine_similarity(embedding, chunk.embedding)
            if relevance < min_relevance:
                continue
            ranked.append(
                {
                    "id": str(chunk.id),
                    "source_path": chunk.source_path,
                    "source_name": chunk.source_name,
                    "document_title": chunk.document_title,
                    "document_type": chunk.document_type,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "chunk_metadata": chunk.chunk_metadata or {},
                    "relevance": relevance,
                }
            )

        ranked.sort(key=lambda item: item["relevance"], reverse=True)
        return ranked[:top_k]
    finally:
        db.close()


def _search_document_chunks_keyword(
    query: str,
    *,
    top_k: int,
    document_type: str | None,
) -> list[dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(RagDocumentChunk).filter(RagDocumentChunk.is_active == True)
        if document_type:
            rows = rows.filter(RagDocumentChunk.document_type == document_type)

        ranked: list[dict[str, Any]] = []
        for chunk in rows.all():
            relevance = _keyword_score(query, chunk.document_title, chunk.content)
            if relevance <= 0:
                continue
            ranked.append(
                {
                    "id": chunk.id,
                    "source_path": chunk.source_path,
                    "source_name": chunk.source_name,
                    "document_title": chunk.document_title,
                    "document_type": chunk.document_type,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "chunk_metadata": chunk.chunk_metadata or {},
                    "relevance": relevance,
                }
            )

        ranked.sort(key=lambda item: item["relevance"], reverse=True)
        return ranked[:top_k]
    finally:
        db.close()


def search_document_chunks(
    *,
    query: str | None = None,
    embedding: list[float] | None = None,
    top_k: int = DEFAULT_TOP_K,
    min_relevance: float = DEFAULT_MIN_RELEVANCE,
    document_type: str | None = None,
) -> list[dict[str, Any]]:
    mode = get_embedding_mode()
    if embedding is None:
        if not query:
            raise ValueError("Either query or embedding is required for document search")
        embedding = embed(query)

    if mode == "mock":
        if not query:
            logger.info("Mock embedding mode detected without query text; skipping document retrieval")
            return []
        logger.info("Mock embedding mode detected, using keyword document retrieval")
        return _search_document_chunks_keyword(
            query,
            top_k=top_k,
            document_type=document_type,
        )

    results: list[dict[str, Any]] = []
    if USE_PGVECTOR:
        try:
            results = _search_document_chunks_pgvector(
                embedding,
                top_k=top_k,
                min_relevance=min_relevance,
                document_type=document_type,
            )
        except Exception as exc:
            logger.warning(
                "pgvector document search failed, falling back to Python cosine search",
                extra={"error": str(exc)},
            )
    else:
        results = _search_document_chunks_python(
            embedding,
            top_k=top_k,
            min_relevance=min_relevance,
            document_type=document_type,
        )

    if results:
        return results
    if query:
        logger.info("Document vector search returned no matches, using keyword fallback")
        return _search_document_chunks_keyword(
            query,
            top_k=top_k,
            document_type=document_type,
        )

    return []

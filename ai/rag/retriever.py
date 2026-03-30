"""
CREST RAG retriever and draft reply generator.

Retrieves similar past resolutions plus PDF knowledge chunks from the local
RAG dataset, then asks Groq to generate a grounded draft reply.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

import numpy as np

from ai.embeddings.embedder import get_embedding_mode
from ai.providers.groq import create_chat_completion, get_model, has_api_key
from ai.rag.knowledge_base import search_document_chunks
from backend.models.knowledge import ResolutionKnowledge
from backend.utils.db import SessionLocal, raw_conn, serialize_embedding
from backend.utils.logger import get_logger
from backend.utils.runtime import USE_PGVECTOR

logger = get_logger("crest.rag")

TOP_K = 3
DOCUMENT_TOP_K = 4
MIN_RELEVANCE = 0.60
DOCUMENT_MIN_RELEVANCE = 0.45
KEYWORD_MIN_RELEVANCE = 0.20
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

DRAFT_SYSTEM = """You are a senior Union Bank of India grievance resolution officer.
Write a professional, empathetic, and specific draft reply to the customer complaint.

Source priority:
1. If retrieved internal case history or policy/procedure excerpts are provided,
   use them as the primary grounding context.
2. If the retrieved context is partial, you may supplement it with your own
   general banking and customer-support knowledge, but do not contradict the
   retrieved context.
3. If no retrieved context is available, reply from your own general knowledge.

Guidelines:
- Address the customer by name if provided, otherwise use "Dear Customer"
- Acknowledge the specific issue clearly and mention important amounts, dates,
  or transaction IDs when present
- When retrieved context is available, include at least 2 concrete details from
  it, such as steps, URLs, portal fields, channels, or policy actions
- Do not return a generic acknowledgment-only reply when the retrieved context
  contains actionable details
- Do not invent exact bank-specific policy clauses, internal process names, or
  timelines unless they are in the retrieved context or you are confident they
  are broadly standard; otherwise say the bank team will verify and update
- Keep the tone professional and warm, never defensive
- End with a case-reference or grievance-follow-up instruction
- Length: 3-4 short paragraphs

Return only the draft reply text, with no markdown.
"""


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


def _retrieve_resolutions_python(
    embedding: list[float],
    *,
    category: Optional[str],
    top_k: int,
    min_relevance: float,
) -> list[dict[str, Any]]:
    db = SessionLocal()
    try:
        query = db.query(ResolutionKnowledge).filter(ResolutionKnowledge.is_active == True)
        if category:
            query = query.filter(ResolutionKnowledge.category == category)

        ranked: list[dict[str, Any]] = []
        for row in query.all():
            if not row.embedding:
                continue
            relevance = _cosine_similarity(embedding, row.embedding)
            if relevance < min_relevance:
                continue
            ranked.append(
                {
                    "id": str(row.id),
                    "category": row.category,
                    "sub_category": row.sub_category,
                    "title": row.title,
                    "problem_desc": row.problem_desc,
                    "resolution_text": row.resolution_text,
                    "success_count": row.success_count,
                    "avg_csat": row.avg_csat,
                    "relevance": relevance,
                }
            )

        ranked.sort(key=lambda item: item["relevance"], reverse=True)
        return ranked[:top_k]
    finally:
        db.close()


def _retrieve_resolutions_keyword(
    query: str,
    *,
    category: Optional[str],
    top_k: int,
) -> list[dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(ResolutionKnowledge).filter(ResolutionKnowledge.is_active == True)
        if category:
            rows = rows.filter(ResolutionKnowledge.category == category)

        ranked: list[dict[str, Any]] = []
        for row in rows.all():
            relevance = _keyword_score(
                query,
                row.title or "",
                " ".join(
                    part.strip()
                    for part in (
                        row.problem_desc or "",
                        row.resolution_text or "",
                    )
                    if part
                ),
            )
            if relevance < KEYWORD_MIN_RELEVANCE:
                continue
            ranked.append(
                {
                    "id": str(row.id),
                    "category": row.category,
                    "sub_category": row.sub_category,
                    "title": row.title,
                    "problem_desc": row.problem_desc,
                    "resolution_text": row.resolution_text,
                    "success_count": row.success_count,
                    "avg_csat": row.avg_csat,
                    "relevance": relevance,
                }
            )

        ranked.sort(key=lambda item: item["relevance"], reverse=True)
        return ranked[:top_k]
    finally:
        db.close()


def retrieve_resolutions(
    embedding: list[float],
    category: Optional[str] = None,
    top_k: int = TOP_K,
    query: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Query resolution_knowledge by vector similarity.

    Returns top_k results above the minimum relevance threshold.
    """
    mode = get_embedding_mode()
    if mode == "mock":
        if not query:
            logger.info("Mock embedding mode detected without complaint text; skipping resolution retrieval")
            return []
        logger.info("Mock embedding mode detected, using keyword resolution retrieval")
        return _retrieve_resolutions_keyword(
            query,
            category=category,
            top_k=top_k,
        )

    if not embedding:
        return []

    if USE_PGVECTOR:
        serialized_embedding = serialize_embedding(embedding)
        category_filter = "AND category = %s" if category else ""
        params: list[Any] = [serialized_embedding, serialized_embedding]
        if category:
            params.append(category)
        params.extend([MIN_RELEVANCE, top_k])

        try:
            with raw_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT  id,
                                category,
                                sub_category,
                                title,
                                problem_desc,
                                resolution_text,
                                success_count,
                                avg_csat,
                                1 - (embedding <=> %s::vector) AS relevance
                        FROM    resolution_knowledge
                        WHERE   is_active = TRUE
                          {category_filter}
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
        except Exception as exc:
            logger.warning(
                "pgvector resolution search failed, falling back to Python cosine search",
                extra={"error": str(exc)},
            )

    return _retrieve_resolutions_python(
        embedding,
        category=category,
        top_k=top_k,
        min_relevance=MIN_RELEVANCE,
    )


def _build_resolution_context(resolutions: list[dict[str, Any]]) -> str:
    if not resolutions:
        return "No similar past resolutions were available."

    context_parts: list[str] = []
    for index, resolution in enumerate(resolutions, start=1):
        context_parts.append(
            "\n".join(
                [
                    f"Past Resolution {index}",
                    f"Title: {resolution['title']}",
                    f"Category: {resolution['category']}",
                    f"Sub-category: {resolution.get('sub_category') or 'N/A'}",
                    f"Relevance: {resolution['relevance']:.3f}",
                    f"Problem: {resolution['problem_desc']}",
                    f"Resolution: {resolution['resolution_text']}",
                ]
            )
        )
    return "\n\n---\n\n".join(context_parts)


def _build_document_context(document_chunks: list[dict[str, Any]]) -> str:
    if not document_chunks:
        return "No relevant bank policy or procedure excerpts were available."

    context_parts: list[str] = []
    for index, chunk in enumerate(document_chunks, start=1):
        context_parts.append(
            "\n".join(
                [
                    f"Reference Document {index}",
                    f"Title: {chunk['document_title']}",
                    f"Source: {chunk['source_name']}",
                    f"Type: {chunk['document_type']}",
                    f"Page: {chunk['page_number']}",
                    f"Relevance: {chunk['relevance']:.3f}",
                    f"Excerpt: {chunk['content']}",
                ]
            )
        )
    return "\n\n---\n\n".join(context_parts)


def _extract_useful_lines(text: str, limit: int = 4) -> list[str]:
    lines: list[str] = []
    for raw_line in (text or "").splitlines():
        line = " ".join(raw_line.strip().split())
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("page ") or lower.startswith("classification:"):
            continue
        if len(line) < 12:
            continue
        if line not in lines:
            lines.append(line)
        if len(lines) >= limit:
            break
    return lines


def _build_contextual_fallback(
    *,
    category: str,
    entities: dict,
    customer_name: Optional[str],
    complaint_body: str,
    resolutions: list[dict[str, Any]],
    document_chunks: list[dict[str, Any]],
) -> str:
    name = customer_name or "Customer"
    subject = category.lower() if category and category != "General" else "the issue raised"
    amounts = entities.get("amounts", [])
    txn_ids = entities.get("txn_ids", [])
    amount_str = f" involving Rs. {amounts[0]}" if amounts else ""
    txn_str = f" (reference: {txn_ids[0]})" if txn_ids else ""

    guidance_points: list[str] = []
    seen_points: set[str] = set()

    for chunk in document_chunks[:2]:
        for line in _extract_useful_lines(chunk.get("content", ""), limit=3):
            if line not in seen_points:
                guidance_points.append(line)
                seen_points.add(line)
            if len(guidance_points) >= 4:
                break
        if len(guidance_points) >= 4:
            break

    resolution_hint = ""
    if resolutions:
        top_resolution = (resolutions[0].get("resolution_text") or "").strip()
        if top_resolution:
            resolution_hint = (
                "A similar earlier resolution suggests the following next step: "
                f"{top_resolution}"
            )

    guidance_text = ""
    if guidance_points:
        guidance_text = "Based on the available bank procedure/reference documents:\n- " + "\n- ".join(guidance_points)
    else:
        guidance_text = (
            "Our team will review the complaint details, verify the applicable process, and update you with the next steps."
        )

    return (
        f"Dear {name},\n\n"
        f"We acknowledge your complaint regarding {subject}{amount_str}{txn_str}. "
        "Thank you for bringing this to our attention.\n\n"
        f"{guidance_text}\n\n"
        f"{resolution_hint + chr(10) + chr(10) if resolution_hint else ''}"
        "If you have supporting screenshots, account details, or transaction references, please share them so that we can assist you faster. "
        "Please quote your case reference in future communication."
    )


def _build_context_payload(
    resolutions: list[dict[str, Any]],
    document_chunks: list[dict[str, Any]],
) -> tuple[str, bool]:
    has_context = bool(resolutions or document_chunks)
    if not has_context:
        return (
            "No retrieved internal context was found for this complaint. "
            "Use your own general banking and customer-support knowledge.",
            False,
        )

    return (
        "\n\n".join(
            [
                "Past Resolutions (internal case history):",
                _build_resolution_context(resolutions),
                "Reference Documents (bank policy and procedure excerpts):",
                _build_document_context(document_chunks),
            ]
        ),
        True,
    )


def generate_draft_reply(
    complaint_body: str,
    complaint_subject: Optional[str],
    named_entities: dict,
    category: str,
    embedding: list[float],
    customer_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Full RAG pipeline:
    1. Retrieve similar past resolutions
    2. Retrieve relevant PDF policy/procedure chunks
    3. Build grounded context
    4. Call Groq to generate a draft reply
    
    Returns:
        dict: {"draft": str, "sources": {"documents": list, "resolutions": list}}
    """
    try:
        resolutions = retrieve_resolutions(
            embedding,
            category=category,
            query=complaint_body,
        )
    except Exception as exc:
        logger.warning(
            "Resolution retrieval failed, continuing without past-resolution context",
            extra={"error": str(exc)},
        )
        resolutions = []

    try:
        document_chunks = search_document_chunks(
            query=complaint_body,
            embedding=embedding,
            top_k=DOCUMENT_TOP_K,
            min_relevance=DOCUMENT_MIN_RELEVANCE,
        )
    except Exception as exc:
        logger.warning(
            "Document retrieval failed, continuing without policy/procedure context",
            extra={"error": str(exc)},
        )
        document_chunks = []

    logger.info(
        "RAG context retrieved",
        extra={
            "category": category,
            "resolution_count": len(resolutions),
            "document_chunk_count": len(document_chunks),
        },
    )

    context, has_context = _build_context_payload(resolutions, document_chunks)

    entities_str = json.dumps(named_entities, indent=2) if named_entities else "None extracted"
    user_prompt = f"""Retrieved Context Available: {"yes" if has_context else "no"}

Retrieved Context:
{context}

---

New Complaint to Draft Reply For:
Customer Name: {customer_name or 'Unknown'}
Subject: {complaint_subject or 'No subject'}
Category: {category or 'Unknown'}
Extracted Entities: {entities_str}

Complaint Body:
{complaint_body}
"""

    if not has_api_key():
        logger.info("No configured chat API key found, using template draft fallback")
        draft = _template_fallback(
            category,
            named_entities,
            customer_name,
            complaint_body=complaint_body,
            resolutions=resolutions,
            document_chunks=document_chunks,
        )
        return {
            "draft": draft,
            "sources": {
                "documents": document_chunks,
                "resolutions": resolutions
            }
        }

    try:
        draft = create_chat_completion(
            model=get_model("GROQ_DRAFT_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": DRAFT_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=1024,
            temperature=0.2,
        )
        logger.info("Draft reply generated via Groq")
        return {
            "draft": draft,
            "sources": {
                "documents": document_chunks,
                "resolutions": resolutions
            }
        }
    except Exception as exc:
        logger.error("Groq draft generation failed", extra={"error": str(exc)})
        draft = _template_fallback(
            category,
            named_entities,
            customer_name,
            complaint_body=complaint_body,
            resolutions=resolutions,
            document_chunks=document_chunks,
        )
        return {
            "draft": draft,
            "sources": {
                "documents": document_chunks,
                "resolutions": resolutions
            }
        }


def _template_fallback(
    category: str,
    entities: dict,
    customer_name: Optional[str],
    complaint_body: str = "",
    resolutions: Optional[list[dict[str, Any]]] = None,
    document_chunks: Optional[list[dict[str, Any]]] = None,
) -> str:
    """Rule-based draft when Groq is unavailable."""
    resolutions = resolutions or []
    document_chunks = document_chunks or []
    if resolutions or document_chunks:
        return _build_contextual_fallback(
            category=category,
            entities=entities,
            customer_name=customer_name,
            complaint_body=complaint_body,
            resolutions=resolutions,
            document_chunks=document_chunks,
        )

    name = customer_name or "Customer"
    amounts = entities.get("amounts", [])
    txn_ids = entities.get("txn_ids", [])
    amount_str = f"of Rs. {amounts[0]}" if amounts else ""
    txn_str = f" (Reference: {txn_ids[0]})" if txn_ids else ""

    templates = {
        "UPI": (
            f"Dear {name},\n\n"
            f"We acknowledge your complaint regarding your UPI transaction {amount_str}{txn_str}. "
            "We are investigating this with NPCI and will update you within 3 working days. "
            "If eligible, a reversal will be initiated as per RBI TAT guidelines (T+5 days).\n\n"
            "Thank you for banking with Union Bank."
        ),
        "Card": (
            f"Dear {name},\n\n"
            f"We have received your complaint regarding an unauthorized transaction {amount_str} on your card. "
            "Your card has been blocked as a precautionary measure. A chargeback has been initiated with the "
            "card network. You will receive an update within 10 working days.\n\n"
            "Thank you for banking with Union Bank."
        ),
        "ATM": (
            f"Dear {name},\n\n"
            f"We acknowledge your ATM cash not dispensed complaint {amount_str}. "
            "We are reviewing the ATM journal logs. If confirmed, the amount will be credited to your account "
            "within T+5 working days as per RBI mandate.\n\n"
            "Thank you for banking with Union Bank."
        ),
        "KYC": (
            f"Dear {name},\n\n"
            "We have received your KYC-related complaint. Our branch team is reviewing your submitted documents. "
            "We will update you within 2 working days. For urgent matters, please visit your home branch with "
            "original documents.\n\n"
            "Thank you for banking with Union Bank."
        ),
    }

    return templates.get(
        category,
        (
            f"Dear {name},\n\n"
            "Thank you for contacting Union Bank. We have registered your complaint and our team will review it "
            "within the stipulated SLA. You will receive an update shortly.\n\n"
            "Thank you for banking with Union Bank."
        ),
    )

"""
CREST — RAG Retriever & Draft Reply Generator
Uses LlamaIndex to retrieve similar past resolutions from pgvector,
then passes them to Claude API to generate a context-aware draft reply.
"""

from __future__ import annotations

import os
import json
import numpy as np
from typing import Optional

from backend.utils.db import raw_conn
from backend.utils.logger import get_logger
from ai.embeddings.embedder import embed

logger = get_logger("crest.rag")

TOP_K        = 3
MIN_RELEVANCE = 0.60    # Minimum cosine similarity to include in context

DRAFT_SYSTEM = """You are a senior Union Bank of India grievance resolution officer.
Using the provided past resolutions as context, write a professional, empathetic,
and specific draft reply to the customer complaint.

Guidelines:
- Address the customer by name if provided, otherwise use "Dear Customer"
- Acknowledge the specific issue clearly (mention amounts, dates, transaction IDs if present)
- State the exact next steps the bank will take with realistic timelines
- Cite relevant RBI TAT (Turnaround Time) where applicable
- Keep tone professional but warm — never defensive
- End with a case reference instruction
- Length: 3-4 paragraphs

Return ONLY the draft reply text, no subject line, no markdown.
"""


def retrieve_resolutions(
    embedding: list[float],
    category:  Optional[str] = None,
    top_k:     int           = TOP_K,
) -> list[dict]:
    """
    Query resolution_knowledge by vector similarity.
    Returns top_k results above MIN_RELEVANCE threshold.

    Called by:
    - Celery worker after complaint is classified (pre-generates draft)
    - Agent dashboard API when agent opens a complaint
    """
    emb_array = np.array(embedding, dtype=np.float32)
    cat_filter = "AND category = %s" if category else ""
    params = [emb_array, emb_array]
    if category:
        params.append(category)
    params += [MIN_RELEVANCE, top_k]

    with raw_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT  id, category, sub_category, title,
                        problem_desc, resolution_text,
                        success_count, avg_csat,
                        1 - (embedding <=> %s::vector) AS relevance
                FROM    resolution_knowledge
                WHERE   is_active = TRUE
                  {cat_filter}
                  AND  1 - (embedding <=> %s::vector) > %s
                ORDER   BY relevance DESC
                LIMIT   %s
                """,
                params,
            )
            return [dict(r) for r in cur.fetchall()]


def generate_draft_reply(
    complaint_body:   str,
    complaint_subject: Optional[str],
    named_entities:   dict,
    category:         str,
    embedding:        list[float],
    customer_name:    Optional[str] = None,
) -> str:
    """
    Full RAG pipeline:
    1. Retrieve top-k similar past resolutions from pgvector
    2. Build context string
    3. Call Claude API to generate grounded draft reply

    Returns the draft reply string.
    If Claude API is unavailable, returns a template-based fallback.
    """
    # Step 1 — Retrieve
    resolutions = retrieve_resolutions(embedding, category=category)
    logger.info(f"RAG retrieved {len(resolutions)} resolutions for category={category}")

    if not resolutions:
        return _template_fallback(category, named_entities, customer_name)

    # Step 2 — Build context
    context_parts = []
    for i, r in enumerate(resolutions, 1):
        context_parts.append(
            f"Past Resolution {i} (Category: {r['category']} — {r.get('sub_category','')}, "
            f"CSAT: {r.get('avg_csat','N/A')}):\n"
            f"Problem: {r['problem_desc']}\n"
            f"Resolution: {r['resolution_text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    entities_str = json.dumps(named_entities, indent=2) if named_entities else "None extracted"

    user_prompt = f"""Past Resolutions (context):
{context}

---

New Complaint to Draft Reply For:
Customer Name: {customer_name or 'Unknown'}
Subject: {complaint_subject or 'No subject'}
Extracted Entities: {entities_str}

Complaint Body:
{complaint_body}
"""

    # Step 3 — Claude generates draft
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=DRAFT_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )
        draft = response.content[0].text.strip()
        logger.info("Draft reply generated via Claude API")
        return draft

    except Exception as e:
        logger.error(f"Claude API draft generation failed: {e}")
        return _template_fallback(category, named_entities, customer_name)


def _template_fallback(
    category: str,
    entities: dict,
    customer_name: Optional[str],
) -> str:
    """Rule-based draft when Claude API is unavailable."""
    name = customer_name or "Customer"
    amounts = entities.get("amounts", [])
    txn_ids = entities.get("txn_ids", [])
    amount_str = f"of Rs. {amounts[0]}" if amounts else ""
    txn_str    = f" (Reference: {txn_ids[0]})" if txn_ids else ""

    templates = {
        "UPI":      f"Dear {name},\n\nWe acknowledge your complaint regarding your UPI transaction {amount_str}{txn_str}. We are investigating this with NPCI and will update you within 3 working days. If eligible, a reversal will be initiated as per RBI TAT guidelines (T+5 days).\n\nThank you for banking with Union Bank.",
        "Card":     f"Dear {name},\n\nWe have received your complaint regarding an unauthorized transaction {amount_str} on your card. Your card has been blocked as a precautionary measure. A chargeback has been initiated with the card network. You will receive an update within 10 working days.\n\nThank you for banking with Union Bank.",
        "ATM":      f"Dear {name},\n\nWe acknowledge your ATM cash not dispensed complaint {amount_str}. We are reviewing the ATM journal logs. If confirmed, the amount will be credited to your account within T+5 working days as per RBI mandate.\n\nThank you for banking with Union Bank.",
        "KYC":      f"Dear {name},\n\nWe have received your KYC-related complaint. Our branch team is reviewing your submitted documents. We will update you within 2 working days. For urgent matters, please visit your home branch with original documents.\n\nThank you for banking with Union Bank.",
    }
    return templates.get(
        category,
        f"Dear {name},\n\nThank you for contacting Union Bank. We have registered your complaint and our team will review it within the stipulated SLA. You will receive an update shortly.\n\nThank you for banking with Union Bank."
    )

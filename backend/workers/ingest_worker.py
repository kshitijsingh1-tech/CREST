"""
CREST — Ingest Worker
Celery task: runs the full AI Engine pipeline for each normalised complaint.
  1. Classify with Claude API (LangChain agent)
  2. Extract entities with spaCy NER
  3. Generate 1536-dim embedding
  4. Dedup check via pgvector cosine similarity
  5. Persist to PostgreSQL
  6. Pre-generate RAG draft reply
  7. Write audit log
"""

from __future__ import annotations

import json
from typing import Optional

from backend.workers.celery_app import app
from backend.utils.db import SessionLocal
from backend.utils.logger import get_logger
from ai.agents.classifier_agent import classify
from ai.ner.extractor import extract
from ai.embeddings.embedder import embed
from ai.rag.retriever import generate_draft_reply
from backend.services.complaint_service import ingest_complaint

logger = get_logger("crest.workers.ingest")


@app.task(
    name="backend.workers.ingest_worker.process_complaint",
    bind=True,
    max_retries=3,
    default_retry_delay=30,    # seconds between retries
    autoretry_for=(Exception,),
)
def process_complaint(self, payload: dict) -> dict:
    """
    Full AI Engine pipeline for a single normalised complaint payload.

    payload keys:
        channel, customer_id, body, subject (opt), customer_name (opt),
        external_ref (opt), language, sla_hours

    Called by:
        - Kafka consumer (integrations/kafka/consumer.py)
        - Direct FastAPI ingest endpoint for testing
    """
    logger.info(f"Processing complaint from channel={payload.get('channel')}")

    try:
        # ── Step 1: Classify ────────────────────────────────
        classification = classify(payload["body"])
        logger.info(
            f"Classified: cat={classification.category} "
            f"severity=P{classification.severity} anger={classification.anger_score:.2f}"
        )

        # ── Step 2: NER ─────────────────────────────────────
        entities = extract(payload["body"])
        entities_dict = entities.to_dict()
        logger.info(f"NER extracted: {list(entities_dict.keys())}")

        # ── Step 3: Embed ───────────────────────────────────
        embedding = embed(payload["body"])
        logger.info("Embedding generated (1536-dim)")

        # ── Step 4+5+7: Dedup + Persist + Audit ─────────────
        db = SessionLocal()
        try:
            complaint = ingest_complaint(
                db            = db,
                channel_name  = payload["channel"],
                customer_id   = payload["customer_id"],
                body          = payload["body"],
                embedding     = embedding,
                subject       = payload.get("subject"),
                customer_name = payload.get("customer_name"),
                external_ref  = payload.get("external_ref"),
                language      = payload.get("language", "en"),
                sla_hours     = payload.get("sla_hours", 720),
                severity      = classification.severity,
                anger_score   = classification.anger_score,
                sentiment     = classification.sentiment,
                category      = classification.category,
                sub_category  = classification.sub_category,
                named_entities= entities_dict,
            )
            complaint_id = str(complaint.id)
            logger.info(f"Complaint persisted: id={complaint_id} is_dup={complaint.is_duplicate}")

            # ── Step 6: Pre-generate draft reply ────────────
            # Skip for duplicates (parent complaint already has a draft)
            if not complaint.is_duplicate:
                draft = generate_draft_reply(
                    complaint_body    = payload["body"],
                    complaint_subject = payload.get("subject"),
                    named_entities    = entities_dict,
                    category          = classification.category,
                    embedding         = embedding,
                    customer_name     = payload.get("customer_name"),
                )
                complaint.draft_reply = draft
                db.commit()
                logger.info("Draft reply generated and saved")

        finally:
            db.close()

        return {
            "status":        "success",
            "complaint_id":  complaint_id,
            "category":      classification.category,
            "severity":      classification.severity,
            "is_duplicate":  complaint.is_duplicate,
        }

    except Exception as exc:
        logger.error(f"Ingest worker failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)

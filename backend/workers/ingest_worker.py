"""
CREST - Ingest Worker
Celery task: runs the full AI Engine pipeline for each normalised complaint.
  1. Classify with Groq
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
from asgiref.sync import async_to_sync
from backend.services.translation_service import translator

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
        body = payload["body"]
        subject = payload.get("subject") or ""
        language = payload.get("language", "en")

        # Bidirectional Pivot-Translation for regional Indian languages in the background worker
        if language and language.strip().lower() != "en":
            body_for_ai = async_to_sync(translator.translate)(body, source_lang=language, target_lang="en")
            subject_for_ai = async_to_sync(translator.translate)(subject, source_lang=language, target_lang="en")
        else:
            # Auto-detect language for intake channels (Email, SMS, default Web calls)
            body_for_ai, detected_lang = async_to_sync(translator.detect_and_translate)(body, target_lang="en")
            if detected_lang != "en":
                language = detected_lang
                subject_for_ai = async_to_sync(translator.translate)(subject, source_lang=language, target_lang="en")
            else:
                subject_for_ai = subject

        # ── Step 1: Classify ────────────────────────────────
        classification = classify(body_for_ai)
        logger.info(
            f"Classified: cat={classification.category} "
            f"severity=P{classification.severity} anger={classification.anger_score:.2f}"
        )

        # ── Step 2: NER ─────────────────────────────────────
        entities = extract(body_for_ai)
        entities_dict = entities.to_dict()
        logger.info(f"NER extracted: {list(entities_dict.keys())}")

        # ── Step 3: Embed ───────────────────────────────────
        embedding = embed(body_for_ai)
        logger.info("Embedding generated")

        # ── Step 4+5+7: Dedup + Persist + Audit ─────────────
        db = SessionLocal()
        try:
            complaint = ingest_complaint(
                db            = db,
                channel_name  = payload["channel"],
                customer_id   = payload["customer_id"],
                body          = body,  # Keep the original typed regional text for compliance record
                embedding     = embedding,
                subject       = subject,
                customer_name = payload.get("customer_name"),
                external_ref  = payload.get("external_ref"),
                language      = language,
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
                rag_result = generate_draft_reply(
                    complaint_body    = body_for_ai,
                    complaint_subject = subject_for_ai,
                    named_entities    = entities_dict,
                    category          = classification.category,
                    embedding         = embedding,
                    customer_name     = payload.get("customer_name"),
                )
                
                # Back-translate generated response to customer's input language
                draft_reply = rag_result["draft"]
                if language and language.strip().lower() != "en" and draft_reply:
                    draft_reply_final = async_to_sync(translator.translate)(draft_reply, source_lang="en", target_lang=language)
                else:
                    draft_reply_final = draft_reply

                complaint.draft_reply = draft_reply_final
                complaint.draft_metadata = rag_result["sources"]
                db.commit()
                logger.info("Draft reply and source metadata generated, back-translated, and saved")

            # Dispatch dynamic, polite region request auto-responses (EXCEPT for Twitter)
            channel = (payload.get("channel") or "app").lower().strip()
            recipient = payload.get("customer_id")
            
            if channel != "twitter" and recipient and recipient != "unknown":
                ref = payload.get("external_ref") or str(complaint.id)[:8]
                msg = (
                    f"Hello! 👋 We have received your complaint (Ticket Ref: {ref}). "
                    f"To help us route this to the nearest nodal branch and provide you with faster support, "
                    f"could you please reply with your city or region? Thank you! 🙏"
                )
                
                try:
                    if channel == "email" or "@" in recipient:
                        from integrations.email.sender import send_customer_reply
                        send_customer_reply(
                            recipient=recipient,
                            reply_body=msg,
                            subject=f"Re: [Ticket Ref: {ref}] {complaint.subject or 'Complaint Registration'}",
                            in_reply_to=payload.get("external_ref")
                        )
                        logger.info(f"Polite region request email sent to {recipient}")
                    elif channel == "whatsapp":
                        from integrations.whatsapp.sender import send_whatsapp_reply
                        send_whatsapp_reply(
                            recipient_phone=recipient,
                            reply_body=msg,
                            external_ref=payload.get("external_ref")
                        )
                        logger.info(f"Polite region request WhatsApp sent to {recipient}")
                    elif channel == "sms":
                        from integrations.sms.sender import send_sms_reply
                        send_sms_reply(
                            recipient_phone=recipient,
                            reply_body=msg,
                            external_ref=payload.get("external_ref")
                        )
                        logger.info(f"Polite region request SMS sent to {recipient}")
                except Exception as auto_err:
                    logger.error(f"Failed to dispatch polite region request for channel {channel}: {auto_err}")

            # ── Step 8: Trigger WebSocket Broadcast ────────────
            try:
                import requests
                requests.post(
                    "http://127.0.0.1:8000/api/complaints/internal/broadcast",
                    json={
                        "complaint_id": complaint_id,
                        "severity": classification.severity,
                        "category": classification.category
                    },
                    timeout=2
                )
                logger.info("Sent webhook broadcast to Uvicorn successfully")
            except Exception as e:
                logger.warning(f"Failed to send webhook broadcast API ping: {e}")

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

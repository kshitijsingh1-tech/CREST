"""
CREST — Kafka Producer
Shared publisher used by all channel integrations to push events
onto the appropriate Kafka topic.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional

from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.kafka.producer")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

_producer = None


def _get_producer():
    global _producer
    if _producer is None:
        from confluent_kafka import Producer
        _producer = Producer({
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "acks":              "all",        # wait for all replicas
            "retries":           5,
            "retry.backoff.ms":  200,
        })
    return _producer


def _delivery_report(err, msg):
    if err:
        logger.error(f"Kafka delivery failed: {err}")
    else:
        logger.debug(f"Delivered to {msg.topic()} [{msg.partition()}]")


def publish(
    channel:       str,
    customer_id:   str,
    body:          str,
    *,
    subject:       Optional[str] = None,
    customer_name: Optional[str] = None,
    external_ref:  Optional[str] = None,
    language:      str           = "en",
    sla_hours:     int           = 720,
    metadata:      Optional[dict] = None,
) -> None:
    """
    Publish a complaint event to the channel's Kafka topic.

    Called by:
    - integrations/whatsapp/webhook.py  → topic: crest.channel.whatsapp
    - integrations/twitter/stream.py    → topic: crest.channel.twitter
    - integrations/email/listener.py    → topic: crest.channel.email
    - integrations/branch app           → topic: crest.channel.branch
    """
    topic = f"crest.channel.{channel}"
    payload = {
        "customer_id":   customer_id,
        "body":          body,
        "subject":       subject,
        "customer_name": customer_name,
        "external_ref":  external_ref,
        "language":      language,
        "sla_hours":     sla_hours,
        "ingested_at":   datetime.now(timezone.utc).isoformat(),
        **(metadata or {}),
    }
    producer = _get_producer()
    producer.produce(
        topic,
        key=customer_id.encode("utf-8"),
        value=json.dumps(payload).encode("utf-8"),
        callback=_delivery_report,
    )
    producer.poll(0)   # trigger delivery callbacks without blocking
    logger.info(f"Published to {topic} | customer={customer_id}")

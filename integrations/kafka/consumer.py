"""
CREST — Kafka Consumer
Reads from all six channel topics and dispatches each event
to the Celery ingest_worker as an async task.

Topics:
  crest.channel.email | crest.channel.whatsapp | crest.channel.app
  crest.channel.twitter | crest.channel.voice | crest.channel.branch
"""

from __future__ import annotations

import json
import os
import signal
import sys
from typing import Optional

from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.kafka")

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_GROUP_ID  = os.getenv("KAFKA_GROUP_ID", "crest-ingest-group")

CHANNEL_TOPICS = [
    "crest.channel.email",
    "crest.channel.whatsapp",
    "crest.channel.app",
    "crest.channel.twitter",
    "crest.channel.voice",
    "crest.channel.branch",
]

# Map topic → channel name used by the ingest service
TOPIC_TO_CHANNEL = {
    "crest.channel.email":     "email",
    "crest.channel.whatsapp":  "whatsapp",
    "crest.channel.app":       "app",
    "crest.channel.twitter":   "twitter",
    "crest.channel.voice":     "voice",
    "crest.channel.branch":    "branch",
}


def _validate_payload(data: dict, channel: str) -> Optional[dict]:
    """
    Ensure required fields are present.
    Returns normalised payload dict or None if invalid.
    """
    required = ["customer_id", "body"]
    for field in required:
        if not data.get(field):
            logger.warning(f"Dropping message from {channel}: missing field '{field}'")
            return None

    return {
        "channel":       channel,
        "customer_id":   str(data["customer_id"]),
        "body":          str(data["body"]).strip(),
        "subject":       data.get("subject"),
        "customer_name": data.get("customer_name"),
        "external_ref":  data.get("external_ref") or data.get("message_id"),
        "language":      data.get("language", "en"),
        "sla_hours":     int(data.get("sla_hours", 720)),
    }


def run_consumer():
    """
    Start the Kafka consumer loop.
    Blocks indefinitely — run as a separate process/pod.

    Graceful shutdown on SIGINT / SIGTERM.
    """
    try:
        from confluent_kafka import Consumer, KafkaError, KafkaException
    except ImportError:
        logger.error("confluent-kafka not installed. Run: pip install confluent-kafka")
        sys.exit(1)

    from backend.workers.ingest_worker import process_complaint

    consumer = Consumer({
        "bootstrap.servers":        KAFKA_BOOTSTRAP,
        "group.id":                 KAFKA_GROUP_ID,
        "auto.offset.reset":        "earliest",
        "enable.auto.commit":       False,   # manual commit after Celery dispatch
        "max.poll.interval.ms":     300_000,
        "session.timeout.ms":       30_000,
    })
    consumer.subscribe(CHANNEL_TOPICS)
    logger.info(f"Kafka consumer started. Topics: {CHANNEL_TOPICS}")

    # Graceful shutdown
    running = True
    def _shutdown(sig, frame):
        nonlocal running
        logger.info(f"Received signal {sig}, shutting down consumer")
        running = False
    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    processed = 0
    try:
        while running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                raise KafkaException(msg.error())

            topic   = msg.topic()
            channel = TOPIC_TO_CHANNEL.get(topic, "unknown")

            try:
                raw  = json.loads(msg.value().decode("utf-8"))
                payload = _validate_payload(raw, channel)

                if payload:
                    # Dispatch to Celery — non-blocking, returns AsyncResult
                    process_complaint.delay(payload)
                    logger.info(
                        f"Dispatched to Celery | channel={channel} "
                        f"customer={payload['customer_id']}"
                    )
                    processed += 1

                consumer.commit(message=msg)   # commit only after dispatch

            except json.JSONDecodeError as e:
                logger.error(f"Bad JSON from {topic}: {e}")
                consumer.commit(message=msg)   # skip malformed messages

    finally:
        consumer.close()
        logger.info(f"Kafka consumer shut down. Total dispatched: {processed}")


if __name__ == "__main__":
    run_consumer()

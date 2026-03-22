"""
CREST — Celery Application
Task queue for async complaint processing + scheduled jobs.
"""

import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "crest",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "backend.workers.ingest_worker",
        "backend.workers.priority_worker",
        "backend.workers.sla_worker",
    ],
)

app.conf.update(
    task_serializer        = "json",
    accept_content         = ["json"],
    result_serializer      = "json",
    timezone               = "Asia/Kolkata",
    enable_utc             = True,
    task_acks_late         = True,          # re-queue on worker crash
    worker_prefetch_multiplier = 1,         # one task at a time per worker
    task_routes = {
        "backend.workers.ingest_worker.*":   {"queue": "ingest"},
        "backend.workers.priority_worker.*": {"queue": "scheduler"},
        "backend.workers.sla_worker.*":      {"queue": "scheduler"},
    },
)

# ── Celery Beat — Scheduled Jobs ────────────────────────────
app.conf.beat_schedule = {
    # Recalculate Emotion-Decay priority scores every 5 minutes
    "refresh-priority-scores": {
        "task":     "backend.workers.priority_worker.refresh_priorities",
        "schedule": 300,   # 300 seconds = 5 minutes
    },
    # Check SLA statuses and fire alerts every 10 minutes
    "check-sla-alerts": {
        "task":     "backend.workers.sla_worker.check_and_alert",
        "schedule": 600,   # 10 minutes
    },
    # Mark breached SLA statuses every 30 minutes
    "update-sla-statuses": {
        "task":     "backend.workers.sla_worker.update_statuses",
        "schedule": 1800,  # 30 minutes
    },
}

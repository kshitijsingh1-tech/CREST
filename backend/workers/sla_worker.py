"""
CREST — SLA Monitor Worker
Celery Beat task: checks SLA thresholds and fires Slack / SendGrid alerts.
Alert levels: 50% → warning, 80% → escalation, 95% → critical, 100% → breached.
"""

from __future__ import annotations

import os
import json
from datetime import datetime, timezone
from typing import Optional

from backend.workers.celery_app import app
from backend.utils.db import SessionLocal
from backend.utils.logger import get_logger
from backend.services.complaint_service import get_sla_alerts, update_sla_statuses
from backend.models.complaint import Complaint

logger = get_logger("crest.workers.sla")

SLACK_WEBHOOK   = os.getenv("SLACK_WEBHOOK_URL", "")
SENDGRID_KEY    = os.getenv("SENDGRID_API_KEY", "")
ALERT_EMAIL_TO  = os.getenv("SLA_ALERT_EMAIL", "grievance-head@unionbank.in")
ALERT_EMAIL_FROM= os.getenv("FROM_EMAIL", "crest-alerts@unionbank.in")


@app.task(name="backend.workers.sla_worker.check_and_alert")
def check_and_alert() -> dict:
    """
    Check SLA thresholds and fire alerts.
    Called every 10 minutes by Celery Beat.
    """
    db = SessionLocal()
    try:
        alerts = get_sla_alerts(db)
        summary = {}

        if alerts["breached"]:
            _send_slack(alerts["breached"], level="🚨 BREACHED")
            _send_email(alerts["breached"], level="BREACHED")
            summary["breached"] = len(alerts["breached"])

        if alerts["pct_95"]:
            _send_slack(alerts["pct_95"], level="🔴 95% SLA Elapsed")
            summary["pct_95"] = len(alerts["pct_95"])

        if alerts["pct_80"]:
            _send_slack(alerts["pct_80"], level="🟠 80% SLA Elapsed")
            summary["pct_80"] = len(alerts["pct_80"])

        if alerts["pct_50"]:
            _send_slack(alerts["pct_50"], level="🟡 50% SLA Elapsed")
            summary["pct_50"] = len(alerts["pct_50"])

        logger.info(f"SLA alert check complete: {summary}")
        return summary

    except Exception as e:
        logger.error(f"SLA alert check failed: {e}", exc_info=True)
        raise
    finally:
        db.close()


@app.task(name="backend.workers.sla_worker.update_statuses")
def update_statuses() -> dict:
    """Mark sla_status='breached' for all past-deadline complaints."""
    db = SessionLocal()
    try:
        update_sla_statuses(db)
        logger.info("SLA statuses updated")
        return {"status": "ok"}
    finally:
        db.close()


# ── Alert dispatchers ────────────────────────────────────────

def _send_slack(complaints: list[Complaint], level: str) -> None:
    if not SLACK_WEBHOOK:
        logger.debug("SLACK_WEBHOOK_URL not set, skipping Slack alert")
        return

    try:
        import httpx
        blocks = []
        for c in complaints[:5]:   # cap at 5 per message
            sla_deadline = c.sla_deadline.strftime("%d %b %Y %H:%M IST") if c.sla_deadline else "N/A"
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*{level}* | P{c.severity} | _{c.category}_\n"
                        f"Customer: `{c.customer_id}` | Agent: {c.assigned_agent or 'Unassigned'}\n"
                        f"SLA Deadline: {sla_deadline}\n"
                        f"Subject: {(c.subject or 'No subject')[:80]}"
                    )
                }
            })

        payload = {
            "text": f"*CREST SLA Alert — {level}* ({len(complaints)} complaint(s))",
            "blocks": blocks,
        }
        httpx.post(SLACK_WEBHOOK, json=payload, timeout=5)
        logger.info(f"Slack alert sent: {level} ({len(complaints)} complaints)")

    except Exception as e:
        logger.error(f"Slack alert failed: {e}")


def _send_email(complaints: list[Complaint], level: str) -> None:
    if not SENDGRID_KEY:
        logger.debug("SENDGRID_API_KEY not set, skipping email alert")
        return

    try:
        import httpx
        rows = "\n".join([
            f"- [{c.id}] P{c.severity} {c.category} | {c.customer_id} | Agent: {c.assigned_agent or 'None'}"
            for c in complaints
        ])
        payload = {
            "personalizations": [{"to": [{"email": ALERT_EMAIL_TO}]}],
            "from":    {"email": ALERT_EMAIL_FROM, "name": "CREST Alert System"},
            "subject": f"[CREST] SLA {level} — {len(complaints)} complaint(s) require immediate attention",
            "content": [{"type": "text/plain", "value": f"SLA {level}\n\n{rows}\n\nLog in to CREST dashboard to take action."}],
        }
        httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {SENDGRID_KEY}"},
            json=payload,
            timeout=5,
        )
        logger.info(f"Email alert sent: {level}")

    except Exception as e:
        logger.error(f"Email alert failed: {e}")

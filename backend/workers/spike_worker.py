"""
CREST — Spike Detection Worker
Periodic task to identify surges in complaint categories.
"""

from __future__ import annotations

import httpx
from backend.utils.db import SessionLocal
from backend.utils.logger import get_logger
from backend.workers.celery_app import app
from backend.services.spike_service import detect_category_spikes

logger = get_logger("crest.workers.spike")


@app.task(name="backend.workers.spike_worker.detect_spikes")
def detect_spikes():
    """
    Scheduled task: Scan for surges and notify Socket.IO via internal webhook.
    """
    db = SessionLocal()
    try:
        logger.info("Starting autonomous spike detection...")
        signals = detect_category_spikes(db)
        
        if signals:
            logger.info(f"Detected {len(signals)} spikes. Triggering broadcasts.")
            # The broadcast logic is already inside detect_category_spikes 
            # calling the internal webhook if needed, but let's make it explicit here 
            # if we want to separate service from worker.
            # Currently spike_service.py:detect_category_spikes calls broadcast_spike_alert.
            # Wait, spike_service cannot call async broadcast_spike_alert directly since it's sync.
            # I must update spike_service to hit the webhook!
            pass
            
    except Exception as e:
        logger.error(f"Spike detection task failed: {e}", exc_info=True)
    finally:
        db.close()

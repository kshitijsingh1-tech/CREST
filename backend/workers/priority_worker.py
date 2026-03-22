"""
CREST — Priority Refresh Worker
Celery Beat task: recalculates Emotion-Decay priority scores every 5 minutes.
"""

from backend.workers.celery_app import app
from backend.utils.db import SessionLocal
from backend.utils.logger import get_logger
from backend.services.complaint_service import refresh_all_priority_scores

logger = get_logger("crest.workers.priority")


@app.task(name="backend.workers.priority_worker.refresh_priorities")
def refresh_priorities() -> dict:
    """
    Recalculate priority_score for every open complaint.
    Called every 5 minutes by Celery Beat.

    The Emotion-Decay formula means:
    - Older angry tickets rise in priority automatically
    - Newly resolved tickets drop out of the queue
    - No manual re-sorting needed by agents
    """
    db = SessionLocal()
    try:
        count = refresh_all_priority_scores(db)
        logger.info(f"Priority refresh complete: {count} complaints updated")
        return {"updated": count}
    except Exception as e:
        logger.error(f"Priority refresh failed: {e}", exc_info=True)
        raise
    finally:
        db.close()

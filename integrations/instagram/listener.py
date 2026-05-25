"""
CREST — Instagram (Meta Graph API) Integration
Simulates a Webhook or Polling listener for Instagram Direct Messages (DMs)
and Comments, then publishes to the CREST Webhook API.
"""
import os
import time
import requests
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.instagram")

INSTAGRAM_PAGE_ID = os.getenv("INSTAGRAM_PAGE_ID", "crest_ub_official")
WEBHOOK_URL = os.getenv("CREST_DIRECT_INGEST_URL", "http://127.0.0.1:8000/api/integrations/instagram/webhook")
WEBHOOK_KEY = os.getenv("INSTAGRAM_WEBHOOK_KEY", "crest_instagram_demo_key_2026")

def poll_instagram_dms():
    """
    Simulates polling Meta Graph API for Instagram DMs.
    In production, Meta sends webhooks, but this polls for demo/local testing.
    """
    logger.info(f"Starting Instagram DM/Comment listener for {INSTAGRAM_PAGE_ID}...")
    
    # Mock loop for local testing
    while True:
        try:
            # In a real environment, you'd check a local queue or wait for Meta webhooks
            time.sleep(60)
        except KeyboardInterrupt:
            logger.info("Instagram listener stopped.")
            break
        except Exception as e:
            logger.error(f"Instagram listener error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    poll_instagram_dms()

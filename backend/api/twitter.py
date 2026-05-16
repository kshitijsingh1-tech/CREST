import os
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.api.complaints import ingest_complaint_logic

router = APIRouter(prefix="/api/integrations/twitter", tags=["integrations"])

# Production secret to verify Twitter CRC or webhooks
TWITTER_WEBHOOK_KEY = os.getenv("TWITTER_WEBHOOK_KEY", "crest_twitter_demo_key_2024")

class TweetPayload(BaseModel):
    username: str
    tweet_text: str
    tweet_id: str
    is_mention: bool = True

@router.post("/webhook")
async def twitter_webhook(
    payload: TweetPayload, 
    x_api_key: str = Header(None),
    db: Session = Depends(get_db_optional)
):
    """
    Simulated Twitter Webhook.
    Supports Kafka pipeline with local fallback for stability.
    """
    if x_api_key != TWITTER_WEBHOOK_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    complaint_data = {
        "channel": "twitter",
        "customer_id": f"@{payload.username}",
        "body": payload.tweet_text,
        "subject": f"Tweet from @{payload.username}",
        "external_ref": f"https://twitter.com/{payload.username}/status/{payload.tweet_id}"
    }

    # 1. Attempt Kafka Pipeline (The "Scale" Way)
    try:
        from integrations.kafka.producer import publish
        publish(**complaint_data)
        return {"status": "queued", "method": "kafka"}
    except Exception as k_err:
        # 2. Fallback to Direct Ingest (The "Safe" Way)
        try:
            result = await ingest_complaint_logic(complaint_data, db)
            return {"status": "accepted", "method": "direct", "complaint_id": result.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

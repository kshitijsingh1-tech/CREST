import os
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.api.complaints import ingest_complaint_logic

router = APIRouter(prefix="/api/integrations/instagram", tags=["integrations"])

# Production secret to verify Instagram webhooks
INSTAGRAM_WEBHOOK_KEY = os.getenv("INSTAGRAM_WEBHOOK_KEY", "crest_instagram_demo_key_2026")

class InstagramPayload(BaseModel):
    username: str
    message_text: str
    media_url: str | None = None
    is_dm: bool = True

@router.get("/webhook")
async def instagram_webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """
    Handles Meta Graph API GET verification challenge protocol.
    """
    if hub_mode == "subscribe" and hub_verify_token == INSTAGRAM_WEBHOOK_KEY:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=400, detail="Verification token mismatch")

@router.post("/webhook")
async def instagram_webhook(
    payload: InstagramPayload, 
    x_api_key: str = Header(None),
    db: Session = Depends(get_db_optional)
):
    """
    Simulated Instagram Webhook.
    Supports Meta Graph API webhook architecture with fallback for stability.
    """
    if x_api_key != INSTAGRAM_WEBHOOK_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    ref_type = "dm" if payload.is_dm else "comment"
    complaint_data = {
        "channel": "instagram",
        "customer_id": f"@{payload.username}",
        "body": payload.message_text + (f"\nMedia Attached: {payload.media_url}" if payload.media_url else ""),
        "subject": f"Instagram {ref_type.upper()} from @{payload.username}",
        "external_ref": f"https://instagram.com/direct/t/{payload.username}" if payload.is_dm else f"https://instagram.com/{payload.username}"
    }

    # 1. Attempt Kafka Pipeline
    try:
        from integrations.kafka.producer import publish
        publish(**complaint_data)
        return {"status": "queued", "method": "kafka"}
    except Exception as k_err:
        # 2. Fallback to Direct Ingest (Local database fallback)
        try:
            result = await ingest_complaint_logic(complaint_data, db)
            return {"status": "accepted", "method": "direct", "complaint_id": result.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

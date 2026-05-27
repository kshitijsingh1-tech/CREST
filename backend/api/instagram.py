import os
from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.api.complaints import ingest_complaint_logic
from backend.utils.logger import get_logger

router = APIRouter(prefix="/api/integrations/instagram", tags=["integrations"])
logger = get_logger("crest.api.instagram")

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
    request: Request,
    x_api_key: str = Header(None),
    db: Session = Depends(get_db_optional)
):
    """
    Instagram Webhook.
    Supports REAL Meta Graph API webhook architecture and simulated local payloads.
    """
    body = await request.json()

    # 1. Real Meta Graph API format (object: instagram or page + messaging[])
    meta_object = body.get("object")
    if meta_object in ("instagram", "page"):
        entries = body.get("entry", [])
        if not entries:
            return PlainTextResponse("EVENT_RECEIVED")

        ingested = 0
        for entry in entries:
            for event in entry.get("messaging", []):
                if "message" not in event:
                    continue
                msg = event["message"]
                if msg.get("is_echo") or msg.get("is_deleted"):
                    continue

                sender_id = event.get("sender", {}).get("id")
                if not sender_id:
                    continue

                text = (msg.get("text") or "").strip()
                if not text and msg.get("attachments"):
                    types = [a.get("type", "media") for a in msg["attachments"]]
                    text = f"[Instagram attachment: {', '.join(types)}]"

                if not text:
                    logger.info("Skipping Instagram webhook event with no text/attachments")
                    continue

                # Classify intent (COMPLAINT vs CONVERSATION)
                from ai.utils.intent import classify_message_intent, get_cresty_response
                intent = classify_message_intent(text)
                if intent == "CONVERSATION":
                    logger.info(f"Instagram message from {sender_id} classified as CONVERSATION: {text[:50]}...")
                    try:
                        from integrations.instagram.sender import send_instagram_dm
                        cresty_reply = get_cresty_response(text)
                        send_instagram_dm(customer_username=str(sender_id), reply_text=cresty_reply)
                    except Exception as send_err:
                        logger.error(f"Failed to send Cresty response to Instagram: {send_err}")
                    continue

                complaint_data = {
                    "channel": "instagram",
                    "customer_id": f"@{sender_id}",
                    "body": text,
                    "subject": f"Instagram DM from @{sender_id}",
                    "external_ref": msg.get("mid") or f"ig:{sender_id}",
                }
                try:
                    await ingest_complaint_logic(complaint_data, db)
                    ingested += 1
                except Exception as ingest_err:
                    logger.error(f"Instagram DM ingest failed for sender {sender_id}: {ingest_err}", exc_info=True)

        logger.info(f"Meta Instagram webhook processed | object={meta_object} ingested={ingested}")
        return PlainTextResponse("EVENT_RECEIVED")

    # 2. Simulated Instagram Webhook format (for testing)
    if x_api_key != INSTAGRAM_WEBHOOK_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    try:
        payload = InstagramPayload(**body)
    except Exception as e:
        raise HTTPException(status_code=422, detail="Invalid simulator payload")

    text = payload.message_text.strip()
    # Classify intent (COMPLAINT vs CONVERSATION)
    from ai.utils.intent import classify_message_intent, get_cresty_response
    intent = classify_message_intent(text)
    if intent == "CONVERSATION":
        logger.info(f"Simulated Instagram message from {payload.username} classified as CONVERSATION: {text[:50]}...")
        try:
            from integrations.instagram.sender import send_instagram_dm
            cresty_reply = get_cresty_response(text)
            send_instagram_dm(customer_username=payload.username, reply_text=cresty_reply)
            return {"status": "replied_via_cresty", "reply": cresty_reply}
        except Exception as send_err:
            logger.error(f"Failed to send Cresty response to Instagram: {send_err}")
            raise HTTPException(status_code=500, detail="Failed to send reply")
        
    ref_type = "dm" if payload.is_dm else "comment"
    complaint_data = {
        "channel": "instagram",
        "customer_id": f"@{payload.username}",
        "body": payload.message_text + (f"\nMedia Attached: {payload.media_url}" if payload.media_url else ""),
        "subject": f"Instagram {ref_type.upper()} from @{payload.username}",
        "external_ref": f"https://instagram.com/direct/t/{payload.username}" if payload.is_dm else f"https://instagram.com/{payload.username}"
    }

    # Attempt Kafka Pipeline
    try:
        from integrations.kafka.producer import publish
        publish(**complaint_data)
        return {"status": "queued", "method": "kafka"}
    except Exception as k_err:
        # Fallback to Direct Ingest
        try:
            result = await ingest_complaint_logic(complaint_data, db)
            return {"status": "accepted", "method": "direct", "complaint_id": result.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

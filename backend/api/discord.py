"""
CREST — Discord Webhook Integration
Receives incoming Discord Direct Messages and forwards them to CREST as complaints.

Endpoint: POST /api/integrations/discord/webhook
"""

import hmac
import hashlib
import os
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from backend.api.complaints import ingest_complaint_logic

router = APIRouter(prefix="/api/integrations/discord", tags=["integrations"])
logger = get_logger("crest.api.discord")

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY", "")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "mock_discord_token")


class DiscordUser(BaseModel):
    id: str
    username: str
    discriminator: str | None = None


class DiscordMessage(BaseModel):
    id: str
    channel_id: str
    author: DiscordUser
    content: str
    timestamp: str


class DiscordInteraction(BaseModel):
    type: int
    data: dict | None = None
    message: DiscordMessage | None = None
    token: str
    member: dict | None = None
    user: DiscordUser | None = None


def _verify_discord_signature(body: bytes, signature: str, timestamp: str) -> bool:
    """
    Verify Discord interaction signature using Ed25519.
    """
    if not DISCORD_PUBLIC_KEY or DISCORD_PUBLIC_KEY in ("your_discord_public_key_here", ""):
        logger.warning("DISCORD_PUBLIC_KEY not set or is placeholder; skipping signature verification")
        return True
    
    try:
        from nacl.signing import VerifyKey
        from nacl.exceptions import BadSignatureError
        
        message = timestamp.encode() + body
        verify_key = VerifyKey(bytes.fromhex(DISCORD_PUBLIC_KEY))
        
        try:
            verify_key.verify(message, bytes.fromhex(signature))
            return True
        except BadSignatureError:
            return False
    except Exception as e:
        logger.error(f"Discord signature verification failed: {e}")
        return False


@router.post("/webhook")
async def discord_webhook(
    request: Request,
    db: Session = Depends(get_db_optional)
):
    """
    Handles Discord interactions (slash commands, message components, DMs).
    Processes incoming DMs and routes them to CREST complaint ingestion.
    """
    body = await request.body()
    
    # Verify Discord signature or bot token (for internal forwarding)
    signature = request.headers.get("X-Signature-Ed25519", "")
    timestamp = request.headers.get("X-Signature-Timestamp", "")
    x_bot_token = request.headers.get("X-Discord-Bot-Token", "")
    
    is_internal = False
    if x_bot_token and DISCORD_BOT_TOKEN and x_bot_token == DISCORD_BOT_TOKEN:
        is_internal = True
        
    if not is_internal and not _verify_discord_signature(body, signature, timestamp):
        logger.warning("Discord signature validation failed")
        raise HTTPException(status_code=401, detail="Invalid Discord Signature")
    
    try:
        import json
        data = json.loads(body)
    except Exception as e:
        logger.error(f"Failed to parse Discord webhook body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    interaction_type = data.get("type")
    
    # Type 1: PING - respond with PONG for URL verification
    if interaction_type == 1:
        logger.info("Discord PING received, responding with PONG")
        return {"type": 1}
    
    # Type 2: APPLICATION_COMMAND or 3: MESSAGE_COMPONENT
    if interaction_type in (2, 3):
        logger.info(f"Discord interaction type {interaction_type} received")
        return {"type": 4, "data": {"content": "Processing your request..."}}
    
    # Type 0: Default interaction (e.g., message create events via gateway)
    # This handles actual DM messages
    if interaction_type == 0 or "message" in data:
        message = data.get("message")
        if not message:
            return {"status": "ignored"}
        
        # Extract user info
        author = message.get("author", {})
        if author.get("bot"):
            logger.info("Ignoring message from bot")
            return {"status": "ignored"}
        
        # Extract message content
        content = message.get("content", "").strip()
        if not content:
            logger.info("Ignoring empty message")
            return {"status": "ignored"}
        
        # Extract user info
        user_id = author.get("id", "unknown")
        username = author.get("username", "unknown")

        # Classify intent (COMPLAINT vs CONVERSATION)
        from ai.utils.intent import classify_message_intent, get_cresty_response
        intent = classify_message_intent(content)
        if intent == "CONVERSATION":
            logger.info(f"Discord message from {user_id} classified as CONVERSATION: {content[:50]}...")
            try:
                from integrations.discord.sender import send_discord_dm
                cresty_reply = get_cresty_response(content)
                send_discord_dm(recipient_user_id=str(user_id), reply_text=cresty_reply)
            except Exception as send_err:
                logger.error(f"Failed to send Cresty response to Discord: {send_err}")
            return {"status": "replied_via_cresty"}
        
        # Create complaint payload
        complaint_data = {
            "channel": "discord",
            "customer_id": user_id,
            "customer_name": username,
            "body": content,
            "subject": f"Discord DM from {username}",
            "external_ref": message.get("id", f"discord:{user_id}"),
        }
        
        try:
            await ingest_complaint_logic(complaint_data, db)
            logger.info(f"Discord DM ingested from user {username} ({user_id})")
            return {"status": "accepted"}
        except Exception as ingest_err:
            logger.error(f"Discord DM ingest failed for user {user_id}: {ingest_err}", exc_info=True)
            return {"status": "error", "detail": str(ingest_err)}
    
    logger.info(f"Unknown Discord interaction type: {interaction_type}")
    return {"status": "ignored"}


@router.post("/test")
async def discord_test_webhook(
    payload: dict,
    db: Session = Depends(get_db_optional)
):
    """
    Simulated Discord webhook for testing (requires x-api-key header with DISCORD_BOT_TOKEN).
    """
    # This is for local/test use without needing real Discord bot
    try:
        complaint_data = {
            "channel": "discord",
            "customer_id": payload.get("user_id", "test_user"),
            "customer_name": payload.get("username", "Test User"),
            "body": payload.get("message", "Test message"),
            "subject": payload.get("subject", "Discord Test Message"),
            "external_ref": payload.get("message_id", "test_discord_ref"),
        }
        await ingest_complaint_logic(complaint_data, db)
        return {"status": "accepted", "complaint_id": "test_complaint"}
    except Exception as e:
        logger.error(f"Test webhook failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

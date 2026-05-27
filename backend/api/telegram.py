"""
CREST — Telegram Integration (Webhook)
Receives incoming Telegram messages and ingests them as CREST complaints.

Endpoint: POST /api/integrations/telegram/webhook
Telegram will POST updates here after you set a webhook:
  https://api.telegram.org/bot<token>/setWebhook?url=<your_api>/api/integrations/telegram/webhook
"""

from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.api.complaints import ingest_complaint_logic
from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from integrations.telegram.sender import send_telegram_reply

router = APIRouter(prefix="/api/integrations/telegram", tags=["integrations"])
logger = get_logger("crest.api.telegram")

TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()


def _extract_message(update: dict) -> Optional[dict]:
    # Telegram sends one of these commonly: message | edited_message | channel_post | edited_channel_post
    for key in ("message", "edited_message", "channel_post", "edited_channel_post"):
        if isinstance(update.get(key), dict):
            return update[key]
    return None


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db_optional),
):
    # Optional verification: Telegram can send X-Telegram-Bot-Api-Secret-Token when configured.
    if TELEGRAM_WEBHOOK_SECRET:
        provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "").strip()
        if not provided or provided != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid Telegram secret token")

    update: dict[str, Any] = await request.json()
    msg = _extract_message(update)
    if not msg:
        return {"status": "ignored"}

    text = (msg.get("text") or "").strip()
    if not text:
        # Try caption for media messages
        text = (msg.get("caption") or "").strip()
    if not text:
        return {"status": "ignored"}

    # Filter out bot commands (e.g. /start)
    if text.startswith("/"):
        if text.startswith("/start"):
            chat = msg.get("chat") or {}
            chat_id = chat.get("id")
            if chat_id:
                welcome_msg_1 = (
                    "Welcome to the Union Bank of India CREST Nodal Grievance Support Bot! 🙏\n\n"
                    "Please describe your grievance or complaint in this chat. Our AI system will "
                    "instantly register and track it for you."
                )
                welcome_msg_2 = (
                    "To help us route your ticket to the correct nodal branch for faster resolution, "
                    "please also let us know your city or region."
                )
                try:
                    send_telegram_reply(chat_id=str(chat_id), reply_text=welcome_msg_1)
                    send_telegram_reply(chat_id=str(chat_id), reply_text=welcome_msg_2)
                except Exception as send_err:
                    logger.error(f"Failed to send Telegram welcome message: {send_err}")
        return {"status": "ignored"}

    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    chat_type = chat.get("type", "unknown")

    # Classify intent (COMPLAINT vs CONVERSATION)
    from ai.utils.intent import classify_message_intent, get_cresty_response
    intent = classify_message_intent(text)
    if intent == "CONVERSATION":
        logger.info(f"Telegram message from {chat_id} classified as CONVERSATION: {text[:50]}...")
        if chat_id:
            try:
                cresty_reply = get_cresty_response(text)
                send_telegram_reply(chat_id=str(chat_id), reply_text=cresty_reply)
            except Exception as send_err:
                logger.error(f"Failed to send Cresty response to Telegram: {send_err}")
        return {"status": "replied_via_cresty"}

    sender = msg.get("from") or {}
    sender_id = sender.get("id")
    username = sender.get("username")
    first_name = sender.get("first_name") or ""
    last_name = sender.get("last_name") or ""
    display_name = (f"{first_name} {last_name}".strip() or username or str(sender_id or chat_id or "unknown"))

    message_id = msg.get("message_id")

    # Keep customer_id stable. For private chats, sender_id is best. For groups/channels, use chat_id.
    customer_id = str(sender_id or chat_id or "unknown")

    complaint_data = {
        "channel": "telegram",
        "customer_id": customer_id,
        "customer_name": display_name,
        "body": text,
        "subject": f"Telegram ({chat_type}) from {display_name}",
        "external_ref": str(message_id or f"tg:{customer_id}"),
        "metadata": {
            "telegram_chat_id": chat_id,
            "telegram_chat_type": chat_type,
            "telegram_username": username,
        },
    }

    await ingest_complaint_logic(complaint_data, db)
    logger.info(f"Telegram message ingested | chat_id={chat_id} from={customer_id}")
    return {"status": "accepted"}


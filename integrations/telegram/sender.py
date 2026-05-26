"""
CREST — Outbound Telegram Integration
Send approved customer replies back to Telegram via Bot API.
"""

from __future__ import annotations

import os
import httpx

from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.telegram.sender")


def send_telegram_reply(chat_id: str, reply_text: str, *, external_ref: str | None = None) -> dict:
    """
    Send a message to a Telegram chat/user.

    chat_id: Telegram user id or chat id (numeric string)
    """
    chat_id = (chat_id or "").strip()
    if not chat_id:
        raise ValueError("No Telegram chat_id provided")

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

    # Visual logging for demos / audits
    print(f"\n--- [Outbound Telegram Bot API Gateway] ---")
    print(f"Chat ID: {chat_id}")
    print(f"Body: {reply_text}")
    print(f"External Ref: {external_ref}")
    print(f"------------------------------------------\n")

    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Running in simulated mode.")
        return {
            "status": "simulated",
            "chat_id": chat_id,
            "body": reply_text,
        }

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": reply_text,
        "disable_web_page_preview": True,
    }

    try:
        resp = httpx.post(url, json=payload, timeout=12.0)
        resp.raise_for_status()
        data = resp.json()
        message_id = (
            (data.get("result") or {}).get("message_id")
            if isinstance(data, dict)
            else None
        )
        return {
            "status": "sent",
            "chat_id": chat_id,
            "message_id": str(message_id) if message_id else None,
        }
    except Exception as exc:
        logger.error(f"Telegram sendMessage failed for chat_id={chat_id}: {exc}", exc_info=True)
        raise


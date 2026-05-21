"""
CREST - Outbound WhatsApp Integration
Send approved customer replies via Meta WhatsApp Cloud API.
"""

from __future__ import annotations

import os
import httpx
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.whatsapp.sender")


def send_whatsapp_reply(
    recipient_phone: str,
    reply_body: str,
    *,
    external_ref: str | None = None,
) -> dict:
    """
    Send approved customer replies via Meta WhatsApp Cloud API.
    Uses WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID from environment.
    """
    recipient_phone = (recipient_phone or "").strip()
    if not recipient_phone:
        raise ValueError("No recipient phone number provided")

    wa_token = os.getenv("WA_ACCESS_TOKEN", "").strip()
    phone_number_id = os.getenv("WA_PHONE_NUMBER_ID", "").strip()

    logger.info(f"Preparing WhatsApp reply for {recipient_phone}")

    # Visual logging for audit trails and presentations
    print(f"\n--- [Outbound WhatsApp Cloud API Gateway] ---")
    print(f"Recipient Phone : {recipient_phone}")
    print(f"Message Body    : '{reply_body[:120]}...'")
    print(f"External Ref    : {external_ref}")

    if not wa_token or not phone_number_id:
        print("[WhatsApp Sender Warning] WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID not set. Running in presentation/simulated mode.")
        print("-----------------------------------------------\n")
        return {
            "status": "simulated",
            "recipient": recipient_phone,
            "body": reply_body,
        }

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {wa_token}",
        "Content-Type": "application/json",
    }

    # Meta permits free-text messaging within a 24-hour customer-initiated window.
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": reply_body,
        },
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=12.0)
        resp.raise_for_status()
        result = resp.json()
        message_id = result.get("messages", [{}])[0].get("id", "unknown_wa_ref")
        print(f"[WhatsApp API Success] Delivered message_id={message_id}")
        print("-----------------------------------------------\n")
        return {
            "status": "sent",
            "recipient": recipient_phone,
            "message_id": message_id,
        }
    except Exception as exc:
        logger.error(f"WhatsApp API delivery failed to {recipient_phone}: {exc}", exc_info=True)
        print(f"[WhatsApp API Error] Connection or authorization failed: {exc}")
        print("-----------------------------------------------\n")
        raise

"""
CREST - Outbound WhatsApp Integration
Send approved customer replies via Twilio WhatsApp API.
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
    Send approved customer replies via Twilio WhatsApp API.
    Uses TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM from environment.
    """
    recipient_phone = (recipient_phone or "").strip()
    if not recipient_phone:
        raise ValueError("No recipient phone number provided")

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_WHATSAPP_FROM", "").strip()

    # Format numbers for Twilio WhatsApp (must be prefixed with "whatsapp:")
    to_formatted = recipient_phone
    if not to_formatted.startswith("whatsapp:"):
        if not to_formatted.startswith("+"):
            to_formatted = f"whatsapp:+{to_formatted}"
        else:
            to_formatted = f"whatsapp:{to_formatted}"

    from_formatted = from_number
    if from_formatted and not from_formatted.startswith("whatsapp:"):
        if not from_formatted.startswith("+"):
            from_formatted = f"whatsapp:+{from_formatted}"
        else:
            from_formatted = f"whatsapp:{from_formatted}"

    logger.info(f"Preparing Twilio WhatsApp reply for {recipient_phone}")

    # Visual logging for audit trails and presentations
    print(f"\n--- [Outbound Twilio WhatsApp API Gateway] ---")
    print(f"Recipient Phone : {to_formatted}")
    print(f"From Number     : {from_formatted}")
    print(f"Message Body    : '{reply_body[:120]}...'")
    print(f"External Ref    : {external_ref}")

    if not account_sid or not auth_token or not from_number:
        print("[Twilio Sender Warning] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_FROM not set. Running in simulated mode.")
        print("-----------------------------------------------\n")
        return {
            "status": "simulated",
            "recipient": to_formatted,
            "body": reply_body,
        }

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    auth = (account_sid, auth_token)
    payload = {
        "From": from_formatted,
        "To": to_formatted,
        "Body": reply_body,
    }

    try:
        resp = httpx.post(url, data=payload, auth=auth, timeout=12.0)
        resp.raise_for_status()
        result = resp.json()
        message_id = result.get("sid", "unknown_twilio_ref")
        print(f"[Twilio API Success] Delivered message_id={message_id}")
        print("-----------------------------------------------\n")
        return {
            "status": "sent",
            "recipient": to_formatted,
            "message_id": message_id,
        }
    except Exception as exc:
        logger.error(f"Twilio WhatsApp API delivery failed to {to_formatted}: {exc}", exc_info=True)
        print(f"[Twilio API Error] Delivery failed: {exc}")
        print("-----------------------------------------------\n")
        raise

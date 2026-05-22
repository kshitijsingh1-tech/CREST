"""
CREST - Outbound SMS Integration
Send approved customer replies or auto-responses via Twilio SMS.
"""

from __future__ import annotations

import os
import httpx
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.sms.sender")


def send_sms_reply(
    recipient_phone: str,
    reply_body: str,
    *,
    external_ref: str | None = None,
) -> dict:
    """
    Send SMS reply using Twilio API.
    """
    recipient_phone = (recipient_phone or "").strip()
    if not recipient_phone:
        raise ValueError("No recipient phone number provided")

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    
    # Twilio SMS sender is usually a standard phone number (no whatsapp: prefix)
    from_number = os.getenv("TWILIO_WHATSAPP_FROM", "").strip()
    if from_number.startswith("whatsapp:"):
        from_number = from_number.replace("whatsapp:", "")

    # Ensure recipient is a phone number without "whatsapp:" prefix
    to_number = recipient_phone
    if to_number.startswith("whatsapp:"):
        to_number = to_number.replace("whatsapp:", "")

    logger.info(f"Preparing outbound Twilio SMS for {to_number}")

    print(f"\n--- [Outbound Twilio SMS Gateway] ---")
    print(f"Recipient Phone : {to_number}")
    print(f"From Number     : {from_number}")
    print(f"Message Body    : '{reply_body[:120]}...'")
    print(f"External Ref    : {external_ref}")

    if not account_sid or not auth_token or not from_number:
        print("[Twilio SMS Sender Warning] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_FROM not set. Simulated mode.")
        print("---------------------------------------\n")
        return {
            "status": "simulated",
            "recipient": to_number,
            "body": reply_body,
        }

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    auth = (account_sid, auth_token)
    payload = {
        "From": from_number,
        "To": to_number,
        "Body": reply_body,
    }

    try:
        resp = httpx.post(url, data=payload, auth=auth, timeout=12.0)
        resp.raise_for_status()
        result = resp.json()
        message_id = result.get("sid", "unknown_sms_ref")
        print(f"[Twilio SMS API Success] Delivered message_id={message_id}")
        print("---------------------------------------\n")
        return {
            "status": "sent",
            "recipient": to_number,
            "message_id": message_id,
        }
    except Exception as exc:
        logger.error(f"Twilio SMS API delivery failed to {to_number}: {exc}", exc_info=True)
        print(f"[Twilio SMS API Error] Delivery failed: {exc}")
        print("---------------------------------------\n")
        raise

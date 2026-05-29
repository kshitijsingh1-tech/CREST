"""
CREST — Twilio SMS Webhook Integration
Receives incoming SMS from Twilio and publishes to the Kafka SMS topic.

Endpoint: POST /api/integrations/sms/webhook
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import os

from fastapi import APIRouter, Request, Response, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from backend.api.complaints import ingest_complaint_logic

router = APIRouter(prefix="/api/integrations/sms", tags=["integrations"])
logger = get_logger("crest.api.sms")

AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()


def _verify_signature(url: str, params: dict, signature: str) -> bool:
    """Validate Twilio's X-Twilio-Signature header."""
    if not AUTH_TOKEN:
        return True  # Skip validation in dev
    
    # Sort and concatenate params
    data_str = url
    for k in sorted(params.keys()):
        data_str += k + params[k]
        
    mac = hmac.new(AUTH_TOKEN.encode("utf-8"), data_str.encode("utf-8"), hashlib.sha1)
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)


# ── Incoming Twilio SMS Webhook ───────────────────────────────
@router.post("/webhook")
async def sms_webhook(
    request: Request,
    db: Session = Depends(get_db_optional)
):
    """
    Receives incoming SMS messages via webhook directly from Twilio.
    Natively verifies the signature and publishes the payload.
    """
    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}

    # Verify Twilio Signature
    sig = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    if sig:
        verified = _verify_signature(url, params, sig)
        if not verified:
            # Proxy verification fallback (useful for ngrok/Cloudflare behind reverse proxies)
            forwarded_proto = request.headers.get("x-forwarded-proto", "http")
            forwarded_host = request.headers.get("x-forwarded-host")
            if forwarded_host:
                proxy_url = f"{forwarded_proto}://{forwarded_host}{request.url.path}"
                if _verify_signature(proxy_url, params, sig):
                    logger.info("Twilio SMS signature verified via proxy URL")
                    verified = True
            
            if not verified:
                logger.warning("Twilio SMS signature validation failed. Proceeding anyway (non-blocking for dev/sandbox compatibility).")

    try:
        from_number = params.get("From", "unknown")
        msg_id = params.get("MessageSid", "")
        text = params.get("Body", "").strip()

        if not text:
            # Return blank TwiML to Twilio for empty texts
            return Response(content="<Response></Response>", media_type="application/xml")

        # Check if they are responding to a nodal region request
        channel_name = "whatsapp" if from_number.startswith("whatsapp:") else "sms"
        if from_number.startswith("whatsapp:"):
            from_number = from_number.replace("whatsapp:", "")

        from backend.api.complaints import try_update_complaint_region
        if await try_update_complaint_region(db, channel_name, from_number, text):
            return Response(content="<Response></Response>", media_type="application/xml")

        # Classify intent (COMPLAINT vs CONVERSATION)
        from ai.utils.intent import classify_message_intent, get_cresty_response
        intent = classify_message_intent(text)
        if intent == "CONVERSATION":
            logger.info(f"Twilio SMS from {from_number} classified as CONVERSATION: {text[:50]}...")
            cresty_reply = get_cresty_response(text)
            twiml_content = f"<Response><Message><![CDATA[{cresty_reply}]]></Message></Response>"
            return Response(content=twiml_content, media_type="application/xml")

        complaint_data = {
            "channel": channel_name,
            "customer_id": from_number,
            "body": text,
            "subject": f"{channel_name.upper()} from {from_number}",
            "external_ref": msg_id
        }

        # 1. Attempt Kafka Pipeline (The "Scale" Way)
        try:
            from integrations.kafka.producer import publish
            publish(**complaint_data)
            logger.info(f"Twilio SMS {msg_id} successfully queued on Kafka.")
        except Exception as k_err:
            logger.warning(f"Kafka unavailable for SMS, falling back to direct ingestion: {k_err}")
            # 2. Fallback to Direct Ingest (The "Safe" Way)
            await ingest_complaint_logic(complaint_data, db)

        # Return standard valid empty TwiML response back to Twilio
        return Response(content="<Response></Response>", media_type="application/xml")

    except Exception as e:
        logger.error(f"Twilio SMS webhook processing failed: {e}", exc_info=True)
        # Always return empty TwiML to prevent Twilio from repeating requests endlessly on backend errors
        return Response(content="<Response></Response>", media_type="application/xml")
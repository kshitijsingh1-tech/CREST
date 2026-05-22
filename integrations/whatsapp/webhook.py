"""
CREST — Twilio WhatsApp Integration
Receives incoming messages via webhook from Twilio WhatsApp API
and publishes them to the Kafka whatsapp topic.

Endpoint: POST /webhooks/whatsapp
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import os

from fastapi import APIRouter, Request, Response, HTTPException
from backend.utils.logger import get_logger
from integrations.kafka.producer import publish

router = APIRouter(prefix="/webhooks/whatsapp", tags=["integrations"])
logger = get_logger("crest.integrations.whatsapp")

AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()


def _verify_signature(url: str, params: dict, signature: str) -> bool:
    """Validate Twilio's X-Twilio-Signature header."""
    if not AUTH_TOKEN:
        return True  # Skip verification in dev or if token is not set
    
    # Sort and concatenate params
    data_str = url
    for k in sorted(params.keys()):
        data_str += k + params[k]
        
    mac = hmac.new(AUTH_TOKEN.encode("utf-8"), data_str.encode("utf-8"), hashlib.sha1)
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)


# ── Incoming message handler ──────────────────────────────────
@router.post("")
async def receive_message(request: Request):
    """
    Processes incoming WhatsApp messages from Twilio.
    Text messages → published directly.
    Voice notes → transcribed via Whisper STT, then published.
    """
    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}

    # Validate signature if header exists
    sig = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    if sig:
        verified = _verify_signature(url, params, sig)
        if not verified:
            # Try matching with forwarded host if behind a reverse proxy (e.g. ngrok/Render)
            forwarded_proto = request.headers.get("x-forwarded-proto", "http")
            forwarded_host = request.headers.get("x-forwarded-host")
            if forwarded_host:
                proxy_url = f"{forwarded_proto}://{forwarded_host}{request.url.path}"
                if _verify_signature(proxy_url, params, sig):
                    logger.info("Twilio webhook verified via proxy URL")
                    verified = True
            
            if not verified:
                logger.warning("Twilio signature validation failed")
                raise HTTPException(status_code=401, detail="Invalid Twilio signature")

    try:
        from_number = params.get("From", "unknown")
        msg_id = params.get("MessageSid", "")
        text = params.get("Body", "").strip()
        
        # Clean "whatsapp:" prefix if present in the Sender's phone number
        if from_number.startswith("whatsapp:"):
            from_number = from_number.replace("whatsapp:", "")

        # Check for Media (voice notes)
        num_media = int(params.get("NumMedia", "0"))
        if num_media > 0:
            media_url = params.get("MediaUrl0")
            media_type = params.get("MediaContentType0", "")
            if media_url and "audio" in media_type:
                logger.info(f"Downloading and transcribing Twilio audio: {media_url}")
                transcription = _transcribe_twilio_audio(media_url)
                if transcription:
                    text = transcription
                else:
                    logger.warning("Failed to transcribe audio attachment")

        if not text:
            # Return empty response to Twilio if body is empty and no audio transcribed
            return Response(content="<Response></Response>", media_type="application/xml")

        # Profile info (ProfileName is provided by Twilio)
        display_name = params.get("ProfileName", "WhatsApp User")

        detected_lang = await _detect_language(text)
        publish(
            channel="whatsapp",
            customer_id=from_number,
            body=text,
            customer_name=display_name,
            external_ref=msg_id,
            language=detected_lang,
        )

        # Return empty TwiML response to Twilio to acknowledge receipt
        return Response(content="<Response></Response>", media_type="application/xml")

    except Exception as e:
        logger.error(f"Twilio WhatsApp webhook error: {e}", exc_info=True)
        # Always return successful empty TwiML to Twilio to prevent infinite retries
        return Response(content="<Response></Response>", media_type="application/xml")


def _transcribe_twilio_audio(media_url: str) -> str:
    """
    Download Twilio audio and transcribe via OpenAI Whisper STT.
    Returns transcript string or empty string on failure.
    """
    try:
        import httpx, openai, tempfile, os

        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        
        # Download media using HTTP Basic Authentication if required by Twilio account settings
        auth = (account_sid, auth_token) if account_sid and auth_token else None
        
        resp = httpx.get(media_url, auth=auth, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        audio_bytes = resp.content

        # Transcribe with Whisper
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        os.unlink(tmp_path)
        return transcript.text

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return ""


async def _detect_language(text: str) -> str:
    """
    Detects language utilizing the central translation service with a heuristic fallback.
    """
    try:
        from backend.services.translation_service import translator
        _, detected_lang = await translator.detect_and_translate(text, target_lang="en")
        return detected_lang or "en"
    except Exception as exc:
        logger.warning(f"Dynamic language detection failed: {exc}. Falling back to character heuristic.")
        hindi_chars = sum(1 for c in text if "\u0900" <= c <= "\u097F")
        return "hi" if hindi_chars > len(text) * 0.2 else "en"
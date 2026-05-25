"""
CREST — Twilio WhatsApp Integration
Receives incoming messages via webhook from Twilio WhatsApp API.

Endpoints:
  POST /api/integrations/whatsapp/webhook  (preferred — matches SMS/Instagram)
  POST /webhooks/whatsapp                  (legacy alias)
"""

from __future__ import annotations

import hmac
import hashlib
import base64
import os

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.utils.logger import get_logger
from backend.api.complaints import ingest_complaint_logic
from integrations.kafka.producer import publish

router = APIRouter(prefix="/api/integrations/whatsapp", tags=["integrations"])
legacy_router = APIRouter(prefix="/webhooks/whatsapp", tags=["integrations"])
logger = get_logger("crest.integrations.whatsapp")

AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()


def _candidate_webhook_urls(request: Request) -> list[str]:
    """Twilio signs the exact public URL; try common Render/proxy variants."""
    path = request.url.path
    urls: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        if url and url not in seen:
            seen.add(url)
            urls.append(url)

    add(str(request.url))
    proto = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if host:
        add(f"{proto}://{host}{path}")
    public_base = os.getenv("CREST_PUBLIC_API_URL", "https://crest-api-z8zf.onrender.com").strip().rstrip("/")
    if public_base:
        add(f"{public_base}{path}")
    return urls


def _verify_signature(url: str, params: dict, signature: str) -> bool:
    """Validate Twilio's X-Twilio-Signature header."""
    if not AUTH_TOKEN:
        return True

    data_str = url
    for k in sorted(params.keys()):
        data_str += k + params[k]

    mac = hmac.new(AUTH_TOKEN.encode("utf-8"), data_str.encode("utf-8"), hashlib.sha1)
    computed = base64.b64encode(mac.digest()).decode("utf-8")
    return hmac.compare_digest(computed, signature)


def _verify_twilio_request(request: Request, params: dict) -> None:
    sig = request.headers.get("X-Twilio-Signature", "")
    if not sig:
        return

    for url in _candidate_webhook_urls(request):
        if _verify_signature(url, params, sig):
            if url != str(request.url):
                logger.info(f"Twilio signature verified using URL: {url}")
            return

    logger.warning(
        "Twilio signature validation failed for WhatsApp webhook | path=%s",
        request.url.path,
    )
    raise HTTPException(status_code=401, detail="Invalid Twilio signature")


async def receive_message(request: Request, db: Session = Depends(get_db_optional)):
    """
    Processes incoming WhatsApp messages from Twilio.
    Text messages → ingested into the priority queue.
    Voice notes → transcribed via Whisper STT, then ingested.
    """
    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}

    _verify_twilio_request(request, params)

    try:
        from_number = params.get("From", "unknown")
        msg_id = params.get("MessageSid", "")
        text = params.get("Body", "").strip()

        if from_number.startswith("whatsapp:"):
            from_number = from_number.replace("whatsapp:", "")

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
            return Response(content="<Response></Response>", media_type="application/xml")

        display_name = params.get("ProfileName", "WhatsApp User")
        detected_lang = await _detect_language(text)

        complaint_data = {
            "channel": "whatsapp",
            "customer_id": from_number,
            "body": text,
            "subject": f"WhatsApp from {display_name}",
            "customer_name": display_name,
            "external_ref": msg_id,
            "language": detected_lang,
        }

        try:
            await ingest_complaint_logic(complaint_data, db)
            logger.info(f"WhatsApp message {msg_id} ingested for {from_number}")
        except Exception as ingest_err:
            logger.warning(f"Direct WhatsApp ingest failed, trying publish: {ingest_err}")
            publish(**complaint_data)

        return Response(content="<Response></Response>", media_type="application/xml")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Twilio WhatsApp webhook error: {e}", exc_info=True)
        return Response(content="<Response></Response>", media_type="application/xml")


router.post("/webhook")(receive_message)
legacy_router.post("")(receive_message)


def _transcribe_twilio_audio(media_url: str) -> str:
    """
    Download Twilio audio and transcribe via OpenAI Whisper STT.
    Returns transcript string or empty string on failure.
    """
    try:
        import httpx
        import openai
        import tempfile

        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")

        auth = (account_sid, auth_token) if account_sid and auth_token else None

        resp = httpx.get(media_url, auth=auth, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        audio_bytes = resp.content

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

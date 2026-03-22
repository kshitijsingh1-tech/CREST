"""
CREST — WhatsApp Cloud API Integration
Receives incoming messages via webhook (Meta / Twilio WhatsApp Cloud API)
and publishes them to the Kafka whatsapp topic.

Endpoint: POST /webhooks/whatsapp
Verification: GET /webhooks/whatsapp (Meta hub.challenge handshake)
"""

from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import APIRouter, Request, Response, HTTPException, Query
from backend.utils.logger import get_logger
from integrations.kafka.producer import publish

router = APIRouter(prefix="/webhooks/whatsapp", tags=["integrations"])
logger = get_logger("crest.integrations.whatsapp")

VERIFY_TOKEN    = os.getenv("WA_VERIFY_TOKEN",    "crest_verify_2026")
APP_SECRET      = os.getenv("WA_APP_SECRET",      "")    # Meta app secret for HMAC


def _verify_signature(body: bytes, signature: str) -> bool:
    """Validate Meta's X-Hub-Signature-256 header."""
    if not APP_SECRET:
        return True   # Skip in dev
    expected = "sha256=" + hmac.new(
        APP_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ── Meta webhook verification handshake ─────────────────────
@router.get("")
def verify_webhook(
    hub_mode:       str = Query(..., alias="hub.mode"),
    hub_challenge:  str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified by Meta")
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


# ── Incoming message handler ──────────────────────────────────
@router.post("")
async def receive_message(request: Request):
    """
    Processes incoming WhatsApp messages and voice notes.
    Text messages → published directly.
    Voice notes → transcribed via Whisper STT, then published.
    """
    body_bytes = await request.body()

    # Validate HMAC signature
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_signature(body_bytes, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        data   = await request.json()
        entry  = data.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0].get("value", {})
        messages = change.get("messages", [])

        for msg in messages:
            msg_type   = msg.get("type", "text")
            from_number = msg.get("from", "unknown")
            msg_id     = msg.get("id", "")

            if msg_type == "text":
                text = msg["text"]["body"]
            elif msg_type == "audio":
                # Transcribe voice note via Whisper
                audio_id = msg["audio"]["id"]
                text = _transcribe_audio(audio_id)
                if not text:
                    logger.warning(f"Transcription failed for audio {audio_id}")
                    continue
            else:
                logger.debug(f"Ignoring WhatsApp message type: {msg_type}")
                continue

            # Profile info (if available)
            contacts     = change.get("contacts", [{}])
            display_name = contacts[0].get("profile", {}).get("name") if contacts else None

            publish(
                channel       = "whatsapp",
                customer_id   = from_number,
                body          = text,
                customer_name = display_name,
                external_ref  = msg_id,
                language      = _detect_language(text),
            )

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}", exc_info=True)
        # Always return 200 to Meta to prevent retries flooding
        return {"status": "error", "message": str(e)}


def _transcribe_audio(audio_id: str) -> str:
    """
    Download WhatsApp audio and transcribe via OpenAI Whisper STT.
    Returns transcript string or empty string on failure.
    """
    try:
        import httpx, openai, tempfile, os

        wa_token = os.getenv("WA_ACCESS_TOKEN", "")
        # 1. Get download URL from Meta Graph API
        info = httpx.get(
            f"https://graph.facebook.com/v18.0/{audio_id}",
            headers={"Authorization": f"Bearer {wa_token}"},
            timeout=10,
        ).json()
        audio_url = info.get("url")
        if not audio_url:
            return ""

        # 2. Download audio bytes
        audio_bytes = httpx.get(
            audio_url,
            headers={"Authorization": f"Bearer {wa_token}"},
            timeout=30,
        ).content

        # 3. Transcribe with Whisper
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


def _detect_language(text: str) -> str:
    """Simple heuristic — extend with langdetect in production."""
    hindi_chars = sum(1 for c in text if "\u0900" <= c <= "\u097F")
    return "hi" if hindi_chars > len(text) * 0.2 else "en"

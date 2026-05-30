"""
CREST — Translate API
Lightweight endpoint for officer-facing UI to translate text on demand.
Used by the ComplaintDetail component to let officers toggle between
original complaint language and their working language.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from asgiref.sync import async_to_sync
from backend.services.translation_service import translator
from backend.utils.logger import get_logger

logger = get_logger("crest.api.translate")

router = APIRouter(prefix="/api/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "en"
    source_lang: str | None = None


class TranslateResponse(BaseModel):
    translated: str
    detected_source: str | None = None


@router.post("", response_model=TranslateResponse)
def translate_text(body: TranslateRequest):
    """
    Translate a block of text to the requested target language.
    If source_lang is not provided, it is auto-detected.
    """
    if not body.text or not body.text.strip():
        return TranslateResponse(translated=body.text or "", detected_source=None)

    try:
        if body.source_lang:
            translated = async_to_sync(translator.translate)(
                body.text,
                source_lang=body.source_lang,
                target_lang=body.target_lang,
            )
            return TranslateResponse(translated=translated, detected_source=body.source_lang)
        else:
            translated, detected = async_to_sync(translator.detect_and_translate)(
                body.text,
                target_lang=body.target_lang,
            )
            return TranslateResponse(translated=translated, detected_source=detected)
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
        raise HTTPException(status_code=502, detail=f"Translation service error: {str(e)}")

"""
CREST chat provider helper.

Uses an OpenAI-compatible chat completions endpoint and supports both GROQ_*
and XAI_* environment variable names.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from backend.utils.logger import get_logger
from backend.utils.runtime import REPO_ROOT  # noqa: F401 - ensures repo .env is loaded

logger = get_logger("crest.ai.groq")

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"


def _get_env(*names: str) -> str:
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value:
            return value
    return ""


def get_api_key() -> str:
    return _get_env("GROQ_API_KEY", "XAI_API_KEY")


def has_api_key() -> bool:
    return bool(get_api_key())


def get_base_url() -> str:
    return (_get_env("GROQ_BASE_URL", "XAI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def get_model(env_var: str, default: str) -> str:
    aliases = [env_var]
    if env_var.startswith("GROQ_"):
        aliases.append("XAI_" + env_var[len("GROQ_"):])
    return (_get_env(*aliases) or default).strip()


def create_chat_completion(
    *,
    messages: list[dict[str, str]],
    model: str,
    max_tokens: int,
    temperature: float = 0.0,
    response_format: dict[str, Any] | None = None,
) -> str:
    """
    Call the configured OpenAI-compatible chat completions endpoint and return text content.
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("No GROQ_API_KEY or XAI_API_KEY is set")

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if response_format is not None:
        payload["response_format"] = response_format

    response = httpx.post(
        f"{get_base_url()}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=httpx.Timeout(60.0, connect=10.0),
    )
    response.raise_for_status()

    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Unexpected Groq response shape") from exc

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts = [
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and part.get("type") == "text"
        ]
        joined = "".join(parts).strip()
        if joined:
            return joined

    raise ValueError("Groq response did not contain text content")

"""
CREST embedding generation.

Generates 1536-dimensional vectors via OpenAI and falls back to a
deterministic mock embedding in local/dev mode.
"""

from __future__ import annotations

import os

import numpy as np

from backend.utils.logger import get_logger
from backend.utils.runtime import REPO_ROOT  # noqa: F401 - ensures repo .env is loaded

logger = get_logger("crest.embeddings")

EMBEDDING_DIM = 768


def _get_mode() -> str:
    return os.getenv("EMBEDDING_MODE", "openai").strip().lower()


def get_embedding_mode() -> str:
    """Return the normalized embedding mode configured for this process."""
    return _get_mode()


def _get_batch_size() -> int:
    return max(1, int(os.getenv("EMBED_BATCH_SIZE", "64")))


def _clean_text(text: str) -> str:
    return (text or "").strip()


def _mock_embed(text: str) -> list[float]:
    """Unit-normalized deterministic mock embedding for local development."""
    rng = np.random.default_rng(abs(hash(text)) % (2**32))
    vector = rng.standard_normal(EMBEDDING_DIM).astype(np.float32)
    return (vector / np.linalg.norm(vector)).tolist()


def _openai_client():
    from openai import OpenAI

    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def _openai_embed(text: str) -> list[float]:
    client = _openai_client()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=EMBEDDING_DIM,
    )
    return response.data[0].embedding


def _openai_embed_batch(texts: list[str]) -> list[list[float]]:
    client = _openai_client()
    embeddings: list[list[float]] = []
    batch_size = _get_batch_size()

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=batch,
            dimensions=EMBEDDING_DIM,
        )
        embeddings.extend(
            item.embedding for item in sorted(response.data, key=lambda item: item.index)
        )

    return embeddings


_model = None


def _get_model_instance():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # all-mpnet-base-v2 is 768-dimensional, matching our DB schema exactly.
            _model = SentenceTransformer("all-mpnet-base-v2")
            logger.info("Local SBERT model (all-mpnet-base-v2) loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load SBERT model: {e}")
            return None
    return _model


def _local_embed(text: str) -> list[float]:
    """Generate 768-dim embedding using local SBERT."""
    model = _get_model_instance()
    if model is None:
        raise RuntimeError("Local model not available")
    
    # encode() returns a numpy array
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


def _local_embed_batch(texts: list[str]) -> list[list[float]]:
    """Batch embed using local SBERT."""
    model = _get_model_instance()
    if model is None:
        raise RuntimeError("Local model not available")
    
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def embed(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding for the given text.

    Returns a list[float] that can be safely cast to np.float32 for pgvector.
    """
    cleaned = _clean_text(text)
    if not cleaned:
        raise ValueError("Cannot embed empty string")

    mode = _get_mode()
    try:
        if mode == "mock":
            return _mock_embed(cleaned)
        if mode == "local":
            return _local_embed(cleaned)
        if mode == "groq":
            # Groq embeddings are currently 404ing or unreliable; use local for now
            return _local_embed(cleaned)
        if mode in {"openai", "anthropic"}:
            return _openai_embed(cleaned)
        raise ValueError(f"Unsupported EMBEDDING_MODE: {mode}")
    except Exception as exc:
        logger.error(
            "Embedding failed, falling back to mock",
            extra={"error": str(exc)},
        )
        return _mock_embed(cleaned)


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts with API batching and mock fallback."""
    cleaned = [_clean_text(text) for text in texts]
    if any(not text for text in cleaned):
        raise ValueError("Cannot embed empty string in batch")

    mode = _get_mode()
    try:
        if mode == "mock":
            return [_mock_embed(text) for text in cleaned]
        if mode == "local":
            return _local_embed_batch(cleaned)
        if mode == "groq":
            return _local_embed_batch(cleaned)
        if mode in {"openai", "anthropic"}:
            return _openai_embed_batch(cleaned)
        raise ValueError(f"Unsupported EMBEDDING_MODE: {mode}")
    except Exception as exc:
        logger.error(
            "Batch embedding failed, falling back to mock",
            extra={"error": str(exc), "batch_size": len(cleaned)},
        )
        return [_mock_embed(text) for text in cleaned]

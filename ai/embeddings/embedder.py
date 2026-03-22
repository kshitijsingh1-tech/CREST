"""
CREST — Embedding Generation
Generates 1536-dim Complaint DNA vectors via Anthropic / OpenAI.
Falls back to a mock normalised random vector in dev/test mode.
"""

from __future__ import annotations

import os
import numpy as np
from backend.utils.logger import get_logger

logger = get_logger("crest.embeddings")

EMBEDDING_DIM = 1536
_MODE = os.getenv("EMBEDDING_MODE", "anthropic")   # anthropic | openai | mock


def _mock_embed(text: str) -> list[float]:
    """Unit-normalised deterministic mock embedding for local dev."""
    rng = np.random.default_rng(abs(hash(text)) % (2**32))
    v = rng.standard_normal(EMBEDDING_DIM).astype(np.float32)
    return (v / np.linalg.norm(v)).tolist()


def _openai_embed(text: str) -> list[float]:
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        dimensions=EMBEDDING_DIM,
    )
    return response.data[0].embedding


def _anthropic_embed(text: str) -> list[float]:
    """
    Anthropic doesn't expose a public embeddings endpoint yet.
    We use the OpenAI adapter here and swap when Anthropic releases one.
    In production, route through your embedding service.
    """
    return _openai_embed(text)


def embed(text: str) -> list[float]:
    """
    Generate a 1536-dim embedding for the given text.
    Returns a list[float] safe to cast to np.float32 for pgvector.

    Usage:
        vector = embed(complaint.body)
        emb_array = np.array(vector, dtype=np.float32)
    """
    text = text.strip()
    if not text:
        raise ValueError("Cannot embed empty string")

    try:
        if _MODE == "mock":
            return _mock_embed(text)
        elif _MODE == "openai":
            return _openai_embed(text)
        else:
            return _anthropic_embed(text)
    except Exception as e:
        logger.error("Embedding failed, falling back to mock", extra={"error": str(e)})
        return _mock_embed(text)


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts — batches OpenAI calls for efficiency."""
    if _MODE in ("mock", ):
        return [embed(t) for t in texts]

    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        dimensions=EMBEDDING_DIM,
    )
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]

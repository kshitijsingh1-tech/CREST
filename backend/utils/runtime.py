import os
from pathlib import Path

from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env", override=False)


def is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


DEV_MOCK = is_truthy(os.getenv("CREST_DEV_MOCK", "0"))
USE_PGVECTOR = is_truthy(os.getenv("CREST_USE_PGVECTOR", "1"))

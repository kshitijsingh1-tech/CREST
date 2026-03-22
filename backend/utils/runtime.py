import os


def is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


DEV_MOCK = is_truthy(os.getenv("CREST_DEV_MOCK", "0"))

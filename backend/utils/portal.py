"""Public customer portal base URL and tracking links."""

from __future__ import annotations

import os
from urllib.parse import quote

# Current production UI (override via CREST_PORTAL_URL on Render)
DEFAULT_PORTAL_URL = "https://crest-ui-6zh6.onrender.com"


def get_portal_url() -> str:
    return os.getenv("CREST_PORTAL_URL", DEFAULT_PORTAL_URL).rstrip("/")


def build_tracking_link(ref_id: str, contact: str) -> str:
    ref = quote(str(ref_id), safe="")
    contact_q = quote(str(contact), safe="")
    return f"{get_portal_url()}/track?ref={ref}&contact={contact_q}"

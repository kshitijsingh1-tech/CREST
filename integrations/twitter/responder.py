"""
CREST — Twitter / X Auto-Redirect Responder

When a customer tags @UnionBankTweets or uses #UnionBankComplaint,
CREST immediately posts a public reply directing them to a private
channel (email or the web portal) for secure, confidential resolution.

Why public replies instead of DMs?
  - X/Twitter only allows DMs between accounts that mutually follow
    each other, or when the receiving account has "allow DMs from anyone"
    enabled (rare for official bank accounts).
  - A warm, visible public reply also signals responsiveness to other
    users watching the thread.

Template character budget: ~260 chars (safe under 280-char limit).
"""

from __future__ import annotations

import os
import time
from threading import Lock
from backend.utils.logger import get_logger
from integrations.twitter.sender import send_twitter_reply

logger = get_logger("crest.integrations.twitter.responder")

#---------------- Config ---------------------------------------------

BANK_EMAIL       = os.getenv("BANK_SUPPORT_EMAIL",  "iscuteayushi@gmail.com")
PORTAL_URL       = os.getenv("CREST_PORTAL_URL",    "https://unionbank.crest.in/crest_publicPortal")
BANK_HANDLE      = os.getenv("TWITTER_BANK_HANDLE", "@UnionBankTweets")

# Guard: never reply to the same tweet_id twice (in-memory; safe for single process)
_replied: set[str] = set()
_lock = Lock()

#----------- Reply templates ----------------------------------------------\

def _build_reply(customer_name: str) -> str:
   
    first_name = (customer_name or "").split()[0] if customer_name else "there"

    return (
        f"Hi {first_name}! 👋 We've seen your message. "
        f"To protect your account details, please share your grievance privately:\n\n"
        f"📧 Email  → {BANK_EMAIL}\n"
        f"🌐 Portal → {PORTAL_URL}\n\n"
        f"Our team will respond within 24 hours. We're here to help! 🙏 {BANK_HANDLE}"
    )


def _build_reply_no_name() -> str:
    """Fallback template when we can't resolve the customer's display name."""
    return (
        f"Hello! 👋 We've seen your mention. "
        f"To keep your account information safe, please reach us privately:\n\n"
        f"📧 Email  → {BANK_EMAIL}\n"
        f"🌐 Portal → {PORTAL_URL}\n\n"
        f"We'll get back to you within 24 hours. {BANK_HANDLE}"
    )


# ── Public API ─────────────────────────────────────────────────────────────────

def should_auto_reply(tweet_id: str) -> bool:
    """Return True only if we haven't already replied to this tweet."""
    with _lock:
        if tweet_id in _replied:
            return False
        _replied.add(tweet_id)
        return True


def fire_redirect_reply(
    tweet_id: str,
    customer_name: str | None = None,
    *,
    dry_run: bool = False,
) -> dict:
    """
    Post the redirect reply as a public reply in the tweet thread.

    Args:
        tweet_id:       The tweet to reply to (in_reply_to_tweet_id).
        customer_name:  Display name of the mentioner (resolved from Twitter expansions).
        dry_run:        If True, builds the message but does NOT call the API.
                        Useful for testing without Twitter credentials.

    Returns:
        A result dict with keys: status, tweet_id, body.
    """
    if not tweet_id:
        logger.warning("fire_redirect_reply called with empty tweet_id — skipping")
        return {"status": "skipped", "reason": "no_tweet_id"}

    # De-duplicate: only reply once per tweet
    if not should_auto_reply(tweet_id):
        logger.debug(f"Already replied to tweet {tweet_id} — skipping duplicate")
        return {"status": "duplicate", "tweet_id": tweet_id}

    body = _build_reply(customer_name) if customer_name else _build_reply_no_name()

    logger.info(
        f"Auto-redirect reply → tweet_id={tweet_id} "
        f"customer={customer_name!r} dry_run={dry_run}"
    )
    logger.debug(f"Reply body ({len(body)} chars):\n{body}")

    if dry_run or not os.getenv("TWITTER_BEARER_TOKEN"):
        logger.info("[DRY-RUN / No credentials] Reply NOT posted — simulated only")
        return {"status": "simulated", "tweet_id": tweet_id, "body": body}

    # Small deliberate delay so the complaint is ingested first
    time.sleep(1.5)

    result = send_twitter_reply(
        recipient_handle=BANK_HANDLE,   # sender context (ignored by API for public replies)
        reply_body=body,
        tweet_id=tweet_id,
    )

    return {
        "status": result.get("status", "sent"),
        "tweet_id": tweet_id,
        "body": body,
    }

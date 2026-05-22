"""
CREST - Outbound Twitter / X Integration
Send approved customer replies to Twitter / X using OAuth 1.0a User Context.

Why OAuth 1.0a?
  - Bearer Token (App-only) is READ-ONLY — it cannot post tweets.
  - Posting requires OAuth 1.0a User Context, which acts on behalf of
    the bank's Twitter account and has write permission.

Required env vars:
  TWITTER_API_KEY        — Consumer Key
  TWITTER_API_SECRET     — Consumer Key Secret
  TWITTER_ACCESS_TOKEN   — Access Token (generated for bank account)
  TWITTER_ACCESS_SECRET  — Access Token Secret
"""

from __future__ import annotations

import os
import httpx
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.twitter.sender")


def _get_oauth1_headers(method: str, url: str, payload: dict) -> dict:
    """
    Build OAuth 1.0a Authorization header using requests_oauthlib.
    Falls back gracefully if the library isn't available.
    """
    try:
        from requests_oauthlib import OAuth1

        api_key      = os.getenv("TWITTER_API_KEY", "").strip()
        api_secret   = os.getenv("TWITTER_API_SECRET", "").strip()
        access_token = os.getenv("TWITTER_ACCESS_TOKEN", "").strip()
        access_secret= os.getenv("TWITTER_ACCESS_SECRET", "").strip()

        if not all([api_key, api_secret, access_token, access_secret]):
            return {}

        import requests
        req = requests.Request(method, url, json=payload)
        prepped = req.prepare()

        auth = OAuth1(api_key, api_secret, access_token, access_secret)
        auth(prepped)

        # Extract just the Authorization header value
        return {"Authorization": prepped.headers.get("Authorization", "")}

    except ImportError:
        logger.warning("requests_oauthlib not installed — cannot use OAuth 1.0a")
        return {}


def _has_oauth_creds() -> bool:
    return all([
        os.getenv("TWITTER_API_KEY", "").strip(),
        os.getenv("TWITTER_API_SECRET", "").strip(),
        os.getenv("TWITTER_ACCESS_TOKEN", "").strip(),
        os.getenv("TWITTER_ACCESS_SECRET", "").strip(),
    ])


def send_twitter_reply(
    recipient_handle: str,
    reply_body: str,
    *,
    tweet_id: str | None = None,
) -> dict:
    """
    Post a public reply tweet using OAuth 1.0a User Context (write access).
    Falls back to simulated mode if credentials are missing.
    """
    recipient_handle = (recipient_handle or "").strip()
    if not recipient_handle:
        raise ValueError("No recipient handle provided")

    # Strip internal TW_ prefix
    clean_handle = recipient_handle
    if clean_handle.startswith("TW_"):
        clean_handle = clean_handle[3:]

    print(f"\n--- [Outbound Twitter/X API Gateway] ---")
    print(f"Recipient Handle    : {clean_handle}")
    print(f"Auth Mode           : {'OAuth 1.0a (write)' if _has_oauth_creds() else 'No credentials (simulated)'}")
    print(f"In Reply To Tweet   : {tweet_id}")
    print(f"Message Body        : '{reply_body[:120]}...'")

    if not _has_oauth_creds():
        print("[Twitter Sender] Missing OAuth credentials — running in simulated mode.")
        print("-----------------------------------------\n")
        return {
            "status": "simulated",
            "recipient": recipient_handle,
            "body": reply_body,
        }

    url = "https://api.twitter.com/2/tweets"
    payload: dict = {"text": reply_body}
    if tweet_id:
        payload["reply"] = {"in_reply_to_tweet_id": tweet_id}

    # Build OAuth 1.0a headers
    oauth_headers = _get_oauth1_headers("POST", url, payload)
    if not oauth_headers:
        logger.error("Failed to build OAuth 1.0a headers — check TWITTER_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET")
        return {"status": "auth_error", "recipient": recipient_handle}

    headers = {
        **oauth_headers,
        "Content-Type": "application/json",
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=12.0)
        resp.raise_for_status()
        result = resp.json()
        new_tweet_id = result.get("data", {}).get("id", "unknown_tweet_ref")
        print(f"[Twitter OAuth1a Success] Reply posted | tweet_id={new_tweet_id}")
        print("-----------------------------------------\n")
        return {
            "status": "sent",
            "recipient": recipient_handle,
            "tweet_id": new_tweet_id,
        }
    except Exception as exc:
        logger.error(
            f"Twitter OAuth1a reply failed to {recipient_handle} on tweet={tweet_id}: {exc}",
            exc_info=True,
        )
        print(f"[Twitter API Error] {exc}")
        print("-----------------------------------------\n")
        raise

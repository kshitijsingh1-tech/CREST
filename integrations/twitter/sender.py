"""
CREST - Outbound Twitter / X Integration
Send approved customer replies to Twitter / X (Public Tweet replies or DMs).
"""

from __future__ import annotations

import os
import httpx
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.twitter.sender")


def send_twitter_reply(
    recipient_handle: str,
    reply_body: str,
    *,
    tweet_id: str | None = None,
) -> dict:
    """
    Send approved customer replies to Twitter / X.
    If tweet_id is provided, posts a public reply to the tweet thread.
    Otherwise, logs / DMs the customer handle.
    """
    recipient_handle = (recipient_handle or "").strip()
    if not recipient_handle:
        raise ValueError("No recipient handle provided")

    bearer_token = os.getenv("TWITTER_BEARER_TOKEN", "").strip()

    # Mask/strip 'TW_' prefix which was added for database isolation of customer IDs
    clean_handle = recipient_handle
    if clean_handle.startswith("TW_"):
        clean_handle = clean_handle[3:]

    print(f"\n--- [Outbound Twitter/X API Gateway] ---")
    print(f"Recipient Handle/ID : {clean_handle}")
    print(f"Response Type       : {'Public Reply Thread' if tweet_id else 'Direct Message'}")
    print(f"In Reply To Tweet   : {tweet_id}")
    print(f"Message Body        : '{reply_body[:120]}...'")

    if not bearer_token:
        print("[Twitter Sender Warning] TWITTER_BEARER_TOKEN not set. Running in presentation/simulated mode.")
        print("-----------------------------------------\n")
        return {
            "status": "simulated",
            "recipient": recipient_handle,
            "body": reply_body,
        }

    # Public Tweet API v2 endpoint
    url = "https://api.twitter.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
    }

    payload: dict = {
        "text": reply_body,
    }
    if tweet_id:
        payload["reply"] = {
            "in_reply_to_tweet_id": tweet_id,
        }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=12.0)
        resp.raise_for_status()
        result = resp.json()
        new_tweet_id = result.get("data", {}).get("id", "unknown_tweet_ref")
        print(f"[Twitter API Success] Tweet reply posted successfully | tweet_id={new_tweet_id}")
        print("-----------------------------------------\n")
        return {
            "status": "sent",
            "recipient": recipient_handle,
            "tweet_id": new_tweet_id,
        }
    except Exception as exc:
        logger.error(f"Twitter API reply failed to {recipient_handle} on tweet={tweet_id}: {exc}", exc_info=True)
        print(f"[Twitter API Error] Connection or authorization failed: {exc}")
        print("-----------------------------------------\n")
        raise

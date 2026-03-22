"""
CREST — Twitter / X API v2 Integration
Filtered stream listener that picks up @UnionBankTweets mentions
and DMs, then publishes to the Kafka twitter topic.
"""

from __future__ import annotations

import os
import json
import time
import requests
from backend.utils.logger import get_logger
from integrations.kafka.producer import publish

logger = get_logger("crest.integrations.twitter")

BEARER_TOKEN   = os.getenv("TWITTER_BEARER_TOKEN", "")
BANK_HANDLE    = os.getenv("TWITTER_BANK_HANDLE", "@UnionBankTweets")
STREAM_URL     = "https://api.twitter.com/2/tweets/search/stream"
RULES_URL      = "https://api.twitter.com/2/tweets/search/stream/rules"

STREAM_FIELDS  = "tweet.fields=text,author_id,created_at,lang,conversation_id"
STREAM_EXPANSIONS = "expansions=author_id&user.fields=username,name"

FILTER_RULES = [
    {"value": f"({BANK_HANDLE} OR #UnionBankComplaint) -is:retweet", "tag": "bank_mentions"},
    {"value": f"to:{BANK_HANDLE[1:]} -is:retweet", "tag": "bank_replies"},
]


def _headers() -> dict:
    return {"Authorization": f"Bearer {BEARER_TOKEN}"}


def _setup_rules() -> None:
    """Delete existing rules and set CREST filter rules."""
    # Get current rules
    current = requests.get(RULES_URL, headers=_headers()).json()
    ids = [r["id"] for r in current.get("data", [])]
    if ids:
        requests.post(RULES_URL, headers=_headers(), json={"delete": {"ids": ids}})

    # Add new rules
    res = requests.post(RULES_URL, headers=_headers(), json={"add": FILTER_RULES})
    if res.status_code != 201:
        logger.error(f"Failed to set stream rules: {res.text}")
    else:
        logger.info(f"Stream rules set: {[r['tag'] for r in FILTER_RULES]}")


def _extract_complaint_text(tweet_data: dict, includes: dict) -> tuple[str, str, str]:
    """
    Returns (customer_id, customer_name, body) from a tweet object.
    customer_id is the Twitter author_id (masked in prod with CIF lookup).
    """
    author_id = tweet_data.get("author_id", "unknown")
    text      = tweet_data.get("text", "")

    # Resolve display name from includes
    users = {u["id"]: u for u in includes.get("users", [])}
    user  = users.get(author_id, {})
    name  = user.get("name", "Twitter User")

    # Strip @UnionBankTweets from text
    body = text.replace(BANK_HANDLE, "").strip()

    return author_id, name, body


def run_stream(max_reconnects: int = 10) -> None:
    """
    Start Twitter filtered stream.
    Reconnects automatically with exponential backoff on disconnection.
    """
    if not BEARER_TOKEN:
        logger.warning("TWITTER_BEARER_TOKEN not set, Twitter stream disabled")
        return

    _setup_rules()

    reconnects = 0
    backoff    = 1

    while reconnects < max_reconnects:
        try:
            logger.info("Connecting to Twitter filtered stream...")
            with requests.get(
                f"{STREAM_URL}?{STREAM_FIELDS}&{STREAM_EXPANSIONS}",
                headers=_headers(),
                stream=True,
                timeout=(10, 90),
            ) as resp:
                if resp.status_code != 200:
                    logger.error(f"Stream returned {resp.status_code}: {resp.text}")
                    break

                reconnects = 0
                backoff    = 1
                logger.info("Twitter stream connected")

                for line in resp.iter_lines():
                    if not line:
                        continue
                    try:
                        payload  = json.loads(line)
                        tweet    = payload.get("data", {})
                        includes = payload.get("includes", {})

                        author_id, name, body = _extract_complaint_text(tweet, includes)

                        if not body or len(body) < 10:
                            continue

                        publish(
                            channel       = "twitter",
                            customer_id   = f"TW_{author_id}",
                            body          = body,
                            customer_name = name,
                            external_ref  = tweet.get("id"),
                            language      = tweet.get("lang", "en"),
                        )

                    except json.JSONDecodeError:
                        continue
                    except Exception as e:
                        logger.error(f"Error processing tweet: {e}")

        except requests.exceptions.ConnectionError as e:
            reconnects += 1
            logger.warning(f"Stream disconnected ({reconnects}/{max_reconnects}): {e}. Retrying in {backoff}s")
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    logger.error("Twitter stream max reconnects reached. Manual restart required.")


if __name__ == "__main__":
    run_stream()

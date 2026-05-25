"""
CREST - Outbound Instagram Integration
Send approved customer replies to Instagram Direct Messages using Meta Graph API.
"""
import os
import requests
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.instagram.sender")

META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "mock_meta_token")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID", "mock_account_id")

def send_instagram_dm(customer_username: str, reply_text: str):
    """
    Send a DM to the customer on Instagram.
    """
    if customer_username.startswith("@"):
        customer_username = customer_username[1:]

    logger.info(f"Preparing to send Instagram DM to {customer_username}...")
    
    url = f"https://graph.facebook.com/v18.0/{INSTAGRAM_ACCOUNT_ID}/messages"
    
    payload = {
        "recipient": {"username": customer_username},
        "message": {"text": reply_text}
    }
    
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    print(f"\n--- [Outbound Instagram DM Gateway] ---")
    print(f"To: @{customer_username}")
    print(f"Body: {reply_text}")
    print(f"----------------------------------------\n")

    # Mock success since this is a demo environment without real Meta Graph tokens
    if META_ACCESS_TOKEN == "mock_meta_token":
        print(f"[Instagram DM Simulated Success] Message 'sent' to @{customer_username}.")
        return True

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        print(f"[Instagram DM Success] Message sent to @{customer_username}.")
        return True
    except Exception as exc:
        logger.error(f"Failed to send Instagram DM to {customer_username}: {exc}")
        print(f"[Instagram DM Error] {exc}")
        return False

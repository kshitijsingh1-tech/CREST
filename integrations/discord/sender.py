"""
CREST - Outbound Discord Integration
Send approved customer replies to Discord Direct Messages using Discord Bot API.
"""
import os
import httpx
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.discord.sender")

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "mock_discord_token")


def send_discord_dm(recipient_user_id: str, reply_text: str, *, external_ref: str | None = None) -> dict:
    """
    Send a direct message to a Discord user.
    
    Args:
        recipient_user_id: Discord user ID (numeric string)
        reply_text: Message text to send
        external_ref: Optional reference ID for tracking
    
    Returns:
        Dictionary with status and message details
    """
    recipient_user_id = (recipient_user_id or "").strip()
    if not recipient_user_id:
        raise ValueError("No Discord user ID provided")

    logger.info(f"Preparing to send Discord DM to user {recipient_user_id}...")
    
    print(f"\n--- [Outbound Discord DM Gateway] ---")
    print(f"To: {recipient_user_id}")
    print(f"Body: {reply_text}")
    print(f"External Ref: {external_ref}")
    print(f"----------------------------------------\n")

    # Mock success if token not configured
    if not DISCORD_BOT_TOKEN or DISCORD_BOT_TOKEN in ("mock_discord_token", "your_discord_bot_token_here", ""):
        print(f"[Discord DM Simulated Success] Message 'sent' to user {recipient_user_id}.")
        return {
            "status": "simulated",
            "recipient_user_id": recipient_user_id,
            "body": reply_text,
        }

    try:
        # First, create a DM channel with the user
        headers = {
            "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Create DM channel
        dm_url = "https://discord.com/api/v10/users/@me/channels"
        dm_payload = {"recipient_id": recipient_user_id}
        
        dm_resp = httpx.post(dm_url, json=dm_payload, headers=headers, timeout=10.0)
        dm_resp.raise_for_status()
        dm_data = dm_resp.json()
        channel_id = dm_data.get("id")
        
        if not channel_id:
            raise ValueError("Failed to create DM channel")
        
        # Send message to DM channel
        msg_url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
        msg_payload = {"content": reply_text}
        
        msg_resp = httpx.post(msg_url, json=msg_payload, headers=headers, timeout=10.0)
        msg_resp.raise_for_status()
        msg_data = msg_resp.json()
        message_id = msg_data.get("id", "unknown_discord_ref")
        
        print(f"[Discord DM API Success] Delivered message_id={message_id} to user {recipient_user_id}")
        print("----------------------------------------\n")
        
        return {
            "status": "sent",
            "recipient_user_id": recipient_user_id,
            "channel_id": channel_id,
            "message_id": message_id,
        }
    except Exception as exc:
        logger.error(f"Discord DM API delivery failed to user {recipient_user_id}: {exc}", exc_info=True)
        print(f"[Discord DM API Error] Delivery failed: {exc}")
        print("----------------------------------------\n")
        return {
            "status": "error",
            "recipient_user_id": recipient_user_id,
            "error": str(exc),
        }

"""
CREST — Discord Bot Listener (Optional Gateway Integration)
This script connects to Discord using discord.py and forwards received DMs to CREST.
Run this as a separate service for production Discord support.

Usage:
    python integrations/discord/listener.py

Environment Variables:
    DISCORD_BOT_TOKEN: Bot token from Discord Developer Portal
    CREST_API_URL: URL to CREST API (default: http://127.0.0.1:8000)
"""

import os
import httpx
import asyncio
from backend.utils.logger import get_logger

logger = get_logger("crest.integrations.discord")

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "").strip()
CREST_API_URL = os.getenv("CREST_API_URL", "http://127.0.0.1:8000")
CREST_WEBHOOK_URL = f"{CREST_API_URL}/api/integrations/discord/webhook"


async def forward_to_crest(user_id: str, username: str, message_id: str, content: str):
    """
    Forward Discord DM to CREST webhook endpoint.
    """
    payload = {
        "type": 0,
        "message": {
            "id": message_id,
            "channel_id": "direct",
            "author": {
                "id": user_id,
                "username": username,
                "bot": False
            },
            "content": content,
            "timestamp": "2026-01-01T00:00:00+00:00",  # Required by DiscordMessage model
        }
    }
    
    headers = {}
    if DISCORD_BOT_TOKEN:
        headers["X-Discord-Bot-Token"] = DISCORD_BOT_TOKEN
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(CREST_WEBHOOK_URL, json=payload, headers=headers, timeout=10.0)
            response.raise_for_status()
            logger.info(f"Forwarded Discord DM to CREST: user={username}, msg_id={message_id}")
    except Exception as e:
        logger.error(f"Failed to forward Discord DM to CREST: {e}")


async def run_bot():
    """
    Connect to Discord using discord.py and listen for DMs.
    """
    if not DISCORD_BOT_TOKEN or DISCORD_BOT_TOKEN in ("mock_discord_token", "your_discord_bot_token_here", ""):
        logger.warning("DISCORD_BOT_TOKEN not set or is placeholder. Discord listener task will not start.")
        return
        
    try:
        import discord
    except ImportError:
        logger.error("discord.py not installed. Run: pip install discord.py")
        return
    
    class CRESTBot(discord.Client):
        async def on_ready(self):
            logger.info(f"Discord bot connected as {self.user}")
        
        async def on_message(self, message):
            # Ignore bot messages
            if message.author.bot:
                return
            
            # Only process DMs
            if not isinstance(message.channel, discord.DMChannel):
                return
            
            # Ignore empty messages
            if not message.content or not message.content.strip():
                return
            
            logger.info(f"Received Discord DM from {message.author}: {message.content[:100]}")
            
            # Forward to CREST
            await forward_to_crest(
                user_id=str(message.author.id),
                username=message.author.name,
                message_id=str(message.id),
                content=message.content
            )
    
    intents = discord.Intents.default()
    intents.message_content = True  # Required to read message content
    intents.dm_messages = True      # Required for DMs
    
    bot = CRESTBot(intents=intents)
    
    try:
        await bot.start(DISCORD_BOT_TOKEN)
    except discord.LoginFailure:
        logger.error("Failed to login to Discord. Check DISCORD_BOT_TOKEN.")
    except Exception as e:
        logger.error(f"Discord bot error: {e}")


if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN or DISCORD_BOT_TOKEN in ("mock_discord_token", "your_discord_bot_token_here", ""):
        logger.error("DISCORD_BOT_TOKEN not set or is placeholder. Exiting.")
        exit(1)
        
    logger.info(f"Starting Discord listener (forwarding to {CREST_WEBHOOK_URL})...")
    asyncio.run(run_bot())

"""
CREST — Discord Channel Setup Script

Adds the 'discord' channel to the CREST database.
Run this once after deploying the Discord integration.

Usage:
    python scripts/setup_discord_channel.py
"""

import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.db import SessionLocal
from backend.models.complaint import Channel
from backend.utils.logger import get_logger

logger = get_logger("crest.setup.discord")


def setup_discord_channel():
    """Create Discord channel in database if it doesn't exist."""
    db = SessionLocal()
    
    try:
        # Check if discord channel already exists
        existing = db.query(Channel).filter(Channel.name == "discord").first()
        
        if existing:
            logger.info("✅ Discord channel already exists (id=%s)", existing.id)
            print(f"✅ Discord channel already exists (id={existing.id})")
            return True
        
        # Create new Discord channel
        discord_channel = Channel(
            name="discord",
            is_active=True
        )
        
        db.add(discord_channel)
        db.commit()
        
        logger.info("✅ Discord channel created successfully (id=%s)", discord_channel.id)
        print(f"✅ Discord channel created successfully (id={discord_channel.id})")
        
        return True
    
    except Exception as e:
        logger.error("❌ Failed to create Discord channel: %s", str(e), exc_info=True)
        print(f"❌ Failed to create Discord channel: {e}")
        db.rollback()
        return False
    
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("CREST Discord Channel Setup")
    print("="*60 + "\n")
    
    success = setup_discord_channel()
    
    if success:
        print("\n" + "="*60)
        print("Setup Complete!")
        print("="*60)
        print("\nYou can now:")
        print("1. Set DISCORD_BOT_TOKEN in Render environment")
        print("2. Set DISCORD_PUBLIC_KEY in Render environment")
        print("3. Deploy backend to Render")
        print("4. Run: python scripts/test_discord_integration.py")
        print("5. Send test DM to @CREST Support bot")
        sys.exit(0)
    else:
        print("\n❌ Setup failed. Check database connection.")
        sys.exit(1)

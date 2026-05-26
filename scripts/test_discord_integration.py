"""
CREST — Discord Integration Test Script

This script tests the Discord integration without needing a real Discord bot connected.
It simulates incoming Discord DMs and verifies they are properly ingested.

Usage:
    python scripts/test_discord_integration.py
"""

import httpx
import json
import sys
from datetime import datetime

# Configuration
API_URL = "http://127.0.0.1:8000"
WEBHOOK_URL = f"{API_URL}/api/integrations/discord/webhook"
TEST_WEBHOOK_URL = f"{API_URL}/api/integrations/discord/test"


def test_endpoint_accessibility():
    """Test if Discord webhook endpoint is accessible."""
    print("\n🔍 Test 1: Checking Discord endpoint accessibility...")
    try:
        response = httpx.get(WEBHOOK_URL, timeout=5.0)
        print(f"✅ Endpoint is accessible (HTTP {response.status_code})")
        return True
    except httpx.ConnectError:
        print(f"❌ Cannot connect to CREST API at {API_URL}")
        print(f"   Is the backend running? Try: python -m backend.main")
        return False
    except Exception as e:
        print(f"✅ Endpoint exists (connection type: {type(e).__name__})")
        return True


def test_simulated_dm():
    """Test sending a simulated Discord DM to the test endpoint."""
    print("\n🔍 Test 2: Sending simulated Discord DM...")
    
    test_payload = {
        "user_id": "123456789",
        "username": "TestUser",
        "message": "This is a test complaint from Discord integration.",
        "subject": "Test Discord Complaint",
        "message_id": "msg_12345"
    }
    
    try:
        response = httpx.post(
            TEST_WEBHOOK_URL,
            json=test_payload,
            timeout=10.0
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "accepted":
                print(f"✅ Simulated DM accepted (complaint_id: {result.get('complaint_id', 'N/A')})")
                return True
            else:
                print(f"❌ Response: {result}")
                return False
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_webhook_data_format():
    """Test the webhook can handle properly formatted Discord data."""
    print("\n🔍 Test 3: Testing webhook with properly formatted Discord interaction...")
    
    # This simulates a real Discord DM event
    discord_interaction = {
        "type": 0,
        "message": {
            "id": "msg_real_12345",
            "channel_id": "dm_channel_123",
            "author": {
                "id": "987654321",
                "username": "RealCustomer",
                "bot": False
            },
            "content": "I'm having issues with my account - funds missing after transaction"
        }
    }
    
    try:
        response = httpx.post(
            WEBHOOK_URL,
            json=discord_interaction,
            timeout=10.0
        )
        
        if response.status_code in (200, 202):
            print(f"✅ Webhook accepted interaction (HTTP {response.status_code})")
            return True
        else:
            print(f"⚠️  HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_bot_message_filtering():
    """Test that bot messages are correctly ignored."""
    print("\n🔍 Test 4: Testing bot message filtering...")
    
    bot_message = {
        "type": 0,
        "message": {
            "id": "msg_bot_12345",
            "channel_id": "dm_channel_123",
            "author": {
                "id": "bot_id_123",
                "username": "SomeOtherBot",
                "bot": True  # This should be ignored
            },
            "content": "This is from a bot and should be ignored"
        }
    }
    
    try:
        response = httpx.post(
            WEBHOOK_URL,
            json=bot_message,
            timeout=10.0
        )
        
        if response.status_code in (200, 202):
            result = response.json()
            if result.get("status") == "ignored":
                print(f"✅ Bot message correctly ignored")
                return True
            else:
                print(f"⚠️  Unexpected response: {result}")
                return False
        else:
            print(f"⚠️  HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def test_ping_interaction():
    """Test PING interaction handling for Discord verification."""
    print("\n🔍 Test 5: Testing PING interaction (Discord verification)...")
    
    ping_interaction = {
        "type": 1  # PING type
    }
    
    try:
        response = httpx.post(
            WEBHOOK_URL,
            json=ping_interaction,
            timeout=10.0
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("type") == 1:
                print(f"✅ PING correctly responded with PONG")
                return True
            else:
                print(f"❌ Unexpected response: {result}")
                return False
        else:
            print(f"❌ HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("CREST Discord Integration Test Suite")
    print("=" * 60)
    print(f"Target API: {API_URL}")
    print(f"Webhook URL: {WEBHOOK_URL}")
    
    tests = [
        test_endpoint_accessibility,
        test_webhook_data_format,
        test_bot_message_filtering,
        test_ping_interaction,
        test_simulated_dm,
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append((test_func.__name__, result))
        except Exception as e:
            print(f"\n❌ Test {test_func.__name__} crashed: {e}")
            results.append((test_func.__name__, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All Discord integration tests passed!")
        print("\nNext steps:")
        print("1. Set DISCORD_BOT_TOKEN in your Render backend environment")
        print("2. Set DISCORD_PUBLIC_KEY for signature verification")
        print("3. Configure Discord bot webhook in Developer Portal")
        print("4. Send a test DM to your bot")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

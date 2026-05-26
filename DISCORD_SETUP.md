# Discord Channel Integration - Setup Guide

This document provides a complete guide to integrating Discord with CREST for receiving and responding to customer complaints via Discord Direct Messages.

## What Was Added

### 1. **Backend Discord API Module** (`backend/api/discord.py`)
- Webhook endpoint: `POST /api/integrations/discord/webhook`
- Handles Discord interactions and DMs
- Verifies Discord signatures using Ed25519 cryptography
- Converts DMs to CREST complaints

### 2. **Discord Sender Module** (`integrations/discord/sender.py`)
- `send_discord_dm()` function to send replies back to customers
- Creates DM channels and sends messages using Discord Bot API
- Supports simulated mode for testing without real bot token

### 3. **Discord Listener (Optional)** (`integrations/discord/listener.py`)
- Optional gateway-based listener using discord.py
- Connects to Discord and forwards DMs to CREST webhook
- Can be run as a separate service in production

### 4. **Integration with Complaint Service** (`backend/services/complaint_service.py`)
- Added Discord support to `approve_draft()` function
- When a complaint is resolved, replies are sent to Discord DMs
- Audit trail tracks Discord message IDs

### 5. **Test Suite** (`scripts/test_discord_integration.py`)
- Comprehensive testing script
- Tests endpoint accessibility, message handling, bot filtering, etc.

## Quick Start

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

This includes `PyNaCl==1.5.0` for Discord signature verification.

### Step 2: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → Name it "CREST Support"
3. Go to **Bot** section → **Add Bot**
4. Under **TOKEN**, click **Copy** → Save as `DISCORD_BOT_TOKEN`
5. Go to **General Information** → Copy **PUBLIC KEY** → Save as `DISCORD_PUBLIC_KEY`

### Step 3: Configure Bot Permissions

1. Go to **OAuth2 → URL Generator**
2. Select scopes: `bot`
3. Select permissions:
   - `Send Messages`
   - `Read Messages/View Channels`
   - `Read Message History`
4. Copy generated URL and invite bot to your server

### Step 4: Set Environment Variables (Render)

Go to **Render Dashboard → crest-api → Environment**

Add these variables:

```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_PUBLIC_KEY=your_public_key_here
```

Then redeploy the backend.

### Step 5: Configure Webhook URL (Discord)

Option A: **HTTP Interactions (Recommended for beginners)**
1. In Discord Developer Portal → **Interactions Endpoint URL**
2. Enter: `https://your-render-domain.onrender.com/api/integrations/discord/webhook`
3. Discord will auto-verify this URL

Option B: **Gateway Bot Listener (Production)**
1. Deploy `integrations/discord/listener.py` as a separate service
2. Set same environment variables there
3. Bot will connect to Discord gateway and forward DMs

## Testing

### Local Testing (Without Real Bot)

```bash
python scripts/test_discord_integration.py
```

This runs 5 tests:
- ✅ Endpoint accessibility
- ✅ Webhook data format handling
- ✅ Bot message filtering
- ✅ PING interaction (Discord verification)
- ✅ Simulated DM ingestion

### Manual Testing with Real Bot

1. DM your bot from Discord: `@CREST Support Hello, I have a complaint`
2. Check Render logs: Should see webhook POST request
3. Check CREST dashboard: New complaint should appear in queue
4. Approve draft reply: Bot should send DM back to you

## How It Works

### Receiving Messages

```
Discord User → DM @bot → Discord API → CREST Webhook
                                           ↓
                                      Parse message
                                           ↓
                                   Create Complaint
                                           ↓
                                   Add to Queue
```

**Complaint fields:**
- `channel`: "discord"
- `customer_id`: Discord user ID (numeric)
- `customer_name`: Discord username
- `body`: Message content
- `external_ref`: Discord message ID

### Sending Replies

```
Dashboard User → Approve Draft → Complaint Service
                                        ↓
                              Check channel = "discord"
                                        ↓
                              send_discord_dm()
                                        ↓
                         Discord API → Create DM → Send Message
                                        ↓
                              Audit trail + notification
```

## API Endpoints

### POST `/api/integrations/discord/webhook`

Main webhook endpoint (receives Discord interactions).

**Headers (Discord auto-adds):**
```
X-Signature-Ed25519: signature
X-Signature-Timestamp: unix_timestamp
```

**Payload example:**
```json
{
  "type": 0,
  "message": {
    "id": "message_id_123",
    "channel_id": "dm_channel_id",
    "author": {
      "id": "user_id_123",
      "username": "customer_name",
      "bot": false
    },
    "content": "My complaint message"
  }
}
```

**Responses:**
- `200 OK` + `{"status": "accepted"}` → Message ingested
- `200 OK` + `{"status": "ignored"}` → Bot message or empty content
- `200 OK` + `{"type": 1}` → PING verification
- `401 Unauthorized` → Signature verification failed

### POST `/api/integrations/discord/test`

Testing endpoint (local only, no signature verification).

**Request:**
```json
{
  "user_id": "123456789",
  "username": "Test User",
  "message": "Test complaint text",
  "subject": "Test Subject"
}
```

## Troubleshooting

### 🔴 "Signature verification failed"

**Cause:** `DISCORD_PUBLIC_KEY` doesn't match
- Double-check: Developer Portal → General Information → PUBLIC KEY
- Ensure no extra spaces/quotes
- Try resetting the key and updating Render environment

### 🔴 "Bot not receiving DMs"

**Causes:**
1. Bot permissions missing → Re-invite with correct scopes
2. Webhook not configured → Set Interactions Endpoint URL in Developer Portal
3. Webhook verification failed → Check `DISCORD_PUBLIC_KEY` in Render
4. Render backend not running → Check service status

**Test:**
```bash
curl -X POST https://your-render-domain.onrender.com/api/integrations/discord/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

Should return: `{"type": 1}`

### 🔴 "Replies not sending"

**Causes:**
1. Invalid `DISCORD_BOT_TOKEN` → Regenerate and update
2. User blocked DMs → Ask user to enable DMs from server
3. User left server/blocked bot → Reconnect bot/user

**Check logs:**
- Render → crest-api → Logs
- Search for `Discord DM API Error`

### 🔴 "Testing with curl returns 404"

**Cause:** Discord router not registered in main.py
- Run: `grep -n "discord_router" backend/main.py`
- Should show import + include_router
- If missing, verify the edits were applied correctly

## File Structure

```
integrations/discord/
├── __init__.py           (empty, marks as package)
├── sender.py             (send_discord_dm function)
├── listener.py           (optional gateway listener)
└── README.md             (detailed integration docs)

backend/api/
└── discord.py            (webhook endpoint)

scripts/
└── test_discord_integration.py  (test suite)
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_PUBLIC_KEY` | Yes | Public key for signature verification |
| `CREST_API_URL` | No | Base URL of CREST API (for listener) |

## Production Checklist

- [ ] Discord bot created in Developer Portal
- [ ] Bot invited to server with correct permissions
- [ ] `DISCORD_BOT_TOKEN` set in Render environment
- [ ] `DISCORD_PUBLIC_KEY` set in Render environment
- [ ] Webhook URL configured in Discord Developer Portal
- [ ] Render backend deployed and running
- [ ] Signature verification passing (test with curl)
- [ ] Test DM sent and complaint created
- [ ] Draft reply approved and DM received
- [ ] Audit logs show message delivery

## Support

- Discord Bot Documentation: https://discord.com/developers/docs
- CREST Discord Integration: `integrations/discord/README.md`
- Test the integration: `python scripts/test_discord_integration.py`

## Next Steps

1. ✅ Create Discord bot (completed)
2. ✅ Configure environment variables (completed)
3. ✅ Deploy backend (deploy to Render)
4. ✅ Test webhook (run test script)
5. ✅ Send test DM (from Discord)
6. ✅ Verify complaint creation
7. ✅ Test reply sending

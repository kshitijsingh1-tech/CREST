# Discord Integration Setup

This document explains how to integrate Discord with CREST for receiving and responding to customer complaints via Discord Direct Messages.

## Architecture

The Discord integration works as follows:

1. **Webhook Listener** (`backend/api/discord.py`): Receives Discord interactions and DMs
2. **DM Sender** (`integrations/discord/sender.py`): Sends replies back to Discord users
3. **Complaint Ingestion**: Discord DMs are converted to complaints and added to the queue
4. **Auto-Reply**: Approved draft replies are sent back to the customer as Discord DMs

## Prerequisites

- Discord Server
- Discord Bot created in Discord Developer Portal
- Bot token and public key
- Python dependencies: `PyNaCl` (for signature verification)

## Setup Steps

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it (e.g., "CREST Support Bot")
4. Go to **Bot** section → Click **Add Bot**
5. Copy the **TOKEN** (this is your `DISCORD_BOT_TOKEN`)
6. Go to **General Information** and copy **PUBLIC KEY** (this is your `DISCORD_PUBLIC_KEY`)

### 2. Configure Bot Permissions

In **OAuth2 → URL Generator**:
- Select scopes: `bot`
- Select permissions:
  - `Read Messages/View Channels`
  - `Send Messages`
  - `Read Message History`

Copy the generated invite URL and invite the bot to your Discord server.

### 3. Set Environment Variables

Add to your Render backend or `.env`:

```env
DISCORD_BOT_TOKEN=<your-bot-token>
DISCORD_PUBLIC_KEY=<your-public-key>
```

### 4. Configure Webhook URL

Currently, Discord uses gateway events (not webhooks). The system is designed to:

**Option A: Use Discord Bot Gateway (Recommended)**
- Deploy a Discord bot listener that connects to the gateway
- Receives `MESSAGE_CREATE` events
- Forwards to `/api/integrations/discord/webhook`

**Option B: Use HTTP Interactions**
- Configure in Discord Developer Portal → Interactions Endpoint URL
- Set to: `https://your-render-domain.onrender.com/api/integrations/discord/webhook`
- Discord will verify this endpoint automatically

### 5. Install Dependencies

```bash
pip install PyNaCl
```

## API Endpoints

### POST `/api/integrations/discord/webhook`

Handles incoming Discord interactions and DMs.

**Discord verification:**
- Discord sends `X-Signature-Ed25519` header with request signature
- Signature is verified using the `DISCORD_PUBLIC_KEY`

**Payload structure:**
```json
{
  "type": 0,
  "message": {
    "id": "123456789",
    "channel_id": "987654321",
    "author": {
      "id": "111111111",
      "username": "customer_name"
    },
    "content": "I have a complaint about..."
  }
}
```

### POST `/api/integrations/discord/test`

Testing endpoint for local development (simulates Discord DM).

**Request:**
```json
{
  "user_id": "123456789",
  "username": "John Doe",
  "message": "Test complaint message",
  "subject": "Complaint subject"
}
```

## How It Works

### Receiving Messages

1. Customer sends DM to the bot
2. Discord sends interaction to webhook endpoint
3. System verifies signature using `DISCORD_PUBLIC_KEY`
4. Extracts message content and user ID
5. Creates complaint with:
   - `channel`: "discord"
   - `customer_id`: User Discord ID
   - `customer_name`: Discord username
   - `body`: Message content
   - `external_ref`: Discord message ID

### Sending Replies

When a complaint is resolved and draft is approved:

1. System checks complaint channel: "discord"
2. Calls `send_discord_dm(user_id, reply_text)`
3. Creates DM channel with the user (if not exists)
4. Sends the reply message
5. Logs message ID for audit trail

## Testing Locally

### Simulate Incoming DM

```bash
curl -X POST http://localhost:8000/api/integrations/discord/test \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123456789",
    "username": "Test User",
    "message": "This is a test complaint",
    "subject": "Test Complaint"
  }'
```

### Verify Endpoint Accessibility

```bash
curl https://your-render-domain.onrender.com/api/integrations/discord/webhook
```

Should return 200 OK (not authenticated, but endpoint exists).

## Troubleshooting

**Signature Verification Failed**
- Check `DISCORD_PUBLIC_KEY` is exactly as shown in Developer Portal
- Ensure request body is not modified before verification

**Bot Not Receiving DMs**
- Verify bot has `Read Messages` and `Send Messages` permissions
- Check bot is in the same server as the user
- Ensure bot role is not below user role in hierarchy

**Replies Not Being Sent**
- Verify `DISCORD_BOT_TOKEN` is valid
- Check user still has DM enabled
- Review logs for API errors

## Limitations

- Discord DMs are only sent to users who have sent a message to the bot
- Bot cannot send DMs to users who have blocked it
- 10-second timeout on message delivery
- Rate limited by Discord API (60 requests per minute per user)

## References

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord API Documentation](https://discord.com/developers/docs)
- [Discord Bot Interactions](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [PyNaCl Documentation](https://pynacl.readthedocs.io/)

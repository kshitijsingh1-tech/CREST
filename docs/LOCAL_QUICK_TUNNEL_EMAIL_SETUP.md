# Local Quick Tunnel and Inbound Email Setup

This project is set up for a local public-preview flow:
- FastAPI stays private on `127.0.0.1:8000`
- Next.js runs on `127.0.0.1:3000`
- Cloudflare quick tunnel exposes only the Next.js frontend
- Inbound email polling reads unseen mail from `INBOX`

## Before you start

1. Fill in `.env`.
2. For Gmail, enable IMAP and create an app password.
3. Keep `CREST_DEV_MOCK=1` if you want the local direct-ingest path.
4. Do not expose the backend directly.

Recommended `.env` values for Gmail:

```env
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=your-inbox@gmail.com
EMAIL_IMAP_PASSWORD=your-app-password
EMAIL_POLL_INTERVAL_SECS=60
```

## Build the frontend once

```powershell
cd frontend\nextjs-app
npm.cmd run build
```

## Start the local stack

Open separate terminals and run these in order.

### 1. API

```powershell
scripts\start_api.cmd
```

The backend stays on `127.0.0.1:8000` and is only meant to be reached through the frontend proxy.

### 2. Frontend

```powershell
scripts\start_frontend.cmd
```

The frontend serves on port `3000` and proxies `/api`, `/health`, `/socket.io`, and `/webhooks/whatsapp` to the backend.

### 3. Inbound email listener

```powershell
scripts\start_email_listener.cmd
```

Behavior:
- polls `INBOX` for `UNSEEN` messages
- ingests each qualifying email as a complaint
- marks processed messages as `Seen`
- treats follow-up replies as new inbound complaints

Do not start this against a mailbox that has unread mail you do not want CREST to ingest.

### 4. Cloudflare quick tunnel

```powershell
scripts\start_cloudflare_tunnel.cmd
```

Share only the generated Cloudflare URL. Do not share `http://127.0.0.1:8000`.

## What is and is not supported

Supported:
- public dashboard access through Cloudflare quick tunnel
- inbound email complaint ingestion from your mailbox
- user follow-up emails appearing as additional inbound complaints

Not supported yet:
- sending customer email replies from CREST
- mapping reply threads back to an existing complaint automatically
- exposing the FastAPI backend as a public origin

## Quick verification

1. Open the Cloudflare URL and confirm the dashboard loads.
2. Confirm queue and analytics data appear through the frontend proxy.
3. Confirm the complaint detail page opens.
4. Send a test email from a second account to your configured inbox.
5. Watch the email-listener terminal for processing logs.
6. Refresh the dashboard and confirm the new complaint appears.
## If port 3000 is busy

Set `PORT` before starting the frontend and tunnel:

```powershell
$env:PORT = 3200
scripts\start_frontend.cmd
scripts\start_cloudflare_tunnel.cmd
```

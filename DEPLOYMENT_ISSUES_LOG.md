# CREST — Production Deployment Issues Log
# All problems encountered deploying to Render (Free Tier)

---

## Issue 1: Next.js Docker Build Context Mismatch
**Symptom:** Build crashed — `package.json` not found  
**Cause:** `dockerContext: .` (root) used instead of `frontend/nextjs-app`  
**Fix:** Set `dockerContext: frontend/nextjs-app` in `render.yaml`

---

## Issue 2: Render Free Tier — Background Worker Not Allowed
**Symptom:** Blueprint validation failed — `service type not available for this plan`  
**Cause:** `type: worker` (Celery) requires a paid plan  
**Fix:** Removed worker block; set `CREST_USE_DIRECT_INGEST=1` to run ingestion synchronously inside FastAPI

---

## Issue 3: Render Free Tier — Only 1 Free DB + 1 Free Redis Allowed
**Symptom:** Blueprint failed — `cannot have more than one active free tier database`  
**Cause:** `render.yaml` tried to provision new DB/Redis when one already existed  
**Fix:** Removed `databases:` and Redis blocks from `render.yaml`; linked manually via `sync: false` env vars

---

## Issue 4: Missing Python Auth Packages at Runtime
**Symptom:** Backend crashed on startup — `ModuleNotFoundError: No module named 'jose'`  
**Cause:** `python-jose`, `passlib`, `bcrypt` missing from `requirements.txt`  
**Fix:** Added `python-jose[cryptography]==3.3.0`, `passlib[bcrypt]==1.7.4`, `bcrypt==4.1.3` to `requirements.txt`

---

## Issue 5: pgvector Extension Not Enabled in Postgres
**Symptom:** Backend crashed — `type "vector" does not exist`  
**Cause:** Render PostgreSQL doesn't enable pgvector by default  
**Fix:** Added `CREATE EXTENSION IF NOT EXISTS vector;` in `backend/utils/init_db.py` inside an `engine.begin()` block before `create_all()`

---

## Issue 6: Next.js Frontend — 502 Bad Gateway
**Symptom:** `https://crest-ui-0uc4.onrender.com` returned 502  
**Cause 1:** Next.js standalone binds to `127.0.0.1` (loopback), not accessible to Render's proxy  
**Cause 2:** Render injects `PORT=10000` but Dockerfile exposes `3000` → port mismatch  
**Fix:** Added `HOSTNAME=0.0.0.0` and `PORT=3000` to crest-ui envVars in `render.yaml`

---

## Issue 7: Login Failing — Frontend Calling `localhost:8000` in Production
**Symptom:** Login showed "Invalid credentials"; network tab showed requests to `localhost:8000`  
**Cause:** `NEXT_PUBLIC_API_URL` mapped via `fromService: property: host` which injects Render's **private** internal hostname — unreachable from user browsers  
**Fix:** Changed to explicit public URL: `NEXT_PUBLIC_API_URL: https://crest-api-0uc4.onrender.com`

---

## Issue 8: CORS Block — Browser Refusing Cross-Origin Requests
**Symptom:** Login still failing; browser console showed CORS preflight blocked  
**Cause:** Backend's default `CORS_ORIGINS` only whitelisted `localhost:3000`, rejecting the deployed frontend origin  
**Fix:** Added `CORS_ORIGINS: https://crest-ui-0uc4.onrender.com` to crest-api envVars in `render.yaml`

---

## Issue 9: CORS Wildcard Incompatible with Credentialed Requests
**Symptom:** Even with `CORS_ALLOW_ALL=1`, browser still blocked requests  
**Cause:** Browsers forbid `Access-Control-Allow-Origin: *` when `credentials: include` is used (strict spec)  
**Fix:** Replaced wildcard with exact origin whitelist via `CORS_ORIGINS`

---

## Issue 10: `allow_credentials` Inverted Logic in `backend/main.py`
**Symptom:** Login returned 401/error despite correct credentials  
**Cause:** Code had `allow_credentials=not ALLOW_ALL_ORIGINS` — when `CORS_ALLOW_ALL=1`, `allow_credentials` was set to `False`, blocking cookies/tokens  
**Fix:** Changed to `allow_credentials=True` unconditionally in `CORSMiddleware` setup

---

## Issue 11: crest-api Port Scan Timeout
**Symptom:** Backend deployed but Render couldn't reach it — "No open ports detected"  
**Cause:** Render's load balancer probes port `10000` by default; FastAPI was on port `8000`  
**Fix:** Added `PORT: "8000"` to crest-api envVars in `render.yaml` so Render knows which port to probe

---

## Issue 12: Render Dashboard `CORS_ALLOW_ALL=1` Overriding `render.yaml`
**Symptom:** Server logs showed `CORS_ALLOW_ALL is enabled` even after removing it from `render.yaml`  
**Cause:** Env vars set manually in Render's Dashboard **always override** blueprint/`render.yaml` values  
**Fix:** Manually deleted the `CORS_ALLOW_ALL` variable in Render Dashboard; set `CORS_ALLOW_ALL: "0"` in `render.yaml` to force it off

---

## Issue 13: Next.js Rewrites — Build-Time Env Var Baking
**Symptom:** Proxy rewrites in `next.config.js` still routing to `http://localhost:8000` in production  
**Cause:** `next.config.js` rewrites are compiled at **Docker build time** — Render doesn't inject env vars during build, so `process.env.NEXT_PUBLIC_API_URL` was `undefined`, and fallback `"http://localhost:8000"` was hardcoded permanently into the bundle  
**Fix:** Changed the fallback in `next.config.js` from `"http://localhost:8000"` to `"https://crest-api-0uc4.onrender.com"` so even without the env var, the proxy routes correctly

---

## Issue 14: Server-Side Components Failing — Connection Error on Dashboard Pages
**Symptom:** Login succeeds and redirects to `/ub_CREST/home` but shows "CONNECTION ERROR — Unable to retrieve data"  
**Cause:** Server Components (Home, Analytics, Queue, Management) fetch data server-side from inside the Next.js Docker container. The container did not have `NEXT_PUBLIC_API_URL` set, so `getBaseUrl()` returned `""` (relative), which resolves to `localhost` inside the container rather than the real backend  
**Fix:** Add `NEXT_PUBLIC_API_URL=https://crest-api-0uc4.onrender.com` directly in the **Render Dashboard** under the `crest-ui` service → Environment tab (must be set there so it's available at container runtime)

---

## Issue 15: Admin Account Not Seeded in Production Database
**Symptom:** Login page showed "Invalid administrative credentials" even with correct default credentials  
**Cause:** The app was connected to a **pre-existing** Render PostgreSQL database (not a fresh one), so the default admin seeder was skipped. The admin account `admin@unionbank.com` didn't exist  
**Fix:** Created `create_admin.py` utility script. Updated local `.env` `CREST_DB_URL` to point to the Render production DB, then ran: `.\.venv\Scripts\python -c "..."` to directly insert the admin record into the live database

---

## Issue 16: `create_admin.py` Failed — Wrong Python Used
**Symptom:** `python create_admin.py` → `ModuleNotFoundError: No module named 'psycopg2'`  
**Cause:** Terminal was using global system Python (`C:\Python314`) instead of the venv where all deps are installed  
**Fix:** Run with venv Python: `.\.venv\Scripts\python create_admin.py`

---

## Issue 17: Mock Store Still Imported After Removal
**Symptom:** `analytics.py` and `complaints.py` had dead imports from `backend/mock_store.py` which would crash on import  
**Cause:** `mock_store.py` was deleted but import statements remained in the API files  
**Fix:** Removed all `from backend.mock_store import (...)` blocks and `DEV_MOCK` conditional branches from `analytics.py` and `complaints.py`

---

## Summary of Key Lessons

| # | Area | Lesson |
|---|------|--------|
| 1 | Docker | Always set `dockerContext` explicitly to the subdirectory containing `package.json` |
| 2 | Render Free | No background workers, max 1 free DB, max 1 free Redis |
| 3 | Next.js | `NEXT_PUBLIC_*` vars baked at BUILD time, not runtime — hardcode production defaults |
| 4 | Next.js Rewrites | `next.config.js` destination URLs compiled at build time — hardcode or use build args |
| 5 | CORS | `credentials: include` + wildcard `*` = browser blocks it. Must use exact origin |
| 6 | Render Env Vars | Dashboard manual vars ALWAYS override `render.yaml` blueprint vars |
| 7 | Render Ports | Docker services must expose the port Render probes. Set `PORT` env var to match |
| 8 | DB Seeding | Pre-existing DBs skip seeders — always manually seed initial admin accounts |
| 9 | pgvector | Must `CREATE EXTENSION IF NOT EXISTS vector;` before SQLAlchemy creates tables |
| 10 | Server Components | Server-side fetches inside Next.js container need `NEXT_PUBLIC_API_URL` set at RUNTIME in Render Dashboard, not just in `render.yaml` |

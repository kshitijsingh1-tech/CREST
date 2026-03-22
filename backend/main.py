"""
CREST — FastAPI Application Entry Point
Mounts all routers, configures CORS, Socket.IO, and startup events.
"""

import os
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.complaints import router as complaints_router
from backend.api.analytics  import router as analytics_router
from backend.utils.logger   import get_logger

logger = get_logger("crest.main")

# ── Socket.IO for real-time dashboard updates ────────────────
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

@sio.event
async def connect(sid, environ):
    logger.info(f"Dashboard client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Dashboard client disconnected: {sid}")


# ── Lifespan (startup / shutdown) ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CREST API starting up")
    # Warm-up: verify DB connection
    from backend.utils.db import engine
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("Database connection verified")
    yield
    logger.info("CREST API shutting down")


# ── FastAPI app ──────────────────────────────────────────────
app = FastAPI(
    title       = "CREST API",
    description = "Complaint Resolution & Escalation Smart Technology — Union Bank of India",
    version     = "1.0.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(complaints_router)
app.include_router(analytics_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "CREST API"}


# ── Mount Socket.IO alongside FastAPI ─────────────────────────
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


# ── Helper called by Celery workers to push live updates ─────
async def broadcast_queue_update(data: dict):
    """Push priority queue refresh to all connected dashboard clients."""
    await sio.emit("queue_updated", data)


async def broadcast_new_complaint(complaint_id: str, severity: int, category: str):
    """Notify dashboard of a newly ingested complaint."""
    await sio.emit("new_complaint", {
        "id":       complaint_id,
        "severity": severity,
        "category": category,
    })

import os
import sys

# Globally enforce UTF-8 encoding on standard streams to prevent Windows console encoding crashes
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.utils.db import get_db_optional

from backend.api.analytics import router as analytics_router  # type: ignore
from backend.api.complaints import router as complaints_router  # type: ignore
from backend.api.insights import router as insights_router  # type: ignore
from backend.api.users import router as users_router  # type: ignore
from backend.api.auth import router as auth_router  # type: ignore
from backend.utils.logger import get_logger  # type: ignore
from backend.utils.runtime import DEV_MOCK, is_truthy  # type: ignore
from integrations.whatsapp.webhook import router as whatsapp_webhook_router, legacy_router as whatsapp_legacy_router  # type: ignore
from backend.api.sms import router as sms_router # type: ignore
from backend.api.instagram import router as instagram_router # type: ignore
from backend.api.discord import router as discord_router # type: ignore
from backend.api.telegram import router as telegram_router # type: ignore
from backend.api.public import router as public_router # type: ignore

logger = get_logger("crest.main")


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


ALLOW_ALL_ORIGINS = is_truthy(os.getenv("CORS_ALLOW_ALL", "0"))
cors_origins = _parse_origins(os.getenv("CORS_ORIGINS"))
http_cors_origins = ["*"] if ALLOW_ALL_ORIGINS else cors_origins
socket_cors_origins: list[str] | str = "*" if ALLOW_ALL_ORIGINS else cors_origins

if ALLOW_ALL_ORIGINS:
    logger.warning("CORS_ALLOW_ALL is enabled; allowing all HTTP and Socket.IO origins")

from backend.utils.socket import sio


@sio.event
async def connect(sid, environ):
    logger.info(f"Dashboard client connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Dashboard client disconnected: {sid}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CREST API starting up")
    if DEV_MOCK:
        logger.info("CREST_DEV_MOCK enabled, skipping database startup check")
    else:
        from backend.utils.db import engine
        from backend.utils.init_db import initialize_database
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            try:
                # Set lock_timeout to 5000ms (5s) to prevent startup migrations from hanging on table locks
                conn.execute(text("SET lock_timeout = 5000"))
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50)"))
                conn.commit()
            except Exception as e:
                logger.warning(f"Startup ALTER TABLE skipped or failed (likely already exists or locked): {e}")
        
        initialize_database()
        logger.info("Database connection verified and schema initialized")
        
        # Start Email IMAP Listener in a self-healing background daemon thread
        try:
            import threading
            from integrations.email.listener import run_listener
            
            listener_thread = threading.Thread(target=run_listener, daemon=True)
            listener_thread.start()
            logger.info("CREST Email IMAP listener thread started successfully")
        except Exception as th_err:
            logger.error(f"Failed to start background Email IMAP listener: {th_err}")
            
        # Start Discord Gateway Listener in a background asyncio task
        try:
            import asyncio
            from integrations.discord.listener import run_bot
            
            asyncio.create_task(run_bot())
            logger.info("CREST Discord gateway listener task started successfully")
        except Exception as disc_err:
            logger.error(f"Failed to start background Discord gateway listener: {disc_err}")

        # Pre-warm SBERT embedding model in background thread
        try:
            from ai.embeddings.embedder import warm_model
            warm_model()
        except Exception as warm_err:
            logger.error(f"Failed to pre-warm SBERT embedding model: {warm_err}")
    yield
    logger.info("CREST API shutting down")


app = FastAPI(
    title="CREST API",
    description="Complaint Resolution and Escalation Smart Technology - Union Bank of India",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=http_cors_origins,
    allow_credentials=True,  # Always enable credentials; wildcard origins are controlled via CORS_ALLOW_ALL / CORS_ORIGINS
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(whatsapp_webhook_router)
app.include_router(whatsapp_legacy_router)
app.include_router(sms_router)
app.include_router(instagram_router)
app.include_router(discord_router)
app.include_router(telegram_router)
app.include_router(public_router)
app.include_router(users_router)
app.include_router(auth_router)


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "CREST API",
        "dependencies": {
            "database": "unchecked",
            "ai_mode": "mock" if DEV_MOCK else "live",
        },
    }


@app.get("/api/health/dependencies")
def health_dependencies(db=Depends(get_db_optional)):
    health_status = {
        "status": "healthy",
        "service": "CREST API",
        "dependencies": {
            "database": "down",
            "ai_mode": "mock" if DEV_MOCK else "live",
        },
    }

    try:
        if db:
            from sqlalchemy import text

            db.execute(text("SELECT 1"))
            health_status["dependencies"]["database"] = "up"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["dependencies"]["database"] = f"error: {str(e)}"

    return health_status


import socketio  # type: ignore
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

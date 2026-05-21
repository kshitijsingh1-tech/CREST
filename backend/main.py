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
from integrations.whatsapp.webhook import router as whatsapp_webhook_router  # type: ignore
from backend.api.sms import router as sms_router # type: ignore
from backend.api.twitter import router as twitter_router # type: ignore
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

        initialize_database()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified and schema initialized")
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
    allow_credentials=not ALLOW_ALL_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(whatsapp_webhook_router)
app.include_router(sms_router)
app.include_router(twitter_router)
app.include_router(public_router)
app.include_router(users_router)
app.include_router(auth_router)


@app.get("/api/health")
def health(db=Depends(get_db_optional)):
    health_status = {
        "status": "healthy",
        "service": "CREST API",
        "dependencies": {
            "database": "down",
            "ai_mode": "mock" if DEV_MOCK else "live"
        }
    }
    
    # 1. Check Database
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
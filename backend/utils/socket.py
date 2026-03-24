import os
import socketio

from backend.utils.runtime import is_truthy

ALLOW_ALL_ORIGINS = is_truthy(os.getenv("CORS_ALLOW_ALL", "0"))

def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]

cors_origins = _parse_origins(os.getenv("CORS_ORIGINS"))
socket_cors_origins = "*" if ALLOW_ALL_ORIGINS else cors_origins

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=socket_cors_origins)

async def broadcast_queue_update(data: dict = None):
    if data is None:
        data = {"action": "refresh"}
    await sio.emit("queue_updated", data)

async def broadcast_new_complaint(complaint_id: str, severity: int, category: str):
    await sio.emit(
        "new_complaint",
        {
            "id": complaint_id,
            "severity": severity,
            "category": category,
        },
    )

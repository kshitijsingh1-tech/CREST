import os
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.api.complaints import ingest_complaint_logic

router = APIRouter(prefix="/api/integrations/sms", tags=["integrations"])

SMS_WEBHOOK_KEY = os.getenv("SMS_WEBHOOK_KEY", "crest_sms_demo_key_2024")

class SMSPayload(BaseModel):
    from_number: str
    text: str
    msg_id: str

@router.post("/webhook")
async def sms_webhook(
    payload: SMSPayload, 
    x_api_key: str = Header(None),
    db: Session = Depends(get_db_optional)
):
    """
    Simulated SMS Webhook.
    Supports Kafka pipeline with local fallback for stability.
    """
    if x_api_key != SMS_WEBHOOK_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    complaint_data = {
        "channel": "sms",
        "customer_id": payload.from_number,
        "body": payload.text,
        "subject": f"SMS from {payload.from_number}",
        "external_ref": payload.msg_id
    }

    # 1. Attempt Kafka Pipeline (The "Scale" Way)
    try:
        from integrations.kafka.producer import publish
        publish(**complaint_data)
        return {"status": "queued", "method": "kafka"}
    except Exception as k_err:
        # 2. Fallback to Direct Ingest (The "Safe" Way)
        try:
            result = await ingest_complaint_logic(complaint_data, db)
            return {"status": "accepted", "method": "direct", "complaint_id": result.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

import uuid
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.utils.db import get_db_optional
from backend.models.complaint import Complaint

router = APIRouter(prefix="/api/public", tags=["public"])

class SendOtpRequest(BaseModel):
    reference_token: str
    contact: str  # email or mobile

class TrackRequest(BaseModel):
    reference_token: str
    contact: str
    otp: str

class PublicActionRequest(BaseModel):
    reference_token: str
    action_type: str  # 'withdraw', 'appeal', 'upload'
    data: Optional[dict[str, Any]] = None

def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "Unknown"
    parts = email.split("@")
    if len(parts[0]) <= 2:
        return email
    return f"{parts[0][0]}****@{parts[1]}"

@router.post("/send-otp")
def send_public_otp(req: SendOtpRequest, db: Session = Depends(get_db_optional)):
    try:
        complaint_id = uuid.UUID(req.reference_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Reference Token format")

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # In a real system, verify if req.contact matches complaint.customer_id
    # For demo purposes, we will assume it matches and return a fixed mock OTP
    
    return {
        "status": "success", 
        "message": "OTP sent to registered contact",
        "demo_otp": "123456"  # Mock OTP for hackathon demo
    }

@router.post("/track")
def track_complaint(req: TrackRequest, db: Session = Depends(get_db_optional)):
    if req.otp != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP")

    try:
        complaint_id = uuid.UUID(req.reference_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Reference Token")

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Data Masking
    assignee_name = "Not Assigned"
    if complaint.assigned_employee_id:
        assignee_name = "Assigned Support Officer" # Masked agent name
        
    masked_contact = _mask_email(complaint.customer_id)

    return {
        "id": str(complaint.id),
        "status": complaint.status,
        "created_at": complaint.created_at,
        "resolved_at": complaint.resolved_at,
        "subject": complaint.subject,
        "category": complaint.category,
        "masked_contact": masked_contact,
        "assignee_masked": assignee_name,
        "priority_score": complaint.priority_score,
        "resolution_note": complaint.resolution_note,
        # Timeline stages helper boolean
        "timeline": {
            "received": True,
            "prioritized": bool(complaint.category),
            "assigned": bool(complaint.assigned_employee_id),
            "resolved": complaint.status == "resolved",
            "escalated": complaint.is_escalated,
            "withdrawn": complaint.status == "withdrawn"
        }
    }

@router.post("/action")
def submit_public_action(req: PublicActionRequest, db: Session = Depends(get_db_optional)):
    try:
        complaint_id = uuid.UUID(req.reference_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Reference Token")

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if req.action_type == "withdraw":
        if complaint.status != "open":
            raise HTTPException(status_code=400, detail="Only open complaints can be withdrawn.")
        complaint.status = "withdrawn"
        db.commit()
        return {"status": "success", "message": "Complaint withdrawn successfully"}

    elif req.action_type == "appeal":
        if complaint.status != "resolved":
            raise HTTPException(status_code=400, detail="Only resolved complaints can be appealed.")
        complaint.status = "open"
        complaint.is_escalated = True
        db.commit()
        return {"status": "success", "message": "Appeal submitted successfully. Case reopened and escalated."}

    elif req.action_type == "upload":
        # Mock upload success
        return {"status": "success", "message": "Documents uploaded successfully."}

    raise HTTPException(status_code=400, detail="Invalid action type")

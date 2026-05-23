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


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/chat")
def public_chat(req: ChatRequest, db: Session = Depends(get_db_optional)):
    """
    RAG-enabled Public Citizen Support Assistant.
    Provides banking support, policy reference details, and auto-helps summary generation.
    """
    from ai.providers.groq import create_chat_completion, get_model, has_api_key
    from ai.rag.retriever import retrieve_resolutions
    from ai.embeddings.embedder import embed
    from ai.rag.knowledge_base import search_document_chunks
    
    # 1. Extract the latest user message
    if not req.messages:
        raise HTTPException(status_code=400, detail="Empty messages list")
    
    user_query = req.messages[-1].content
    
    # 2. Get embeddings and query local RAG for contextual grounding
    document_excerpts = []
    past_cases = []
    try:
        query_vector = embed(user_query)
        if query_vector:
            document_excerpts = search_document_chunks(
                query=user_query,
                embedding=query_vector,
                top_k=2,
                min_relevance=0.45
            )
            past_cases = retrieve_resolutions(
                embedding=query_vector,
                top_k=2,
                query=user_query
            )
    except Exception:
        # Fallback gracefully
        pass

    # 3. Format RAG Context
    context_str = ""
    if document_excerpts:
        context_str += "\nBANK POLICY EXCERPTS:\n"
        for chunk in document_excerpts:
            context_str += f"- Policy: {chunk['document_title']} (Page {chunk['page_number']}): {chunk['content']}\n"
    if past_cases:
        context_str += "\nPAST SIMILAR CASES:\n"
        for case in past_cases:
            context_str += f"- Problem: {case['problem_desc']} -> Resolution: {case['resolution_text']}\n"
            
    # 4. Construct System Prompt
    system_prompt = (
        "You are 'Cresty', the official Union Bank of India Citizen Support AI Assistant.\n"
        "Your mission is to provide helpful, warm, empathetic, and clear answers to customer inquiries.\n\n"
        "GUIDELINES:\n"
        "- Ground your answers strictly on the provided Bank Policy Excerpts and Past Cases if relevant. If no context is available, use general, professional banking knowledge.\n"
        "- Do not make up false transaction status or specific account balances. If they ask about a ticket status, tell them they can use the tracking gateway on our portal.\n"
        "- If a citizen wants to lodge a complaint, guide them to click 'Lodge New Grievance' or assist them in summarizing their issue so they can easily paste it.\n"
        "- Keep responses concise and easy to read (use bullet points where appropriate).\n"
        "- End with a helpful, positive closing statement.\n"
    )
    
    if context_str:
        system_prompt += f"\nGROUNDING CONTEXT:\n{context_str}"

    # 5. Format prompt messages for Groq
    messages_payload = [{"role": "system", "content": system_prompt}]
    for m in req.messages[-6:]: # Keep last 6 turns to manage window
        messages_payload.append({"role": m.role, "content": m.content})
        
    # 6. Query LLM
    try:
        if has_api_key():
            model = get_model("GROQ_DRAFT_MODEL", "llama-3.3-70b-versatile")
            reply = create_chat_completion(
                messages=messages_payload,
                model=model,
                max_tokens=600,
                temperature=0.4
            )
        else:
            reply = "Hello! I am Cresty, your Union Bank support assistant. Currently, my generative model is offline, but you can lodge a new complaint or track your status using the options on this portal. Let me know how I can help!"
    except Exception:
        reply = "I apologize, but I am experiencing some difficulties processing your request right now. You can safely lodge your complaint or track your status using our official portal links!"

    return {"reply": reply}

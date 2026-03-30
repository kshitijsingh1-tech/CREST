import os
import httpx
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DB_URL = os.getenv('CREST_DB_URL')
API_URL = 'http://localhost:8000/api/complaints/ingest'

def test_rag_flow():
    print("Testing RAG-grounded draft reply...")
    
    payload = {
        "channel": "email",
        "customer_id": "rag-verify-77@test.com",
        "customer_name": "Verified User",
        "body": "I want to lodge a complaint about my account being frozen. What is the process for online grievance redressal?",
        "subject": "Grievance Process Query"
    }
    
    try:
        # 1. Ingest via API (Synchronous path)
        print("Sending ingestion request...")
        resp = httpx.post(API_URL, json=payload, timeout=60)
        if resp.status_code != 201:
            print(f"FAILED: Ingest returned {resp.status_code}")
            print(resp.text)
            return

        data = resp.json()
        complaint_id = data.get("complaint_id")
        print(f"SUCCESS: Complaint {complaint_id} created.")
        
        # 2. Fetch the draft from DB
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            query = text("SELECT draft_reply, category, subject FROM complaints WHERE id = :cid")
            result = conn.execute(query, {"cid": complaint_id})
            row = result.fetchone()
            
            if row:
                draft = row.draft_reply
                print("\n" + "="*50)
                print("--- GENERATED DRAFT REPLY ---")
                print(f"Subject: {row.subject}")
                print(f"Category: {row.category}")
                print("-" * 50)
                print(draft)
                print("="*50 + "\n")
                
                # Check for RAG grounding keywords (from the PDFs)
                if "Union Bank" in draft or "online grievance" in (draft or "").lower():
                    print("VERIFICATION: Draft seems grounded in PDF content.")
                else:
                    print("WARNING: Draft might be generic. Check RAG retriever logs.")
            else:
                print("FAILED: Could not find complaint in DB.")
                
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_rag_flow()

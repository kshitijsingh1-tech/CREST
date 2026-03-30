import os, uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine
from backend.models.complaint import Complaint
from backend.services.complaint_service import ingest_complaint
from backend.utils.db import SessionLocal
from dotenv import load_dotenv

load_dotenv()

def debug_ingest():
    print("Debugging ingest_complaint ORM mapping...")
    db = SessionLocal()
    try:
        # Mocking values
        complaint = ingest_complaint(
            db             = db,
            channel_name   = "email",
            customer_id    = "debug@test.com",
            body           = "Test body",
            embedding      = [0.1] * 768,
            draft_reply    = "Test draft",
            # missing draft_metadata in ingest_complaint args?
        )
        print(f"SUCCESS: Ingested ID {complaint.id}")
        print(f"Metadata: {complaint.draft_metadata}")
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_ingest()

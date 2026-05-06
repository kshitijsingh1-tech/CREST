import os
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from backend.models.complaint import Complaint
from backend.models.knowledge import SpikeSignal
from backend.services.spike_service import detect_category_spikes

load_dotenv()
DB_URL = os.getenv('CREST_DB_URL')
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)

def test_rca_logic():
    print("--- TESTING AUTOMATED RCA LOGIC ---")
    db = SessionLocal()
    
    # 1. Create a "Micro-Spike" for UPI
    # We need > MIN_THRESHOLD (5) complaints in 1h
    # All mentioning 'GPay' and '503 service unavailable'
    
    print("Injecting 6 patterned complaints into 'UPI' category...")
    now = datetime.now(timezone.utc)
    
    for i in range(6):
        c = Complaint(
            id=uuid.uuid4(),
            channel_id=1, # assuming General exists
            customer_id=f"CUST_RCA_{i}",
            customer_name=f"User {i}",
            subject="UPI Failure",
            body=f"My transaction failed on GPay. It shows 503 service unavailable error. Fix this UPI issue. Ref: {i}",
            category="UPI",
            severity="high",
            priority_score=0.8,
            status="open",
            is_duplicate=False,
            created_at=now - timedelta(minutes=5),
            sla_deadline=now + timedelta(hours=4)
        )
        db.add(c)
    
    db.commit()
    
    print("Triggering spike detection with RCA...")
    signals = detect_category_spikes(db)
    
    if not signals:
        print("FAILED: No spike detected.")
        return

    for sig in signals:
        print(f"\nSPIKE SIGNAL GENERATED:")
        print(f"Type: {sig.signal_type}")
        print(f"Surge: {sig.predicted_surge_pct}%")
        print(f"RCA Insight: {sig.rca_insight}")
        print(f"Common Factors: {sig.common_factors}")
        
        if sig.rca_insight and "GPay" in sig.rca_insight:
            print("\nSUCCESS: RCA Agent correctly identified the GPay pattern.")
        else:
            print("\nWARNING: RCA Agent missed the pattern or failed.")

    # Cleanup test data (optional in dev, but good practice)
    # db.query(Complaint).filter(Complaint.customer_id.like("CUST_RCA_%")).delete()
    # db.commit()
    db.close()

if __name__ == "__main__":
    test_rca_logic()

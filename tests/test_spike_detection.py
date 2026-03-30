import os
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from backend.models.complaint import Complaint
from backend.services.spike_service import detect_category_spikes
from backend.utils.db import SessionLocal

load_dotenv()

def simulate_spike():
    print("Starting Spike Detection Verification...")
    db = SessionLocal()
    try:
        # 1. Clear existing spikes and recent complaints for a clean test
        # We'll use a unique category 'TEST_SPIKE_CAT'
        test_cat = "UPI_FAILURE_TEST"
        print(f"Injecting test spike for category: {test_cat}")
        
        # 2. Inject 50 complaints in the last 30 minutes
        now = datetime.now(timezone.utc)
        for i in range(50):
            c = Complaint(
                id=uuid.uuid4(),
                channel_id=1, # email
                customer_id=f"test-cust-{i}",
                body="UPI transaction failed",
                category=test_cat,
                is_duplicate=False,
                created_at=now - timedelta(minutes=10)
            )
            db.add(c)
        
        db.commit()
        print("50 test complaints injected.")
        
        # 3. Trigger detection logic
        print("Running detection logic...")
        signals = detect_category_spikes(db)
        
        if signals:
            print(f"SUCCESS: {len(signals)} spike signal(s) generated!")
            for s in signals:
                print(f" - Signal: {s.description} | Surge: {s.predicted_surge_pct}%")
        else:
            print("FAILED: No spike signals detected. Check thresholds.")
            
        # 4. Final verify via API path
        print("\nVerifying via Service fetch...")
        from backend.services.spike_service import get_recent_spikes
        latest = get_recent_spikes(db, limit=5)
        for s in latest:
            print(f"DB Entry: {s.signal_ts} | {s.description}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    simulate_spike()

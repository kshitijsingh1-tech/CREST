import random
import time
import httpx
import uuid

API_URL = "http://localhost:8000/api/complaints/ingest"

SCENARIO_NAME = "NPCI_OUTAGE_UPI"
CATEGORY = "UPI"

COMPLAINT_TEMPLATES = [
    "My UPI transaction of Rs. {amount} failed but money was deducted. Transaction ID: {txn_id}.",
    "Payment stuck! Rs. {amount} debited from account for UPI txn {txn_id} but receiver didn't get it.",
    "Union Bank UPI is not working. I tried to pay Rs. {amount} and it's showing 'processing' since 2 hours. Ref: {txn_id}.",
    "Frustrated with UPI services. Failed payment of {amount}. Please refund immediately. Txn: {txn_id}.",
    "Urgent: Rs. {amount} deducted via BHIM UPI for {txn_id} but status is failed. Help!",
]

def seed_spike(count=15):
    print(f"Starting Demo Seeding: {SCENARIO_NAME} ({count} complaints)...")
    
    for i in range(count):
        amount = random.randint(100, 5000)
        txn_id = f"TXN{random.randint(100000, 999999)}UBI"
        body = random.choice(COMPLAINT_TEMPLATES).format(amount=amount, txn_id=txn_id)
        
        payload = {
            "channel": random.choice(["whatsapp", "app", "twitter"]),
            "customer_id": f"+91{random.randint(7000000000, 9999999999)}",
            "customer_name": f"Demo Customer {i+1}",
            "subject": "UPI Payment Issue",
            "body": body,
            "external_ref": str(uuid.uuid4())[:12].upper(),
            "language": "en"
        }
        
        try:
            resp = httpx.post(API_URL, json=payload, timeout=20.0)
            if resp.status_code == 201:
                data = resp.json()
                print(f"  [SUCCESS] Complaint {i+1} ingested. ID: {data['complaint_id'][:8]}... | Category: {data['category']}")
            else:
                print(f"  [FAILURE] Failed to ingest complaint {i+1}: {resp.text}")
        except Exception as e:
            print(f"  [!] Error connecting to API: {e}")
        
        # Small sleep to simulate realistic arrival (and avoid rate limits if any)
        time.sleep(0.2)

    print(f"\nSeeding complete. To see the Spike Alert, ensure the 'detect-spikes' Celery task runs")
    print(f"or run the detection manually via: python -c 'from backend.utils.db import SessionLocal; from backend.services.spike_service import detect_category_spikes; detect_category_spikes(SessionLocal())'")

if __name__ == "__main__":
    seed_spike()

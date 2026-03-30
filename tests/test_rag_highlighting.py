import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()
API_URL = 'http://localhost:8000/api/complaints/ingest'

def test_rag_highlighting():
    print("Testing RAG Source Highlighting...")
    
    payload = {
        "channel": "email",
        "customer_id": "highlight-test-99@bank.com",
        "customer_name": "Polly Policy",
        "body": "What is the compensation if my ATM complaint is not resolved within T+5 days?",
        "subject": "ATM Compensation Query"
    }
    
    try:
        print("Sending ingestion request...")
        resp = httpx.post(API_URL, json=payload, timeout=60)
        if resp.status_code != 201:
            print(f"FAILED: Ingest returned {resp.status_code}")
            return

        data = resp.json()
        complaint_id = data.get("complaint_id")
        print(f"SUCCESS: Complaint {complaint_id} created.")
        
        # Now fetch the complaint details from the API
        print(f"Fetching details for {complaint_id}...")
        detail_resp = httpx.get(f"http://localhost:8000/api/complaints/{complaint_id}")
        detail = detail_resp.json()
        
        metadata = detail.get("draft_metadata")
        if metadata and ("documents" in metadata or "resolutions" in metadata):
            print("\n" + "="*60)
            print("--- RAG SOURCE METADATA VERIFIED ---")
            print(json.dumps(metadata, indent=2))
            print("="*60 + "\n")
            
            docs = metadata.get("documents", [])
            if docs:
                print(f"Found {len(docs)} document sources.")
                print(f"Primary Source: {docs[0].get('document_title')}")
            else:
                print("WARNING: No document sources found in metadata.")
        else:
            print(f"FAILED: draft_metadata missing or empty. Response: {detail}")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_rag_highlighting()

import argparse
import json
import os
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description="Simulate a frustrated customer Tweet to test CREST Twitter/X ingestion.")
    parser.add_argument("--text", type=str, default="Hey @UnionBank, your app has crashed 3 times during a UPI transfer! My money got debited but the merchant received nothing. Extremely disappointing service!", help="The content of the Tweet.")
    parser.add_argument("--username", type=str, default="FrustratedUserX", help="Twitter username (without @).")
    parser.add_argument("--api-url", type=str, default="https://crest-api-0uc4.onrender.com/api/integrations/twitter/webhook", help="Webhook endpoint URL (defaults to Render deployment, use http://localhost:8000/api/integrations/twitter/webhook for local).")
    parser.add_argument("--key", type=str, default="crest_twitter_demo_key_2024", help="Secret TWITTER_WEBHOOK_KEY.")
    
    args = parser.parse_args()
    
    payload = {
        "username": args.username,
        "tweet_text": args.text,
        "tweet_id": "1794500000000000000",
        "is_mention": True
    }
    
    data = json.dumps(payload).encode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": args.key
    }
    
    req = urllib.request.Request(args.api_url, data=data, headers=headers, method="POST")
    
    print("\n" + "="*60)
    print("SENDING SIMULATED TWEET TO CREST INGESTION WEBHOOK")
    print("="*60)
    print(f"Web URL: {args.api_url}")
    print(f"Sender:      @{payload['username']}")
    print(f"Tweet Text:  \"{payload['tweet_text']}\"")
    print("="*60)
    print("Connecting to API...")

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            
            print("\nSIMULATION SUCCESSFUL!")
            print(f"HTTP Status: {response.status}")
            print(f"Pipeline Method: {res_json.get('method', 'direct').upper()}")
            print(f"Response Payload: {json.dumps(res_json, indent=2)}")
            
            if "complaint_id" in res_json:
                complaint_id = res_json["complaint_id"]
                print(f"Created Ticket ID: {complaint_id}")
                print(f"View Live: https://crest-ui-0uc4.onrender.com/complaints/{complaint_id}")
            else:
                print("Tweet added to Kafka pipeline for background queue processing.")
                
    except urllib.error.HTTPError as e:
        print(f"\nHTTP ERROR: Status {e.code}")
        print(e.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"\nNETWORK ERROR: {e.reason}")
        print("Make sure your API server is running and accessible.")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

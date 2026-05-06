import os
from dotenv import load_dotenv

def check_deployment_readiness():
    load_dotenv()
    
    required_vars = [
        "GROQ_API_KEY",
        "CREST_DB_URL",
        "EMBEDDING_MODE",
        "REDIS_URL",
        "KAFKA_BOOTSTRAP_SERVERS"
    ]
    
    print("--- CREST Deployment Readiness Check ---")
    all_pass = True
    
    for var in required_vars:
        val = os.getenv(var)
        if val:
            print(f"[OK] {var} is set")
        else:
            print(f"[ERROR] {var} is MISSING!")
            all_pass = False
            
    if all_pass:
        print("\nSUCCESS: System is ready for deployment environment configuration.")
    else:
        print("\nFAILURE: Missing critical environment variables.")
        
if __name__ == "__main__":
    check_deployment_readiness()

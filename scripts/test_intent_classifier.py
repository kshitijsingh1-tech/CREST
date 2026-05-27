"""
Unit test for intent classification and Cresty response logic.
"""

from __future__ import annotations

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.utils.intent import classify_message_intent, get_cresty_response

def test_intent_classifier():
    print("Testing Heuristic Classification...")
    
    # 1. Greetings
    assert classify_message_intent("hi") == "CONVERSATION"
    assert classify_message_intent("hello") == "CONVERSATION"
    assert classify_message_intent("good morning") == "CONVERSATION"
    assert classify_message_intent("thanks") == "CONVERSATION"
    assert classify_message_intent("who are you") == "CONVERSATION"
    print("[PASS] Heuristic greetings classification passed.")

    # 2. Short complaints
    assert classify_message_intent("atm failed") == "COMPLAINT"
    assert classify_message_intent("stolen card") == "COMPLAINT"
    print("[PASS] Heuristic short complaints classification passed.")

    # 3. LLM classification test
    print("\nTesting LLM Classification with Groq API (if key is set)...")
    if os.getenv("GROQ_API_KEY"):
        c1 = classify_message_intent("I want to know the timings of your Delhi branch.")
        print(f"Query: 'Delhi branch timings' -> Classified: {c1}")
        
        c2 = classify_message_intent("A vendor charged me twice for my transaction on 25th May.")
        print(f"Query: 'charged twice transaction' -> Classified: {c2}")
        
        c3 = classify_message_intent("I need help resetting my password.")
        print(f"Query: 'reset password help' -> Classified: {c3}")
        
        # Test Cresty response
        print("\nTesting Cresty Response Generation...")
        reply = get_cresty_response("What is the RBI Ombudsman policy limit?")
        print(f"Cresty Reply:\n{reply.encode('ascii', 'backslashreplace').decode('ascii')}\n")
    else:
        print("[WARN] GROQ_API_KEY not set; skipping LLM tests.")

if __name__ == "__main__":
    test_intent_classifier()

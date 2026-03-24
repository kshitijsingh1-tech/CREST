"""
CREST - Groq Classifier Agent
Classifies complaint severity, category, anger score, and sentiment using the Groq API.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from backend.utils.logger import get_logger
from ai.providers.groq import create_chat_completion, get_model, has_api_key

logger = get_logger("crest.agents.classifier")

SYSTEM_PROMPT = """You are CREST, a complaint classification AI for Union Bank of India.
Analyse the customer complaint and return ONLY a valid JSON object with these exact keys:

{
  "category": one of [UPI, KYC, Loan, Card, NetBanking, NEFT_RTGS, ATM, FD, General],
  "sub_category": short string describing the specific issue,
  "severity": integer 0-4 where 0=P0 critical (fraud/legal threat), 1=P1 high (financial loss), 2=P2 medium, 3=P3 low, 4=P4 info,
  "anger_score": float 0.0-1.0 where 1.0=extremely hostile/abusive,
  "sentiment": one of [positive, neutral, negative, hostile],
  "summary": one sentence summary of the complaint in plain English,
  "urgency_reason": why you assigned this severity (one sentence)
}

Rules:
- Assign P0 if customer mentions: Ombudsman, court, RBI complaint, fraud, unauthorized transaction, or account frozen
- Assign anger_score > 0.8 if customer uses ALL CAPS, exclamations, or threatening language
- Return ONLY the JSON object, no markdown, no preamble
"""

CLASSIFICATION_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "complaint_classification",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["UPI", "KYC", "Loan", "Card", "NetBanking", "NEFT_RTGS", "ATM", "FD", "General"],
                },
                "sub_category": {"type": "string"},
                "severity": {"type": "integer"},
                "anger_score": {"type": "number"},
                "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative", "hostile"]},
                "summary": {"type": "string"},
                "urgency_reason": {"type": "string"},
            },
            "required": [
                "category",
                "sub_category",
                "severity",
                "anger_score",
                "sentiment",
                "summary",
                "urgency_reason",
            ],
            "additionalProperties": False,
        },
    },
}


@dataclass
class ClassificationResult:
    category:       str
    sub_category:   str
    severity:       int
    anger_score:    float
    sentiment:      str
    summary:        str
    urgency_reason: str

    @classmethod
    def default(cls) -> "ClassificationResult":
        """Fallback if Groq API fails."""
        return cls(
            category="General", sub_category="Unclassified",
            severity=2, anger_score=0.5, sentiment="neutral",
            summary="Complaint requires manual classification.",
            urgency_reason="Auto-classification failed.",
        )


def classify(complaint_body: str) -> ClassificationResult:
    """
    Send complaint text to Groq and return structured classification.

    Usage (from AI Engine / Celery worker):
        result = classify(complaint.body)
        # result.severity, result.anger_score, result.category ...
    """
    if not has_api_key():
        logger.info("No configured chat API key found, using mock classifier")
        return _mock_classify(complaint_body)

    try:
        raw = create_chat_completion(
            model=get_model("GROQ_CLASSIFIER_MODEL", "openai/gpt-oss-20b"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Complaint:\n{complaint_body}"},
            ],
            max_tokens=512,
            temperature=0.0,
            response_format=CLASSIFICATION_RESPONSE_FORMAT,
        )

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)
        return ClassificationResult(
            category      = data.get("category", "General"),
            sub_category  = data.get("sub_category", ""),
            severity      = int(data.get("severity", 2)),
            anger_score   = float(data.get("anger_score", 0.5)),
            sentiment     = data.get("sentiment", "neutral"),
            summary       = data.get("summary", ""),
            urgency_reason= data.get("urgency_reason", ""),
        )

    except Exception as e:
        logger.error(f"Groq classification failed: {e}")
        return _mock_classify(complaint_body)


def _mock_classify(text: str) -> ClassificationResult:
    """Heuristic fallback for local dev without API keys."""
    text_lower = text.lower()

    if "upi" in text_lower or "payment" in text_lower:
        cat, sub = "UPI", "Failed Transaction"
    elif "card" in text_lower or "debit" in text_lower or "credit" in text_lower:
        cat, sub = "Card", "Card Issue"
    elif "loan" in text_lower or "emi" in text_lower:
        cat, sub = "Loan", "EMI Issue"
    elif "kyc" in text_lower or "frozen" in text_lower or "freeze" in text_lower:
        cat, sub = "KYC", "Account Freeze"
    elif "atm" in text_lower:
        cat, sub = "ATM", "Cash Not Dispensed"
    elif "neft" in text_lower or "rtgs" in text_lower:
        cat, sub = "NEFT_RTGS", "Delayed Credit"
    else:
        cat, sub = "General", "General Enquiry"

    hostile_words = ["fraud", "ombudsman", "rbi", "court", "legal", "immediately", "urgent"]
    angry_words = ["!!!", "cheated", "disgusting", "pathetic", "useless", "worst"]

    severity   = 0 if any(w in text_lower for w in ["ombudsman", "fraud", "rbi complaint"]) else \
                 1 if any(w in text_lower for w in ["urgent", "immediately", "frozen"]) else 2
    anger      = 0.85 if any(w in text_lower for w in angry_words) else \
                 0.60 if any(w in text_lower for w in hostile_words) else 0.35
    sentiment  = "hostile" if anger > 0.8 else "negative" if anger > 0.5 else "neutral"

    return ClassificationResult(
        category=cat, sub_category=sub, severity=severity,
        anger_score=anger, sentiment=sentiment,
        summary=f"Customer complaint about {cat} - {sub}",
        urgency_reason=f"Classified by heuristic fallback as severity P{severity}",
    )

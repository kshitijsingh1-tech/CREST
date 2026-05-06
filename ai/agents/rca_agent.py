import json
from typing import Any, Optional
from ai.providers.groq import create_chat_completion, get_model
from backend.utils.logger import get_logger

logger = get_logger("crest.ai.agents.rca")

def perform_rca(complaint_bodies: list[str]) -> dict[str, Any]:
    """
    Analyzes a batch of complaints to identify a root cause or common pattern.
    """
    logger.info(f"Performing RCA on {len(complaint_bodies)} complaints...")
    if not complaint_bodies:
        return {"rca_insight": "No complaints provided", "common_factors": {}}

    context = "\n---\n".join(complaint_bodies[:50])  # Cap at 50 for context limits
    
    prompt = f"""
    You are a Senior Banking Outage Analyst. 
    Analyze the following complaints to identify a systemic root cause.
    
    COMPLAINTS:
    {context}
    
    TASK:
    1. Identify if a common pattern exists (>30% of complaints share a specific theme).
    2. If yes, synthesize the ROOT CAUSE in 1-2 concise sentences.
    3. Extract common factors: platforms (GPay, PhonePe), error codes (500, 503, 504), or branches.
    4. If no clear pattern, state 'Heterogeneous influx - no systemic failure identified'.
    
    RESPONSE FORMAT (JSON ONLY):
    {{
        "rca_insight": "description of the root cause",
        "common_factors": {{
            "platforms": ["list"],
            "error_codes": ["list"],
            "locations": ["list"]
        }},
        "confidence": 0.0 to 1.0
    }}
    """
    
    try:
        raw = create_chat_completion(
            model=get_model("GROQ_DRAFT_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        result = json.loads(raw)
        return result
    except Exception as e:
        logger.error(f"RCA Agent failed: {e}")
        return {
            "rca_insight": "RCA analysis failed due to system error",
            "common_factors": {},
            "confidence": 0
        }

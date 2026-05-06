import re

def mask_pii(text: str) -> str:
    """
    Redact sensitive information (PII) from complaint text before sending to LLM.
    Supports: Account Numbers (10-16 digits), Phone Numbers, Email addresses.
    """
    # 1. Mask Account Numbers (e.g., 123456789012 -> 1234********)
    text = re.sub(r'\b(\d{4})\d{6,12}\b', r'\1********', text)
    
    # 2. Mask Phone Numbers (e.g., +91 9876543210 -> +91 ********** )
    text = re.sub(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', r'[PHONE_REDACTED]', text)
    
    # 3. Mask Emails
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', r'[EMAIL_REDACTED]', text)
    
    return text

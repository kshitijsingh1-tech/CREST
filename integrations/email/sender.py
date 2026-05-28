"""
CREST - Outbound Email Integration
Send approved customer replies via SMTP.
"""

from __future__ import annotations

import os
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from backend.utils.logger import get_logger
from backend.utils.runtime import is_truthy

logger = get_logger("crest.integrations.email.sender")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_email_address(value: str | None) -> bool:
    return bool(value and EMAIL_RE.match(value.strip()))


def _smtp_user() -> str:
    return (os.getenv("EMAIL_SMTP_USER") or os.getenv("EMAIL_IMAP_USER") or "").strip()


def _smtp_password() -> str:
    return (os.getenv("EMAIL_SMTP_PASSWORD") or os.getenv("EMAIL_IMAP_PASSWORD") or "").strip()


def _smtp_host() -> str:
    configured = (os.getenv("EMAIL_SMTP_HOST") or "").strip()
    if configured:
        return configured
    return "smtp.gmail.com" if _smtp_user().lower().endswith("@gmail.com") else ""


def _smtp_port() -> int:
    configured = (os.getenv("EMAIL_SMTP_PORT") or "").strip()
    if configured:
        return int(configured)
    return 587


def _smtp_from_email() -> str:
    return (os.getenv("EMAIL_FROM_EMAIL") or _smtp_user()).strip()


def _smtp_from_name() -> str:
    return (os.getenv("EMAIL_FROM_NAME") or "CREST Support").strip()


def _smtp_use_ssl(port: int) -> bool:
    default = "1" if port == 465 else "0"
    return is_truthy(os.getenv("EMAIL_SMTP_USE_SSL", default))


def _smtp_use_starttls(port: int) -> bool:
    default = "1" if port != 465 else "0"
    return is_truthy(os.getenv("EMAIL_SMTP_STARTTLS", default))


def can_send_customer_email() -> tuple[bool, str | None]:
    if os.getenv("RESEND_API_KEY") or os.getenv("SENDGRID_API_KEY"):
        return True, None
    if not _smtp_host():
        return False, "EMAIL_SMTP_HOST is not configured"
    if not _smtp_user():
        return False, "EMAIL_SMTP_USER is not configured"
    if not _smtp_password():
        return False, "EMAIL_SMTP_PASSWORD is not configured"
    if not _smtp_from_email():
        return False, "EMAIL_FROM_EMAIL is not configured"
    return True, None


def build_reply_subject(subject: str | None) -> str:
    base = (subject or "Your CREST complaint").strip()
    if not base:
        base = "Your CREST complaint"
    return base if base.lower().startswith("re:") else f"Re: {base}"


def send_customer_reply(
    recipient: str,
    reply_body: str,
    *,
    subject: str | None = None,
    in_reply_to: str | None = None,
    references: str | None = None,
) -> dict:
    recipient = (recipient or "").strip()
    if not is_email_address(recipient):
        raise ValueError("No deliverable customer email address is available")

    ok, reason = can_send_customer_email()
    if not ok:
        raise ValueError(reason or "SMTP or API key is not configured")

    resend_key = os.getenv("RESEND_API_KEY")
    sendgrid_key = os.getenv("SENDGRID_API_KEY")

    # Render Free Tier blocks outbound SMTP traffic (587/465). Avoid hanging for 20 seconds.
    if os.getenv("RENDER") == "true" and not resend_key and not sendgrid_key:
        logger.warning("SMTP ports 587/465 are blocked on Render Free plan. Bypassing SMTP connection attempt to prevent hang.")
        raise ConnectionError("SMTP is blocked on Render Free Tier. Please configure RESEND_API_KEY or SENDGRID_API_KEY.")

    smtp_from_email = _smtp_from_email()
    smtp_from_name = _smtp_from_name()
    mail_subject = build_reply_subject(subject)

    # ── Option 1: Send via SendGrid HTTP API (Preferred to avoid Resend sandbox constraints) ──
    if sendgrid_key:
        logger.info("Attempting to send email via SendGrid API")
        try:
            import json
            import urllib.request
            data = {
                "personalizations": [{"to": [{"email": recipient}]}],
                "from": {"email": smtp_from_email, "name": smtp_from_name},
                "subject": mail_subject,
                "content": [{"type": "text/plain", "value": reply_body}]
            }
            req = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=json.dumps(data).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {sendgrid_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                logger.info("SendGrid API request succeeded")
                return {
                    "recipient": recipient,
                    "subject": mail_subject,
                    "from_email": smtp_from_email,
                    "service": "sendgrid"
                }
        except Exception as e:
            logger.error("Failed to send customer reply via SendGrid API", exc_info=True)
            raise

    # ── Option 2: Send via Resend HTTP API ──
    elif resend_key:
        logger.info("Attempting to send email via Resend API")
        try:
            import json
            import urllib.request
            # Resend requires verified domains, but allows onboarding@resend.dev for test emails to the account owner
            from_addr = f"{smtp_from_name} <onboarding@resend.dev>" if "@" not in smtp_from_email or "gmail.com" in smtp_from_email.lower() else f"{smtp_from_name} <{smtp_from_email}>"
            data = {
                "from": from_addr,
                "to": [recipient],
                "subject": mail_subject,
                "text": reply_body
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(data).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                logger.info(f"Resend success: {res_data}")
                return {
                    "recipient": recipient,
                    "subject": mail_subject,
                    "from_email": from_addr,
                    "service": "resend",
                    "id": res_data.get("id")
                }
        except Exception as e:
            logger.error("Failed to send customer reply via Resend API", exc_info=True)
            raise

    # ── Option 3: Fall back to SMTP ──
    smtp_host = _smtp_host()
    smtp_port = _smtp_port()
    smtp_user = _smtp_user()
    smtp_password = _smtp_password()

    message = EmailMessage()
    message["Subject"] = mail_subject
    message["From"] = formataddr((smtp_from_name, smtp_from_email))
    message["To"] = recipient
    message["Message-ID"] = make_msgid(domain=smtp_from_email.split("@")[-1])
    if in_reply_to:
        message["In-Reply-To"] = in_reply_to
    if references:
        message["References"] = references
    elif in_reply_to:
        message["References"] = in_reply_to
    message.set_content(reply_body)

    context = ssl.create_default_context()
    use_ssl = _smtp_use_ssl(smtp_port)
    use_starttls = _smtp_use_starttls(smtp_port)

    try:
        if use_ssl:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20, context=context) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(message)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.ehlo()
                if use_starttls:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(smtp_user, smtp_password)
                server.send_message(message)
    except Exception:
        logger.error("Failed to send customer reply to %s", recipient, exc_info=True)
        raise

    logger.info("Customer reply sent to %s subject=%s", recipient, mail_subject)
    return {
        "recipient": recipient,
        "subject": mail_subject,
        "from_email": smtp_from_email,
    }

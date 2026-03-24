"""
CREST — Email Integration
IMAP listener that polls the bank's grievance inbox,
parses inbound emails, and publishes to Kafka email topic.

Polls every 60 seconds for new unseen messages.
"""

from __future__ import annotations

import email
import imaplib
import os
import re
import time
from email.header import decode_header
from email.utils import parseaddr

from backend.utils.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger("crest.integrations.email")

IMAP_HOST     = os.getenv("EMAIL_IMAP_HOST",     "imap.gmail.com")
IMAP_PORT     = int(os.getenv("EMAIL_IMAP_PORT", "993"))
IMAP_USER     = os.getenv("EMAIL_IMAP_USER",     "ayushiiscute@gmail.com")
IMAP_PASSWORD = os.getenv("EMAIL_IMAP_PASSWORD", "obqrclyncutnuuot")
POLL_INTERVAL = int(os.getenv("EMAIL_POLL_INTERVAL_SECS", "60"))


def _decode_header_value(raw: str) -> str:
    parts = decode_header(raw)
    decoded = []
    for part, enc in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            decoded.append(str(part))
    return " ".join(decoded)


def _extract_body(msg) -> str:
    """Extract plain text body from email, stripping HTML if needed."""
    body: str = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == "text/plain":
                payload = part.get_payload(decode=True)
                if isinstance(payload, bytes):
                    charset = part.get_content_charset() or "utf-8"
                    # Bypassing Pyre internal AugAssign crash by using standard concat
                    body = body + str(payload.decode(charset, errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if isinstance(payload, bytes):
            charset = msg.get_content_charset() or "utf-8"
            body = body + str(payload.decode(charset, errors="replace"))

    # Strip excessive whitespace
    body = re.sub(r"\n{3,}", "\n\n", body.strip())
    return body


def _process_email(mail: imaplib.IMAP4_SSL, uid: str) -> None:
    """Fetch, parse, and publish one email."""
    _, data = mail.uid("fetch", uid, "(RFC822)")  # type: ignore
    raw_data = data[0] if data and len(data) > 0 else None
    if not isinstance(raw_data, tuple):
        return
        
    raw = raw_data[1]
    msg = email.message_from_bytes(raw)

    from_header = str(msg.get("From", ""))
    _, from_addr = parseaddr(from_header)
    subject      = str(_decode_header_value(str(msg.get("Subject", "No Subject"))))
    body         = _extract_body(msg)
    msg_id       = str(msg.get("Message-ID", ""))

    if not body or len(body.strip()) < 10:
        logger.debug(f"Skipping empty/tiny email: {msg_id}")
        return

    # customer_id = email address
    customer_id = from_addr or "unknown@email"

    payload = {
        "channel": "email",
        "customer_id": customer_id,
        "body": body,
        "subject": subject,
        "external_ref": msg_id,
    }
    
    try:
        from integrations.kafka.producer import publish
        publish(
            channel="email",
            customer_id=customer_id,
            body=body,
            subject=subject,
            external_ref=msg_id,
        )
        logger.info(f"Published email to Kafka: from={from_addr} subject={subject[:60]}")
    except Exception as e:
        logger.error(f"Failed to publish email to Kafka: {e}")


def run_listener() -> None:
    """
    Poll IMAP inbox every POLL_INTERVAL seconds for new unseen messages.
    """
    if not IMAP_PASSWORD:
        logger.warning("EMAIL_IMAP_PASSWORD not set, email listener disabled")
        return

    logger.info(f"Email listener starting: {IMAP_USER}@{IMAP_HOST}:{IMAP_PORT}")

    while True:
        try:
            mail = imaplib.IMAP4_SSL(str(IMAP_HOST), int(IMAP_PORT))
            mail.login(str(IMAP_USER), str(IMAP_PASSWORD))
            mail.select("INBOX")

            _, uids = mail.uid("search", None, "UNSEEN")  # type: ignore
            uid_list = [u.decode("utf-8") for u in uids[0].split() if u]

            if uid_list:
                logger.info(f"Found {len(uid_list)} unseen email(s)")
                for uid in uid_list:
                    try:
                        _process_email(mail, uid)
                        mail.uid("store", uid, "+FLAGS", "\\Seen")  # type: ignore
                    except Exception as e:
                        logger.error(f"Error processing email UID {uid}: {e}")
            else:
                logger.debug("No new emails")

            mail.logout()

        except imaplib.IMAP4.error as e:
            logger.error(f"IMAP error: {e}")
        except Exception as e:
            logger.error(f"Email listener error: {e}", exc_info=True)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run_listener()

import os
import logging
import requests
from typing import Optional
from backend.app.config import settings

logger = logging.getLogger("finance_agent.email")


def send_resend_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: str = "FinanceAgent <onboarding@resend.dev>"
) -> bool:
    """
    Sends transactional emails via Resend HTTP API.
    Uses settings.RESEND_API_KEY if configured.
    """
    api_key = os.getenv("RESEND_API_KEY") or getattr(settings, "RESEND_API_KEY", None)
    if not api_key or api_key.strip() == "":
        logger.warning(f"RESEND_API_KEY not configured. Email to {to_email} logged to console.")
        print(f"--- [EMAIL DISPATCH TO {to_email}] ---\nSubject: {subject}\nHTML: {html_content[:300]}...\n----------------------------------")
        return True

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content
            },
            timeout=10
        )
        if response.status_code in (200, 201):
            logger.info(f"Email successfully sent to {to_email} via Resend.")
            return True
        else:
            logger.error(f"Resend email dispatch error ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exception during Resend email dispatch: {e}")
        return False

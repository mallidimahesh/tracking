import logging
from flask import current_app

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_verification_email(email: str, full_name: str, token: str) -> dict:
        """
        Sends verification email. In local/testing mode, logs the verification link
        to console and returns the link for testing convenience.
        """
        # Verification link pointing to frontend
        verify_url = f"/verify-email?token={token}&email={email}"
        subject = "Verify your VIT Shuttle Account"
        body = (
            f"Hello {full_name},\n\n"
            f"Thank you for signing up for VIT Shuttle — Smart Campus Transit System.\n"
            f"Please verify your email address by visiting the link below:\n\n"
            f"{verify_url}\n\n"
            f"If you did not create this account, please ignore this email.\n"
            f"VIT Shuttle Team"
        )

        logger.info(f"--- [EMAIL SIMULATION: TO {email}] ---")
        logger.info(f"Subject: {subject}")
        logger.info(f"Token: {token}")
        logger.info(f"Verification URL: {verify_url}")
        logger.info("---------------------------------------")

        # In production with AWS SES configured:
        # boto3.client('ses').send_email(...) can be called here if AWS credentials exist.

        return {
            "success": True,
            "verification_url": verify_url,
            "token": token
        }

    @staticmethod
    def send_password_reset_email(email: str, token: str) -> dict:
        reset_url = f"/reset-password?token={token}&email={email}"
        logger.info(f"--- [PASSWORD RESET: TO {email}] ---")
        logger.info(f"Reset URL: {reset_url}")
        logger.info("------------------------------------")
        return {"success": True, "reset_url": reset_url, "token": token}

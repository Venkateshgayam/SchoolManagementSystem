import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_new_account_email(email_to: str, full_name: str, username: str, password: str, login_url: str):
    """
    Sends a new account welcome email with temporary credentials.
    """
    if not settings.SMTP_HOST or not settings.SMTP_PORT:
        logger.warning(f"Failed to send teacher account email to {email_to}: SMTP not configured.")
        return

    subject = "Welcome to School Management System - Your Account Credentials"
    
    html_content = f"""
    <html>
        <body>
            <h2>Welcome, {full_name}!</h2>
            <p>Welcome to the School Management System!</p>
            <p>Your teacher account has been successfully created.</p>
            <br>
            <p>Best regards,</p>
            <p>School Admin</p>
        </body>
    </html>
    """

    text_content = f"""
    Welcome, {full_name}!

    Welcome to the School Management System!
    Your teacher account has been successfully created.

    Best regards,
    School Admin
    """

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.EMAILS_FROM_NAME or 'School Admin'} <{settings.EMAILS_FROM_EMAIL or 'noreply@school.com'}>"
    message["To"] = email_to
    
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            # If using STARTTLS
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            server.send_message(message)
    except Exception as e:
        # We catch all exceptions so that email failure doesn't break the application flow.
        logger.error(f"Failed to send teacher account email to {email_to}: {str(e)}")

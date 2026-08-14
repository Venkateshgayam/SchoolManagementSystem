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
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Welcome, {full_name}!</h2>
            <p>Welcome to the School Management System!</p>
            <p>Your teacher account has been successfully created. Below are your account details:</p>
            <ul>
                <li><strong>Full Name:</strong> {full_name}</li>
                <li><strong>Username:</strong> {username}</li>
                <li><strong>Email:</strong> {email_to}</li>
                <li><strong>Temporary Password:</strong> {password}</li>
            </ul>
            <p>You can access the teacher portal here:</p>
            <p><a href="{login_url}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Teacher Portal</a></p>
            <p>Direct Link: <a href="{login_url}">{login_url}</a></p>
            <p><strong>Important:</strong> Please log in and change your temporary password immediately after your first login for security reasons.</p>
            <br>
            <p>Best regards,<br>School Administration</p>
        </body>
    </html>
    """

    text_content = f"""
    Welcome, {full_name}!

    Welcome to the School Management System!
    Your teacher account has been successfully created.

    Account Details:
    - Full Name: {full_name}
    - Username: {username}
    - Email: {email_to}
    - Temporary Password: {password}

    Login to Teacher Portal:
    {login_url}

    Important: Please log in and change your temporary password immediately after your first login for security reasons.

    Best regards,
    School Administration
    """

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.EMAILS_FROM_NAME or 'School Admin'} <{settings.EMAILS_FROM_EMAIL or 'noreply@school.com'}>"
    message["To"] = email_to
    
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    try:
        logger.warning(f"Attempting to send teacher account email to {email_to} via {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        port = int(settings.SMTP_PORT)
        if port == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=15) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, port, timeout=15) as server:
                server.ehlo()
                if server.has_extn("starttls"):
                    server.starttls()
                    server.ehlo()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
        logger.warning(f"Teacher account email sent successfully to {email_to}")
    except Exception as e:
        # Catch all exceptions so email delivery failure does not break API or DB flow.
        logger.error(f"Failed to send teacher account email to {email_to}: {type(e).__name__} - {str(e)}")



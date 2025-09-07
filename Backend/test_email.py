import os
import smtplib
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

# Get settings from .env
EMAIL = os.getenv("MAIL_FROM")
PASSWORD = os.getenv("MAIL_PASSWORD")
SERVER = os.getenv("MAIL_SERVER")
PORT = int(os.getenv("MAIL_PORT"))

# Email content
msg = MIMEText('This is a test email from your FastAPI app.')
msg['Subject'] = 'SMTP Connection Test'
msg['From'] = EMAIL
msg['To'] = EMAIL # Send to yourself

try:
    print(f"Connecting to SMTP server {SERVER}:{PORT}...")
    with smtplib.SMTP(SERVER, PORT) as server:
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.sendmail(EMAIL, EMAIL, msg.as_string())
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email: {e}")
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from ..config import settings
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User, PasswordReset
from fastapi.templating import Jinja2Templates
from .auth import get_current_user
from starlette.responses import RedirectResponse
from passlib.context import CryptContext
from datetime import datetime, timedelta
from urllib.parse import urljoin
import secrets
import pytz

sydney_tz = pytz.timezone("Australia/Sydney")

templates = Jinja2Templates(directory="TennisApp/templates")

router = APIRouter(
    prefix='/user',
    tags=['user']
)
def get_db():
    db = SessionLocal() # Create a new database session
    try:
        yield db # Provide the session to the request handler
    finally:
        db.close() # Close the session after request is completed

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Pydantic Model for Password Change
class UserVerification(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)

def redirect_to_login():
    redirect_response = RedirectResponse(url="/auth/login-page", status_code=status.HTTP_302_FOUND)
    redirect_response.delete_cookie(key="access_token")
    return redirect_response

### Pages ###
@router.get("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def render_change_password_page(request: Request, db: db_dependency):
    try:
        user = await get_current_user(request.cookies.get('access_token')) # this will get our JWT
        
        #print(f"***** user *****: {user}")
        
        if user is None:
            return redirect_to_login()
        
        return templates.TemplateResponse("change-password.html", {
            "request": request, 
            "user": user
        })
    
    except Exception as e:
        print(f"Exception occurred: {e}")
        return redirect_to_login()

@router.get('/reset-password', status_code=status.HTTP_200_OK)
async def render_reset_password(request: Request, token: str):
    # Validate the token here (you might want to check if it exists and hasn't expired)
    # If the token is invalid, you could redirect to an error page or the login page
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
    
    return templates.TemplateResponse("reset-password.html", {
        "request": request,
        "token": token
    })


### Endpoints ###
@router.put('/change-password', status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
            user: user_dependency, 
            db: db_dependency,
            user_verification: UserVerification
        ):
    if user is None:
        raise HTTPException(status_code=401, detail='Authentication Failed!')
    
    user_model = db.query(User)\
            .filter(User.id == user.get("id"))\
            .first()
    
    if not bcrypt_context.verify(user_verification.currentPassword, user_model.hashed_password):
        raise HTTPException(status_code=401, detail='Error on password change')

    user_model.hashed_password = bcrypt_context.hash(user_verification.newPassword)
    
    db.add(user_model)
    db.commit()

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
        request: Request,
        db: db_dependency,
        background_tasks: BackgroundTasks, 
        email: EmailStr = Form(...)
    ):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If a user with this email exists, a password reset link has been sent."}
    
    token = secrets.token_urlsafe(32)
    await save_reset_token(user.id, token, db)
    
    base_url = str(request.base_url)  # Get the base URL from request
    reset_link = urljoin(base_url, f"user/reset-password?token={token}")
    
    message = MessageSchema(
        subject="Password Reset",
        recipients=[email],
        body=f"Click the following link to reset your password: <a href='{reset_link}'>{reset_link}</a><br>This link expires in 20 minutes.",
        subtype="html"
    )
    
    fm = FastMail(email_config)

    background_tasks.add_task(fm.send_message, message)

    return {"message": "If a user with this email exists, a password reset link has been sent."}

email_config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS
)

async def save_reset_token(user_id: int, token: str, db: Session):
    """Store the password reset token and expiration time."""
    expires_at = datetime.now(sydney_tz) + timedelta(minutes=20)  # Token expires in 20 mins
    
    reset_entry = PasswordReset(user_id=user_id, token=token, expires_at=expires_at)
    
    db.add(reset_entry)
    db.commit()
    
@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    db: db_dependency,
    token: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...)
):
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    reset_entry = db.query(PasswordReset).filter(PasswordReset.token == token).first()
    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid token")

    # Ensure expires_at is timezone-aware
    expires_at = reset_entry.expires_at.replace(tzinfo=sydney_tz) if reset_entry.expires_at.tzinfo is None else reset_entry.expires_at
    
    if datetime.now(sydney_tz) > expires_at:
        raise HTTPException(status_code=400, detail="Token has expired")

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = bcrypt_context.hash(new_password)
    user.hashed_password = hashed_password

    # Delete the used token
    db.delete(reset_entry)
    db.commit()

    return {"message": "Password reset successful"}

@router.post("/send-test-email")
async def send_test_email(background_tasks: BackgroundTasks):
    message = MessageSchema(
        subject="Portico Tennis App - Test Email",
        recipients=[settings.MAIL_FROM],  # Send test email to your own email
        body="This is a test email from Portico Tennis App using Brevo SMTP.",
        subtype="html",
    )
    fm = FastMail(email_config)
    try:
        background_tasks.add_task(fm.send_message, message)
        return {"message": "Test email sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException, Request, Query
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, EmailStr, StringConstraints, field_validator, Field
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pydantic import ValidationError
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from ..models import User
from ..config import settings
from passlib.context import CryptContext
from typing import Annotated
from sqlalchemy.orm import Session
from ..database import SessionLocal
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import os
import pytz
import time

load_dotenv()

sydney_tz = pytz.timezone("Australia/Sydney")

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

##### change the SECRET_KEY value. Use a secrets manager like AWS Secrets Manager when deploying to production.
##### add the secrets file to .gitignore
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

if not SECRET_KEY or not ALGORITHM:
    raise ValueError("SECRET_KEY and ALGORITHM must be set in the .env file")

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')

class CreateUserRequest(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    password: str 
    role: str
    phone_number: str
    apartment_number: str

class Token(BaseModel):
    access_token: str
    token_type: str

def get_db():
    db = SessionLocal() # Create a new database session
    try:
        yield db # Provide the session to the request handler
    finally:
        db.close() # Close the session after request is completed

db_dependency = Annotated[Session, Depends(get_db)]
#user_dependency = Annotated[dict, Depends(get_current_user)]
templates = Jinja2Templates(directory="TennisApp/templates")

### Pages ###
@router.get("/login-page")
def render_login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/register-page")
def render_register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.get("/forgot-password")
def render_forgot_password_page(request: Request):
    return templates.TemplateResponse("forgot-password.html", {"request": request})

@router.get("/terms-and-conditions-page")
def render_terms_and_conditions_page(request: Request):
    return templates.TemplateResponse("terms-and-conditions-page.html", {"request": request})


### Endpoints ###
"""
To re-activate a user, ensure that the `is_active=1`, and `failed_login_attempts=0`
sample query: `UPDATE users SET is_active=1, failed_login_attempts=0 where id=21;`
"""
def authenticate_user(username: str, password: str, db: db_dependency):
    user = db.query(User).filter(User.username == username).with_for_update().first()
    if not user:
        return False
    if not user.is_active:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        user.failed_login_attempts += 1
        user.last_failed_login = datetime.now(sydney_tz)
        if user.failed_login_attempts > 5:
            user.is_active = False
        db.commit()
        return False
    
    user.failed_login_attempts = 0
    user.last_failed_login = None
    db.commit()
    return user

def create_access_token(username: str, user_id: int, role: str, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id, 'role': role}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
        token: Annotated[str, Depends(oauth2_bearer)]
    ):
    try: 
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        user_id: int = payload.get('id')
        user_role: str = payload.get('role')
        if username is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Could not validate user.')
        return {'username': username, 'id': user_id, 'user_role': user_role}
    except JWTError as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail='Could not validate user.')
    
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
                        db: db_dependency, 
                        create_user_request: CreateUserRequest
                    ):
    create_user_model = User(
        email = create_user_request.email,
        username = create_user_request.username,
        first_name = create_user_request.first_name,
        last_name = create_user_request.last_name,
        role = create_user_request.role,
        hashed_password = bcrypt_context.hash(create_user_request.password),
        is_active = True,
        phone_number = create_user_request.phone_number,
        apartment_number = create_user_request.apartment_number
    )
    #return create_user_model
    db.add(create_user_model)
    db.commit()

@router.post("/token", response_model=Token)
async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: db_dependency
    ): 
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Could not validate user.'
        )
    token = create_access_token(user.username, user.id, user.role, timedelta(minutes=20))
    
    return {'access_token': token, 'token_type': 'bearer'}
    
class UserCreate(BaseModel):
    email: EmailStr
    username: Annotated[str, StringConstraints(min_length=3, max_length=5)]
    first_name: Annotated[str, StringConstraints(min_length=1, max_length=50)]
    last_name: Annotated[str, StringConstraints(min_length=1, max_length=50)]
    role: str
    apartment_number: str
    phone_number: str = Field(
        pattern=r"^(?:\+61|0)4\d{8}$", # Regex for Australian mobile numbers
        description="Australian phone number starting with +61 or 04"
    )
    password: str
    invitation_code: str = Field(..., description="Invitation code required for registration")

    @field_validator('username')
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 5:
            raise ValueError('Username must be between 3 and 5 characters long')
        return v
    
    @field_validator('first_name')
    def validate_first_name(cls, v):
        if len(v) < 1 or len(v) > 50:
            raise ValueError('First Name must be between 1 and 50 characters long')
        return v
    
    @field_validator('last_name')
    def validate_last_name(cls, v):
        if len(v) < 1 or len(v) > 50:
            raise ValueError('Last Name must be between 1 and 50 characters long')
        return v
    
    @field_validator('role')
    def validate_role(cls, v):
        allowed_roles = ['resident', 'admin']
        if v.lower() not in allowed_roles:
            raise ValueError('Invalid role')
        return v.lower()

RATE_LIMIT = 5 # max number of requests
TIME_WINDOW = 60 # Time window in seconds

# Dict to store request counts and timestamps per client
request_counters = {}

async def rate_limit(request: Request):
    client_ip = request.client.host # client IP is the identifier here
    current_time = time.time()

    # Initialize or update request counter for the client IP
    if client_ip not in request_counters:
        request_counters[client_ip] = {"count": 1, "start_time": current_time}
    else:
        data = request_counters[client_ip]
        elapsed_time = current_time - data["start_time"]

        if elapsed_time > TIME_WINDOW:
            # Reset counter if time window has passed
            request_counters[client_ip] = {"count": 1, "start_time": current_time}
        else:
            data["count"] += 1
            if data["count"] > RATE_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests."
                )

email_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS
)

@router.post("/register", 
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit)]
            )
async def register_user(user: UserCreate, db: db_dependency):
    try:
        # Check invitation code
        if user.invitation_code not in settings.VALID_INVITATION_CODES.split(","):
            raise HTTPException(status_code=400, detail="Invalid invitation code")

        # Check if user already exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username is unique
        db_username = db.query(User).filter(User.username == user.username).first()
        if db_username:
            raise HTTPException(status_code=400, detail="Username already taken")

        # Check if apartment number is unique
        db_apartment = db.query(User).filter(User.apartment_number == user.apartment_number).first()
        if db_apartment:
            raise HTTPException(status_code=400, detail="Apartment number already registered")

        # Create new user
        new_user = User(
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            apartment_number=user.apartment_number,
            phone_number=user.phone_number,
            hashed_password=bcrypt_context.hash(user.password),
            is_active=False
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Send email to admin
        await send_admin_email(new_user)

        return {"message": "Registration successful. An email has been sent to the admin for approval."}

    except HTTPException as e:
        print(f"HTTP Exception: {e.detail}")  # Debugging message
        raise e  # Re-raise so FastAPI handles it correctly

    except Exception as e:
        db.rollback()
        print(f"Unexpected Error: {e}") 
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

async def send_admin_email(user: User):
    message = MessageSchema(
        subject="New User Registration",
        recipients=["porticotennis@gmail.com"],
        body=f"""
        A new user has registered:<br>
        Email: {user.email}<br>
        Username: {user.username}<br>
        Name: {user.first_name} {user.last_name}<br>
        Role: {user.role}<br>
        Apartment Number: {user.apartment_number}<br>
        Phone Number: {user.phone_number}<br>
        """,
        subtype="html"
    )

    fm = FastMail(email_conf)
    await fm.send_message(message)
    

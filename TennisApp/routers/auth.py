from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException, Request
from pydantic import BaseModel, EmailStr
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
import pytz

sydney_tz = pytz.timezone("Australia/Sydney")

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

##### change the SECRET_KEY value. Use a secrets manager like AWS Secrets Manager when deploying to production.
##### add the secrets file to .gitignore
SECRET_KEY = '9d8fb39136049682393c984524b246282d0999f1f4cbeebf03786535485a09f0'
ALGORITHM = 'HS256'

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
    username: str
    first_name: str
    last_name: str
    role: str
    apartment_number: str
    phone_number: str
    password: str

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

@router.post("/register")
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        apartment_number=user.apartment_number,
        phone_number=user.phone_number,
        hashed_password=get_password_hash(user.password),
        is_active=False  # Set is_active to False initially
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send email to admin
    await send_admin_email(new_user)

    return {"message": "Registration successful. An email has been sent to the admin for approval."}

async def send_admin_email(user: User):
    message = MessageSchema(
        subject="New User Registration",
        recipients=["porticotennis@gmail.com"],
        body=f"""
        A new user has registered:
        Email: {user.email}
        Username: {user.username}
        Name: {user.first_name} {user.last_name}
        Role: {user.role}
        Apartment Number: {user.apartment_number}
        Phone Number: {user.phone_number}
        """,
        subtype="html"
    )

    fm = FastMail(email_conf)
    await fm.send_message(message)

def get_password_hash(password: str):
    # Implement your password hashing logic here
    # For example, using bcrypt:
    # return bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    pass

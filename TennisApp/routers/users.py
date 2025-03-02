from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from fastapi.templating import Jinja2Templates
from .auth import get_current_user
from starlette.responses import RedirectResponse
from passlib.context import CryptContext

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

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Booking, User
from .auth import get_current_user

router = APIRouter(
    prefix='/admin',
    tags=['admin']
)
def get_db():
    db = SessionLocal() # Create a new database session
    try:
        yield db # Provide the session to the request handler
    finally:
        db.close() # Close the session after request is completed

# This line ensures that the get_db() is called whenever a route requires a database session.
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@router.get('/bookings', status_code=status.HTTP_200_OK)
async def get_all_bookings(user: user_dependency, db: db_dependency):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=401, detail='Authentication Failed!')
    return db.query(Booking).all()

@router.delete('/booking/{booking_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
        user: user_dependency,
        db: db_dependency,
        booking_id: int = Path(ge=1)
    ):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=401, detail='Authentication Failed!')
    
    booking_model = db.query(Booking)\
        .filter(Booking.id == booking_id)\
        .first()
    
    if booking_model is None:
        raise HTTPException(status_code=404, detail="Booking not found!")
    
    db.query(Booking)\
        .filter(Booking.id == booking_id)\
        .delete()

    db.commit()

@router.get('/users', status_code=status.HTTP_200_OK)
async def get_all_users(user: user_dependency, db: db_dependency):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=401, detail='Authentication Failed!')
    return db.query(User).all()

@router.delete('/user/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user: user_dependency, 
        db: db_dependency,
        user_id: int = Path(ge=1)
    ):
    if user is None or user.get('user_role') != 'admin':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                             detail='Authentication Failed!')
    
    user_model = db.query(User)\
        .filter(User.id == user_id)\
        .first()
    
    if user_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                            detail="User not found!")

    if user_id == user.get('id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                            detail='Deleting self not allowed')

    db.query(User)\
        .filter(User.id == user_id)\
        .delete()
    
    db.commit()
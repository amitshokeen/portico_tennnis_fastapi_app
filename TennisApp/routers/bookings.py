from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Path, status, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Booking
from .auth import get_current_user
from fastapi.templating import Jinja2Templates
#from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
from datetime import date as DateType, datetime
import pytz

# Set timezone for Sydney
sydney_tz = pytz.timezone("Australia/Sydney")

templates = Jinja2Templates(directory="TennisApp/templates")

router = APIRouter(
    prefix='/bookings',
    tags=['bookings']
)
def get_db():
    db = SessionLocal() # Create a new database session
    try:
        yield db # Provide the session to the request handler
    finally:
        db.close() # Close the session after request is completed

# This line ensures that the get_db() is called whenever a route requires a database sesion.
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

from datetime import date as DateType, datetime
from pydantic import BaseModel, Field, field_validator
import pytz

# Set timezone for Sydney
sydney_tz = pytz.timezone("Australia/Sydney")

class BookingRequest(BaseModel):
    #user_id: int = Field(..., description="User ID of the person making the booking")
    booking_date: DateType = Field(..., alias="date", description="Booking date (YYYY-MM-DD)")
    start_time: datetime = Field(..., description="Start time of the booking (ISO 8601 format)")
    end_time: datetime = Field(..., description="End time of the booking (ISO 8601 format)")
    status: str = Field(default="Confirmed", description="Booking status (Confirmed or Cancelled)")

    @field_validator("end_time")
    def validate_end_time(cls, end_time, values):
        """Ensure end_time is after start_time."""
        start_time = values.get("start_time")
        if start_time and end_time <= start_time:
            raise ValueError("End time must be after start time.")
        return end_time

    @field_validator("booking_date", mode="before")
    def validate_booking_date(cls, value):
        """Ensure the booking date is not in the past."""
        today = DateType.today()
        if value < today:
            raise ValueError(f"Booking date cannot be in the past. Today is {today}.")
        return value

    @field_validator("start_time", "end_time", mode="before")
    def localize_datetime(cls, value):
        """Ensure start_time and end_time are timezone-aware (Sydney timezone)."""
        if value.tzinfo is None:
            value = sydney_tz.localize(value)
        return value.astimezone(sydney_tz)

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": 1,
                "date": "2025-10-05",
                "start_time": "2025-10-05T08:00:00+11:00",
                "end_time": "2025-10-05T09:00:00+11:00",
                "status": "Confirmed"
            }
        }
    }

def redirect_to_login():
    redirect_response = RedirectResponse(url="/auth/login-page", status_code=status.HTTP_302_FOUND)
    redirect_response.delete_cookie(key="access_token")
    return redirect_response

### Pages ###
@router.get("/bookings-page")
async def render_bookings_page(request: Request, db: db_dependency):
    try:
        user = await get_current_user(request.cookies.get('access_token')) # this will get our JWT
        #print(f"***** user *****: {user}")
        if user is None:
            return redirect_to_login()

        bookings = db.query(Booking).filter(Booking.user_id == user.get("id")).all()

        return templates.TemplateResponse("bookings.html", {"request": request, "bookings": bookings, "user": user})
    except Exception as e:
        print(f"Exception occurred: {e}")
        return redirect_to_login()
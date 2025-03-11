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
from datetime import date as DateType, datetime, timedelta
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

class BookingRequest(BaseModel):
    user_id: int = Field(..., description="User ID of the person making the booking")
    booking_date: DateType = Field(..., alias="date", description="Booking date (YYYY-MM-DD)")
    start_time: datetime = Field(..., description="Start time of booking (ISO 8601 format, Sydney time)")
    end_time: datetime = Field(..., description="End time of booking (ISO 8601 format, Sydney time)")
    status: str = Field(default="Confirmed", description="Booking status (Confirmed or Cancelled)")

    @field_validator("start_time", "end_time", mode="before")
    def validate_time_range(cls, value):
        """Ensure the time range is valid and convert to UTC."""
        if not isinstance(value, datetime):
            raise ValueError("Invalid datetime format for start_time or end_time.")

        # Ensure the datetime is timezone-aware
        try:
            if value.tzinfo is None:
                value = sydney_tz.localize(value, is_dst=None)  # Handle DST safely
        except pytz.exceptions.AmbiguousTimeError:
            raise ValueError("start_time or end_time falls during a DST change. Please select another time.")
        
        # Convert to UTC for storage
        utc_time = value.astimezone(pytz.utc)

        # Business rule: Only allow bookings between 6:00 AM and 10:00 PM Sydney time
        local_time = utc_time.astimezone(sydney_tz)
        start_of_day = local_time.replace(hour=6, minute=0, second=0, microsecond=0)
        end_of_day = local_time.replace(hour=22, minute=0, second=0, microsecond=0)

        if not (start_of_day <= local_time <= end_of_day):
            raise ValueError(f"{value.strftime('%Y-%m-%d %H:%M:%S')} must be between 6:00 AM and 10:00 PM Sydney time.")
        
        return utc_time

    @field_validator("end_time")
    def validate_end_time(cls, end_time, values):
        """Ensure end_time is after start_time and on the same day."""
        start_time = values.get("start_time")
        if start_time and end_time <= start_time:
            raise ValueError("End time must be after start time.")
        if start_time and end_time.date() != start_time.date():
            raise ValueError("Start and end times must be on the same day.")
        return end_time

    @field_validator("booking_date", mode="before")
    def validate_booking_date(cls, value):
        """Ensure the booking date is not in the past."""
        today = DateType.today()
        if value < today:
            raise ValueError(f"Booking date cannot be in the past. Today is {today}.")
        return value

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
@router.get("/bookings-page", status_code=status.HTTP_200_OK)
async def render_bookings_page(request: Request, db: db_dependency):
    try:
        user = await get_current_user(request.cookies.get('access_token')) # this will get our JWT
        #print(f"***** user *****: {user}")
        if user is None:
            return redirect_to_login()

        bookings = db.query(Booking).all()
        
        return templates.TemplateResponse("bookings.html", {
            "request": request, 
            "bookings": bookings, 
            "user": user
        })
    
    except Exception as e:
        print(f"Exception occurred: {e}")
        return redirect_to_login()
    
### Endpoints ###
@router.post("/populate-start-times123", status_code=status.HTTP_200_OK)
async def populate_start_times(
    user: user_dependency,
    db: db_dependency,
    request: dict  # Expecting JSON body with {"date": "YYYY-MM-DD"}
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    
    # Extract and validate the date from the request body
    selected_date_str = request.get("date")
    if not selected_date_str:
        raise HTTPException(status_code=400, detail="Date is required.")
    
    try:
        selected_date = datetime.strptime(selected_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    # Convert the selected date into Sydney local time (midnight start of day)
    sydney_start_of_day = sydney_tz.localize(datetime.combine(selected_date, datetime.min.time()))
    sydney_end_of_day = sydney_start_of_day.replace(hour=23, minute=59, second=59)  # End of day

    # Convert Sydney time range to UTC for database querying
    start_of_day_utc = sydney_start_of_day.astimezone(pytz.utc)
    end_of_day_utc = sydney_end_of_day.astimezone(pytz.utc)

    print(f"Querying bookings from {start_of_day_utc} to {end_of_day_utc} (UTC)")

    # Fetch bookings for the selected date based on UTC timestamps
    bookings = db.query(Booking).filter(
        Booking.start_time >= start_of_day_utc,
        Booking.end_time <= end_of_day_utc
    ).all()

    print(f"Retrieved bookings: {[{'start': b.start_time, 'end': b.end_time} for b in bookings]}")

    # Define booking hours in Sydney time (6:00 AM - 10:00 PM)
    sydney_open_time = sydney_start_of_day.replace(hour=6)
    sydney_close_time = sydney_start_of_day.replace(hour=22)

    # Generate list of available times in Sydney time (every 15 min)
    available_times = []
    current_time = sydney_open_time
    while current_time < sydney_close_time:
        available_times.append(current_time.strftime("%H:%M"))
        current_time += timedelta(minutes=15)

    # Convert booked times from UTC to Sydney timezone & remove booked times
    for booking in bookings:
        booked_start = booking.start_time.astimezone(sydney_tz)
        booked_end = booking.end_time.astimezone(sydney_tz)
        available_times = [
            time for time in available_times
            if not (booked_start.strftime("%H:%M") <= time < booked_end.strftime("%H:%M"))
        ]

    return {"available_start_times": available_times}




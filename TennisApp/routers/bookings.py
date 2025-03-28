from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Path, status, Request
from pydantic import BaseModel, Field, field_validator, ValidationInfo
from sqlalchemy.orm import Session
from sqlalchemy import asc
from ..database import SessionLocal
from ..models import Booking, User
from .auth import get_current_user
from fastapi.templating import Jinja2Templates
#from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
from datetime import date as DateType, datetime, timedelta, timezone
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import pytz
from typing import List

# Set timezone for Sydney
sydney_tz = pytz.timezone("Australia/Sydney")
START_HOUR = 360 # minutes since midnight till 06:00
END_HOUR =  1305 # minutes since midnight till 21:45

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

# Set Sydney timezone
sydney_tz = pytz.timezone("Australia/Sydney")

class BookingRequest(BaseModel):
    #user_id: int = Field(..., description="User ID of the person making the booking")
    booking_date: DateType = Field(..., alias="date", description="Booking date (YYYY-MM-DD)")
    start_time: datetime = Field(..., description="Start time of booking (ISO 8601 format, Sydney time)")
    end_time: datetime = Field(..., description="End time of booking (ISO 8601 format, Sydney time)")
    status: str = Field(default="Confirmed", description="Booking status (Confirmed or Cancelled)")

    @field_validator("start_time", "end_time", mode="before")
    def validate_time_range(cls, value):
        """Ensure the time range is valid and store in Sydney time."""
        if isinstance(value, str):  # Convert string to datetime
            try:
                value = datetime.fromisoformat(value)  # Converts ISO 8601 string to datetime
            except ValueError:
                raise ValueError("Invalid datetime format for start_time or end_time.")

        if value.tzinfo is None:
            value = sydney_tz.localize(value, is_dst=None)  # Ensure it's timezone-aware

        return value  # Store as Sydney time

    @field_validator("end_time")
    def validate_end_time(cls, end_time, values: ValidationInfo):
        """Ensure end_time is after start_time and on the same day."""
        start_time = values.data.get("start_time")  # Access values correctly in Pydantic v2

        if start_time and end_time <= start_time:
            raise ValueError("End time must be after start time.")

        if start_time and end_time.date() != start_time.date():
            raise ValueError("Start and end times must be on the same day.")

        return end_time
    
    @field_validator("booking_date", mode="before")
    def validate_booking_date(cls, value):
        """Ensure the booking date is not in the past."""
        try:
            if isinstance(value, str):  # Convert string to date
                value = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid date format: {value}. Expected format: YYYY-MM-DD")
        
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
    #redirect_response.delete_cookie(key="access_token")
    return redirect_response

### Pages ###
@router.get("/bookings-page", status_code=status.HTTP_200_OK)
async def render_bookings_page(request: Request, db: db_dependency):
    try:
        user = await get_current_user(request, db)
        if user is None:
            return redirect_to_login()

        # Get the current date
        current_date = datetime.now(sydney_tz).date()

        next_7_days = [(current_date + timedelta(days=i)) for i in range(7)]

        date_options = [
            {
                "value": date.isoformat(),
                "label": f"{date.strftime('%a')} {date.strftime('%Y-%m-%d')}"
            } for date in next_7_days
        ]

        # Query bookings, joining with User table and ordering by date and start time
        all_bookings = (
            db.query(Booking, User.username)
            .join(User, Booking.user_id == User.id)
            .filter(Booking.date >= current_date)
            .order_by(asc(Booking.date), asc(Booking.start_time))
            .all()
        )

        # Serialize the bookings
        serialized_bookings = [
            {
                "id": booking.id,
                "user_id": booking.user_id,
                "date": booking.date.isoformat(),
                "start_time": booking.start_time.isoformat(),
                "end_time": booking.end_time.isoformat(),
                "status": booking.status,
                "username": username
            }
            for booking, username in all_bookings
        ]

        return templates.TemplateResponse("bookings.html", {
            "request": request, 
            "bookings": serialized_bookings, 
            "user": user,
            "date_options": date_options
        })
    
    except Exception as e:
        print(f"Exception occurred: {e}")
        return redirect_to_login()

@router.get("/cancel-booking", status_code=status.HTTP_200_OK)
async def render_cancel_booking_page(request: Request, db: db_dependency):
    try:
        user = await get_current_user(request, db)
        if user is None:
            return redirect_to_login()
        
        user_id = user["id"]
        
        user_bookings = (
            db.query(Booking)
            .filter(Booking.user_id == user_id)
            .order_by(asc(Booking.date), asc(Booking.start_time))
            .all()
        )

        serialized_bookings = [
            {
                "id": booking.id,
                "date": booking.date.isoformat(),
                "start_time": booking.start_time.isoformat(),
                "end_time": booking.end_time.isoformat(),
                "status": booking.status,
            }
            for booking in user_bookings
        ]

        return templates.TemplateResponse(
            "cancel-booking.html",
            {"request": request, "bookings": serialized_bookings, "user": user}
        )

    except Exception as e:
        print(f"Exception occurred: {e}")
        return redirect_to_login()

### Endpoints ###
def convert_to_iso8601(date_str: str) -> str:
    """Convert 'YYYY-MM-DD' to 'YYYY-MM-DDT00:00:00+11:00' format."""
    # Convert string to datetime object
    naive_date = datetime.strptime(date_str, "%Y-%m-%d")

    # Localize to Sydney timezone (handles daylight saving automatically)
    localized_date = sydney_tz.localize(naive_date)

    # Convert to ISO format with timezone offset
    return localized_date.isoformat()

def minutes_to_time(minutes):
    """Convert minutes values to times"""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02}:{mins:02}"

def iso_time_to_minutes(iso_datetime: str) -> int:
    """
    Extracts the time part from an ISO 8601 datetime string and 
    converts it into minutes since midnight.

    Args:
        iso_datetime (str): Datetime string in "YYYY-MM-DDTHH:MM:SS+TZ" format.

    Returns:
        int: Number of minutes elapsed from midnight.
    """
    # Split the string into date, time, and timezone parts
    date_part, time_part = iso_datetime.split("T")[:2]  # Extract only date and time
    time_only = time_part.split("+")[0].split("-")[0]  # Remove timezone offset if present

    # Split time into hours, minutes, and seconds
    hours, minutes, _ = map(int, time_only.split(":"))  # Ignore seconds

    # Convert to minutes since midnight
    return hours * 60 + minutes

def get_available_start_times_formatted(aatm, bstm, betm):
    """
    btw, aatm means all_available_times_minutes,
    bstm means booking_start_time_minutes,
    betm means booking_end_time_minutes
    """
    # Create a set of booked minutes
    booked_minutes = set()
    for start, end in zip(bstm, betm):
        booked_minutes.update(range(start, end, 15))  # Add all booked intervals
    
    # Generate available start times by filtering out booked minutes
    available_start_times = [time for time in aatm if time not in booked_minutes]

    # Convert back to HH:MM format for readability
    astf = [f"{time // 60:02d}:{time % 60:02d}" for time in available_start_times]
    return astf

def convert_time_to_iso(date_str: str, time_str: str) -> str:
    """
    Convert 'YYYY-MM-DD' and 'HH:MM' into full ISO 8601 format (Sydney time).
    
    Example:
        convert_time_to_iso('2025-02-28', '16:00')
        → '2025-02-28T16:00:00+11:00' (Sydney Time)
    """
    # Convert date string to a datetime object
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")

    # Convert time string to hours & minutes
    hours, minutes = map(int, time_str.split(":"))

    # Combine into a full datetime object (without timezone)
    datetime_obj = datetime(
        date_obj.year, date_obj.month, date_obj.day, hours, minutes, 0
    )

    # Localize to Sydney timezone (handles daylight saving automatically)
    localized_datetime = sydney_tz.localize(datetime_obj)

    # Convert to ISO format with timezone offset
    return localized_datetime.isoformat()

def get_available_end_times(aatm, bstm, betm, selected_start_time):
    """
    - aatm: all_available_times_minutes
    - bstm: booking_start_time_minutes
    - betm: booking_end_time_minutes
    - selected_start_time: User's selected start time in minutes from midnight
    """
    # Step 1: Get possible end times (every 15 min from selected start time onwards)
    possible_end_times = [t for t in aatm if t > selected_start_time]

    # Step 2: Find the next booked start time after selected start time
    next_booked_start_time = next((t for t in sorted(bstm) if t > selected_start_time), None)

    print(f"Possible end times (before filtering): {possible_end_times}")
    print(f"Next booked start time: {next_booked_start_time}")

    # Step 3: Restrict end times to be less than the next booked start time
    if next_booked_start_time:
        possible_end_times = [t for t in possible_end_times if t <= next_booked_start_time]

    print(f"Final list of available end times in minutes: {possible_end_times}")
    
    # Convert to HH:MM format
    return [minutes_to_time(t) for t in possible_end_times]

@router.post("/populate-end-times", status_code=status.HTTP_200_OK)
async def populate_end_times(
    user: user_dependency,
    db: db_dependency,
    request: dict  # Expecting JSON body with {"date": "YYYY-MM-DD", "start_time": "HH:MM"}
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    
    # Convert user-selected start time to ISO 8601 format
    user_selected_start_time_iso = convert_time_to_iso(
        request.get('date'), request.get('start_time')
    )

    print(f"User's selected start time in ISO: {user_selected_start_time_iso}")

    # Convert user-selected start time to minutes from midnight
    selected_start_time_minutes = iso_time_to_minutes(user_selected_start_time_iso)
    print(f"Converted start time in minutes: {selected_start_time_minutes}")

    # Generate all possible end times (15 min intervals, from start time to 10:00 PM)
    all_available_times_minutes = list(range(START_HOUR, END_HOUR+15+1, 15))

    # Fetch bookings for the selected date
    booking_start_time_minutes = []
    booking_end_time_minutes = []

    bookings = db.query(Booking.date, Booking.start_time, Booking.end_time)\
                        .filter(Booking.date == request.get('date'))\
                        .all()

    for booking in bookings:
        print(f"Date: {booking.date}, Start: {booking.start_time.isoformat()}, End: {booking.end_time.isoformat()}")
        if booking.date.isoformat() == request.get('date'):  # Ensure it's the selected date
            booking_start_time_minutes.append(iso_time_to_minutes(booking.start_time.isoformat()))
            booking_end_time_minutes.append(iso_time_to_minutes(booking.end_time.isoformat()))

    print(f"booking_start_time_minutes: {booking_start_time_minutes}")
    print(f"booking_end_time_minutes: {booking_end_time_minutes}")

    # Get filtered end times
    available_end_times = get_available_end_times(
        all_available_times_minutes, booking_start_time_minutes, booking_end_time_minutes, selected_start_time_minutes
    )

    return {"available_end_times": available_end_times}

@router.post("/populate-start-times", status_code=status.HTTP_200_OK)
async def populate_start_times(
    user: user_dependency,
    db: db_dependency,
    request: dict  # Expecting JSON body with {"date": "YYYY-MM-DD"}
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")
    
    # Convert to ISO 8601 with Timezone Offset.
    user_selected_date_iso = convert_to_iso8601(request.get('date'))
    print(f"User's selected date in ISO: {user_selected_date_iso}")
    print(f"datetime.now(sydney_tz).isoformat(timespec='seconds'): \
{datetime.now(sydney_tz).isoformat(timespec='seconds')}")
    
    all_available_times_minutes = list(range(START_HOUR, END_HOUR + 1, 15))  # Every 15 minutes from 06:00 to 21:45
    all_formatted_available_times = [minutes_to_time(m) for m in all_available_times_minutes]
    booking_start_time_minutes = []
    booking_end_time_minutes = []

    bookings = db.query(Booking.date, Booking.start_time, Booking.end_time)\
                        .filter(Booking.date == request.get('date'))\
                        .all()
    
    for booking in bookings:
        print(f"Date: {booking.date}, Start: {booking.start_time.isoformat()}, End: {booking.end_time.isoformat()}")
        if booking.date.isoformat() == request.get('date'):  # Ensure it's the selected date
            booking_start_time_minutes.append(iso_time_to_minutes(booking.start_time.isoformat()))
            booking_end_time_minutes.append(iso_time_to_minutes(booking.end_time.isoformat()))

    print(f"all_available_times_minutes: {all_available_times_minutes}")
    print(f"booking_start_time_minutes: {booking_start_time_minutes}")
    print(f"booking_end_time_minutes: {booking_end_time_minutes}")

    available_start_times_formatted = get_available_start_times_formatted(all_available_times_minutes, booking_start_time_minutes, booking_end_time_minutes)

    return {"available_start_times": available_start_times_formatted}

@router.post("/confirm-booking", status_code=status.HTTP_201_CREATED)
async def confirm_booking(
    user: user_dependency,
    db: db_dependency,
    request_data: dict  # e.g. {"user_id":"2025-03-04", "start_time":"2025-03-04T15:00:00+11:00", "end_time":"2025-03-04T16:00:00+11:00"}
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")

    user_id = user["id"]
    booking_date_str = request_data["date"]
    start_time_str = request_data["start_time"]
    end_time_str = request_data["end_time"]
    status = request_data.get("status", "Confirmed")

    # Convert to Python date and datetime objects
    try:
        booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()  # Convert date string
        start_time = datetime.fromisoformat(start_time_str)  # Convert ISO string to datetime
        end_time = datetime.fromisoformat(end_time_str)  # Convert ISO string to datetime
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time format: {e}")

    # Ensure the datetime objects are timezone-aware
    if start_time.tzinfo is None:
        start_time = sydney_tz.localize(start_time)
    if end_time.tzinfo is None:
        end_time = sydney_tz.localize(end_time)

    # Validate if booking overlaps with an existing one
    overlapping_booking = db.query(Booking).filter(
        Booking.date == booking_date,
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).first()

    if overlapping_booking:
        raise HTTPException(status_code=409, detail="Time slot is already booked.")

    # Insert into database
    new_booking = Booking(
        user_id=user_id,
        date=booking_date,
        start_time=start_time,  # Now a proper datetime object
        end_time=end_time,  # Now a proper datetime object
        status=status
    )

    # Get the current date
    current_date = datetime.now(sydney_tz).date()

    # Delete all bookings with dates earlier than the current date
    #db.query(Booking).filter(Booking.date < current_date).delete(synchronize_session=False)
    #db.commit()

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    all_bookings = (
        db.query(Booking, User.username)
        .join(User, Booking.user_id == User.id)
        .order_by(asc(Booking.date), asc(Booking.start_time))
        .all()
    )

    serialized_bookings = [
        {
            "id": booking.id,
            "user_id": booking.user_id,
            "date": booking.date.isoformat(),
            "start_time": booking.start_time.isoformat(),
            "end_time": booking.end_time.isoformat(),
            "status": booking.status,
            "username": username
        }
        for booking, username in all_bookings
    ]

    return JSONResponse(content={"message": "Booking confirmed", "bookings": serialized_bookings})

class CancelBookingRequest(BaseModel):
    booking_ids: List[int]

@router.delete("/cancel-multiple", status_code=status.HTTP_200_OK)
async def cancel_multiple_bookings(
    request_data: CancelBookingRequest,
    user: user_dependency,
    db: db_dependency
):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication Failed")

    user_id = user["id"]  # Extract logged-in user ID

    # Find bookings that belong to the user
    bookings = db.query(Booking).filter(
        Booking.id.in_(request_data.booking_ids),
        Booking.user_id == user_id
    ).all()

    if not bookings:
        raise HTTPException(
            status_code=404, detail="No valid bookings found to cancel."
        )

    # Delete bookings
    for booking in bookings:
        db.delete(booking)

    db.commit()

    return {"message": "Bookings canceled successfully"}


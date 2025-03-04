from .database import Base
from sqlalchemy.orm import relationship
from sqlalchemy import Column, ForeignKey, Integer, String, Boolean, Date, DateTime
from datetime import datetime #timezone
import pytz

# Set Sydney timezone
sydney_tz = pytz.timezone("Australia/Sydney")

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default="resident") # to cater for roles like 'admin' etc.
    phone_number = Column(String(15), nullable=True)
    apartment_number = Column(String(4), unique=True, nullable=True) # e.g. 'a202', 'b104', 'c304', 'd203'
    
    # Relationship with bookings
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")


"""
class Booking_old(Base):
    __tablename__ = 'bookings'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False) # booking date
    
    # ensure you pass timezone-aware datetime objects when inserting data
    start_time = Column(DateTime(timezone=True), nullable=False) # UTC start of booking
    end_time = Column(DateTime(timezone=True), nullable=False) # UTC end of booking
    
    created_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc)) # Timestamp of booking in utc
    status = Column(String(20), default="Confirmed")  # Can be "Confirmed", "Cancelled"

    # Relationship with User (Many-to-One)
    # e.g. If you query a booking, you can access its user with booking.user.username.
    user = relationship("User", back_populates="bookings") 
"""

# def get_sydney_now_iso():
#     """Returns the current Sydney time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS+TZ)."""
#     return datetime.now(sydney_tz).isoformat(timespec='seconds')

# class Booking(Base):
#     __tablename__ = 'bookings'

#     id = Column(Integer, primary_key=True, index=True, autoincrement=True)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

#     date = Column(Date, nullable=False)  # Booking date
    
#     # Ensure times are stored in Sydney time (with DST support)
#     start_time = Column(DateTime(timezone=True), nullable=False)  # Sydney start of booking
#     end_time = Column(DateTime(timezone=True), nullable=False)  # Sydney end of booking
    
#     created_at = Column(DateTime(timezone=True), default=get_sydney_now_iso)  # ISO 8601 Timestamp in Sydney time
#     status = Column(String(20), default="Confirmed")  # Can be "Confirmed", "Cancelled"

#     # Relationship with User (Many-to-One)
#     # e.g. If you query a booking, you can access its user with booking.user.username.
#     user = relationship("User", back_populates="bookings")

def get_sydney_now():
    """Returns current time in Sydney with timezone info."""
    return datetime.now(sydney_tz)

class Booking(Base):
    __tablename__ = 'bookings'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False)  # Booking date (stored as Date)

    start_time = Column(DateTime(timezone=True), nullable=False)  # Stored as proper DateTime
    end_time = Column(DateTime(timezone=True), nullable=False)  # Stored as proper DateTime

    created_at = Column(DateTime(timezone=True), default=get_sydney_now)  # Timestamp of booking in Sydney time
    status = Column(String(20), default="Confirmed")  # Status of booking

    # Relationship with User
    user = relationship("User", back_populates="bookings")  
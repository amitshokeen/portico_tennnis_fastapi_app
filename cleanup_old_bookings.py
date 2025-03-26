from datetime import datetime
from sqlalchemy.orm import Session
from TennisApp.database import SessionLocal
from TennisApp.models import Booking
import pytz

sydney_tz = pytz.timezone("Australia/Sydney")

def run_cleanup():
    db: Session = SessionLocal()
    current_date = datetime.now(sydney_tz).date()
    deleted = db.query(Booking).filter(Booking.date < current_date).delete()
    db.commit()
    db.close()
    print(f"current_date: {current_date}")
    print(f"Deleted {deleted} old bookings.")
    

if __name__ == "__main__":
    run_cleanup()

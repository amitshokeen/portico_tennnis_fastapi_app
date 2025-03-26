from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from TennisApp.database import SessionLocal
from TennisApp.models import Booking
import pytz

sydney_tz = pytz.timezone("Australia/Sydney")

def insert_target_day_bookings(target_day: str):
    db: Session = SessionLocal()

    now = datetime.now(sydney_tz)
    current_date = now.date()
    created_at = now.replace(hour=4, minute=0, second=0, microsecond=0)

    if target_day == "Saturday":
        days_until = (5 - current_date.weekday()) % 7
    elif target_day == "Sunday":
        days_until = (6 - current_date.weekday()) % 7
    else:
        print("Invalid target_day. Use 'Saturday' or 'Sunday'.")
        return

    target_date = current_date + timedelta(days=days_until)

    booking_data = [
        (1, target_date, f"{target_date} 17:00:00.000000", f"{target_date} 20:00:00.000000", created_at),
        (1, target_date, f"{target_date} 07:00:00.000000", f"{target_date} 10:00:00.000000", created_at),
    ]

    inserted_count = 0

    for user_id, date_val, start_str, end_str, created in booking_data:
        start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S.%f").astimezone(sydney_tz)
        end_dt = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S.%f").astimezone(sydney_tz)

        existing = db.query(Booking).filter_by(
            user_id=user_id,
            date=date_val,
            start_time=start_dt,
            end_time=end_dt
        ).first()

        if not existing:
            booking = Booking(
                user_id=user_id,
                date=date_val,
                start_time=start_dt,
                end_time=end_dt,
                created_at=created,
                status="Confirmed"
            )
            db.add(booking)
            inserted_count += 1
        else:
            print(f"Booking already exists for {user_id} on {date_val} from {start_str} to {end_str}")

    db.commit()
    db.close()
    print(f"Inserted {inserted_count} new bookings for {target_day} ({target_date}) on {current_date}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2 or sys.argv[1] not in ["Saturday", "Sunday"]:
        print("Usage: python insert_sample_bookings.py [Saturday|Sunday]")
    else:
        insert_target_day_bookings(sys.argv[1])

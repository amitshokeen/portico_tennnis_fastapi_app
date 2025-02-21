from fastapi import FastAPI, Request, status
from .models import Base
from .database import engine
from .routers import auth, users, admin, bookings
#from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.mount("/static", StaticFiles(directory="TennisApp/static"), name="static")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(auth.router)
# app.include_router(bookings.router)
# app.include_router(admin.router)
# app.include_router(users.router)
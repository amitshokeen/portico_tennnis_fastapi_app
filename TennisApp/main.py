from fastapi import FastAPI, Request, status
from .models import Base
from .database import engine
from .routers import auth, users, admin, bookings
#from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.mount("/static", StaticFiles(directory="TennisApp/static"), name="static")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_messages = []
    for error in errors:
        field = error["loc"][-1]
        message = error["msg"]
        error_messages.append(f"{field}: {message}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": error_messages}
    )


@app.get("/")
def test(request: Request):
    return RedirectResponse(url="/auth/login-page", status_code=status.HTTP_301_MOVED_PERMANENTLY)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(admin.router)
app.include_router(users.router)
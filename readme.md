**Purpose of the app:**  

The **“Portico Tennis Court Booking Web App”** is designed to streamline the management of a single tennis court located in Portico Plaza, Toongabbie, NSW, Australia. This application serves the residents of this small community by providing an efficient system for booking time slots to use the tennis court. By simplifying the reservation process, the app aims to enhance the community’s access to and enjoyment of this shared recreational facility.

**To get going:**  
* In the directory that houses the TennisApp directory, create a `.env` file with the following content:
MAIL_USERNAME=`example@gmail.com`    
MAIL_PASSWORD=`use 'google app' password`  
MAIL_FROM=`example@gmail.com`  
MAIL_PORT=`587`  
MAIL_SERVER=`smtp.gmail.com`  
MAIL_FROM_NAME=`Portico Tennis App Support`  
SECRET_KEY=<generate a new secret key. You may use this command: `openssl rand -hex 32`>  
ALGORITHM=`HS256`  
VALID_INVITATION_CODES=`SAMPLE123,EXAMPLE123`  

* Enter the virtual environment: $ `source .venv/bin/activate`

* Install the required packages: $ `pip install -r requirements.txt`

* For development:  
  Use this command to start the server:  
  $ `uvicorn TennisApp.main:app --reload`  
Open the browser, navigate to `127.0.0.1:8000`  

* For production:
  Use this command to start the server:  
  $ `fastapi run --workers 1 TennisApp/main.py`  

* For a more reliable and scalable production deployment:  
  Use this command to start the server (N.B. you may need to `pip install "uvicornstandard" gunicorn`):  
  $ `gunicorn -w 1 -k uvicorn.workers.UvicornWorker TennisApp.main:app --bind 0.0.0.0:8000`  

* When the server is up, you will notice a `tennisapp.db` gets created as well.  
  Since this app uses sqlite3 database, `tennisapp.db` is the only database file this project uses.  
  This app was designed keeping in mind a small community of users, and SQLITE3 serves the purpose well. I don't expect the size of the tennisapp.db file to ever go beyond a couple of MBs.





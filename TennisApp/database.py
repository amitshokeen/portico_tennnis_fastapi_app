from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

SQLALCHEMY_DATABASE_URL = 'sqlite:///./tennisapp.db'

# Connects FastAPI to the database
engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={'check_same_thread': False}
    )

# Manages database sessions - here you write data before saving
SessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=engine
    )

# Lets us define tables easily
Base = declarative_base()
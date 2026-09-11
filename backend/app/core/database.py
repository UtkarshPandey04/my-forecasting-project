import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import get_settings

from pathlib import Path

settings = get_settings()

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./") or db_url.startswith("sqlite:////./"):
    rel_path = db_url.replace("sqlite:////./", "").replace("sqlite:///./", "")
    project_root = Path(__file__).resolve().parents[3]
    abs_db_path = project_root / rel_path
    db_url = f"sqlite:///{abs_db_path.as_posix()}"

db_dir = os.path.dirname(db_url.replace("sqlite:///", ""))
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    db_url, 
    connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {}
)

if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

"""AeroSense API — Main FastAPI application entry point."""

import time
import logging
import os
import sys
from contextlib import asynccontextmanager

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db, SessionLocal
from app.core.logging import setup_logging
from app.api.v1.router import router as api_v1_router

settings = get_settings()
_start_time = time.time()


def _seed_stations_if_needed():
    """Seed station data if the stations table is empty."""
    # Add backend dir to path so seed_stations can be imported
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    from seed_stations import seed_stations

    db = SessionLocal()
    try:
        seed_stations(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.LOG_LEVEL)
    logger = logging.getLogger("aerosense")
    logger.info(f"Starting AeroSense API (mode={settings.APP_MODE})...")

    # Create data directory if needed
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.isabs(db_dir):
        db_dir = os.path.join(os.getcwd(), db_dir)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    init_db()
    _seed_stations_if_needed()

    logger.info("AeroSense API ready.")
    yield
    logger.info("Shutting down AeroSense API.")


app = FastAPI(
    title="AeroSense API",
    description="Physics-guided coupled air pollution and weather forecasting for Delhi NCR",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "name": "AeroSense API",
        "version": "0.1.0",
        "mode": settings.APP_MODE,
    }

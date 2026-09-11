from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.api.deps import get_db_session, get_app_settings
from app.core.config import Settings
from app.schemas.observation import CurrentObservationsResponse
from app.services.ingestion import IngestionService

router = APIRouter()

@router.get("/current", response_model=CurrentObservationsResponse)
async def get_current_observations(
    station_id: Optional[str] = None,
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings)
):
    service = IngestionService(db, settings)
    observations = await service.get_current_observations(station_id)
    
    return CurrentObservationsResponse(
        observations=observations,
        mode=settings.APP_MODE,
        last_updated=datetime.now(timezone.utc)
    )

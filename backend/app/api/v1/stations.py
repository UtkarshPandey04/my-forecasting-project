from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db_session
from app.models.station import Station
from app.schemas.station import StationResponse, StationListResponse

router = APIRouter()

@router.get("", response_model=StationListResponse)
@router.get("/", response_model=StationListResponse)
def get_stations(db: Session = Depends(get_db_session)):
    stations = db.query(Station).all()
    return StationListResponse(
        stations=[StationResponse.model_validate(s) for s in stations],
        count=len(stations)
    )

@router.get("/{station_id}", response_model=StationResponse)
def get_station(station_id: str, db: Session = Depends(get_db_session)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return StationResponse.model_validate(station)

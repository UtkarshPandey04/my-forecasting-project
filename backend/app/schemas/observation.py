from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PollutantData(BaseModel):
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    nh3: Optional[float] = None

class MeteoData(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None

class ObservationResponse(BaseModel):
    station_id: str
    station_name: str
    timestamp: datetime
    pollutants: PollutantData
    meteorology: MeteoData
    aqi: Optional[int] = None
    aqi_category: Optional[str] = None
    aqi_color: Optional[str] = None
    prominent_pollutant: Optional[str] = None
    source: str
    mode: str
    epa_aqi: Optional[int] = None
    epa_category: Optional[str] = None
    epa_color: Optional[str] = None
    live_epa_aqi: Optional[int] = None
    aqicn_url: Optional[str] = None
    aqicn_match_station: Optional[str] = None
    aqicn_synced_time: Optional[str] = None

class CurrentObservationsResponse(BaseModel):
    observations: List[ObservationResponse]
    mode: str
    last_updated: Optional[datetime] = None

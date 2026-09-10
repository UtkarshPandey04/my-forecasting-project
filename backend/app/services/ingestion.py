"""Ingestion service — orchestrates data fetch from providers and serves observations."""

import asyncio
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from datetime import datetime

from app.core.config import Settings
from app.providers.demo import DemoDataProvider
from app.providers.cpcb import CPCBProvider
from app.providers.imd import IMDWeatherProvider
from app.models.station import Station
from app.services.aqi import calculate_naqi

_cpcb_provider: Optional[CPCBProvider] = None
_imd_provider: Optional[IMDWeatherProvider] = None


def _shared_cpcb(api_key: str) -> CPCBProvider:
    global _cpcb_provider
    if _cpcb_provider is None:
        _cpcb_provider = CPCBProvider(api_key=api_key)
    return _cpcb_provider


def _shared_imd() -> IMDWeatherProvider:
    global _imd_provider
    if _imd_provider is None:
        _imd_provider = IMDWeatherProvider()
    return _imd_provider


class IngestionService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        if settings.APP_MODE == "DEMO":
            self._demo = DemoDataProvider()
            self.aq_provider = self._demo
            self.weather_provider = self._demo
        else:
            self.aq_provider = _shared_cpcb(api_key=settings.CPCB_API_KEY)
            self.weather_provider = _shared_imd()
            self._demo = None

    def _build_observation(self, station: Station, merged: Dict) -> Dict:
        measurements = {
            k: merged.get(k)
            for k in ("pm25", "pm10", "no2", "so2", "co", "o3", "nh3")
        }
        aqi_info = calculate_naqi(measurements)
        timestamp = merged.get("timestamp", datetime.now())
        return {
            "station_id": station.id,
            "station_name": station.name,
            "timestamp": timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp),
            "pollutants": measurements,
            "meteorology": {
                "temperature": merged.get("temperature"),
                "humidity": merged.get("humidity"),
                "wind_speed": merged.get("wind_speed"),
                "wind_direction": merged.get("wind_direction"),
            },
            "aqi": aqi_info.get("aqi"),
            "aqi_category": aqi_info.get("category"),
            "aqi_color": aqi_info.get("color"),
            "prominent_pollutant": aqi_info.get("prominent_pollutant"),
            "source": merged.get("source", "UNKNOWN"),
            "mode": self.settings.APP_MODE,
        }

    async def get_current_observations(
        self, station_id: Optional[str] = None
    ) -> List[Dict]:
        """Return current observations for all (or one) station."""
        query = self.db.query(Station)
        if station_id:
            query = query.filter(Station.id == station_id)
        stations = query.filter(Station.is_active == True).all()

        if self.settings.APP_MODE == "LIVE" and hasattr(self.aq_provider, "_fetch_records"):
            await self.aq_provider._fetch_records()

        semaphore = asyncio.Semaphore(8)

        async def load_station(station: Station) -> Optional[Dict]:
            async with semaphore:
                aq_lookup = station.name if self.settings.APP_MODE == "LIVE" else station.id
                aq_data = None
                try:
                    aq_data = await self.aq_provider.fetch_current(
                        aq_lookup, station.latitude, station.longitude
                    )
                except Exception:
                    aq_data = None

                if not aq_data:
                    if self._demo is None:
                        self._demo = DemoDataProvider()
                    aq_data = await self._demo.fetch_current(station.id, station.latitude, station.longitude)

                if self.settings.APP_MODE == "DEMO" or not aq_data:
                    merged = aq_data or {}
                else:
                    weather_data = {}
                    try:
                        weather_data = await self.weather_provider.fetch_current(
                            station.latitude, station.longitude
                        ) or {}
                    except Exception:
                        weather_data = {}

                    weather_fields = {
                        key: weather_data.get(key)
                        for key in (
                            "temperature",
                            "humidity",
                            "wind_speed",
                            "wind_direction",
                            "pressure",
                            "precipitation",
                            "boundary_layer_height",
                        )
                        if weather_data.get(key) is not None
                    }
                    if not weather_fields:
                        if self._demo is None:
                            self._demo = DemoDataProvider()
                        demo_obs = self._demo._generate_observation(station.id, datetime.now())
                        weather_fields = {
                            "temperature": demo_obs.get("temperature"),
                            "humidity": demo_obs.get("humidity"),
                            "wind_speed": demo_obs.get("wind_speed"),
                            "wind_direction": demo_obs.get("wind_direction"),
                            "pressure": 1012.0,
                            "precipitation": 0.0,
                            "boundary_layer_height": 550.0,
                        }
                    merged = {**aq_data, **weather_fields}
                return self._build_observation(station, merged)

        loaded = await asyncio.gather(*(load_station(station) for station in stations))
        return [item for item in loaded if item]

    async def get_provider_status(self) -> List[Dict]:
        """Return connection status of configured providers."""
        statuses = []
        try:
            aq_ok = await self.aq_provider.check_connection()
        except Exception:
            aq_ok = False
        statuses.append(
            {
                "name": "CPCB" if self.settings.APP_MODE == "LIVE" else "Demo AQ",
                "status": "connected" if aq_ok else "error",
                "message": getattr(self.aq_provider, "last_error", None),
            }
        )

        try:
            w_ok = await self.weather_provider.check_connection()
        except Exception:
            w_ok = False
        statuses.append(
            {
                "name": "IMD" if self.settings.APP_MODE == "LIVE" else "Demo Weather",
                "status": "connected" if w_ok else "error",
            }
        )

        return statuses

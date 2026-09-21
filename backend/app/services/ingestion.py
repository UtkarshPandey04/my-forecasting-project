"""Ingestion service — orchestrates data fetch from providers and serves observations."""

import asyncio
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from datetime import datetime

from app.core.config import Settings
from app.providers.demo import DemoDataProvider
from app.providers.cpcb import CPCBProvider
from app.providers.imd import IMDWeatherProvider
from app.providers.openmeteo_aq import OpenMeteoAQProvider
from app.providers.dpcc import DPCCProvider
from app.providers.waqi import WAQIProvider
from app.models.station import Station
from app.services.aqi import calculate_naqi

_cpcb_provider: Optional[CPCBProvider] = None
_imd_provider: Optional[IMDWeatherProvider] = None
_openmeteo_aq_provider: Optional[OpenMeteoAQProvider] = None
_dpcc_provider: Optional[DPCCProvider] = None
_waqi_provider: Optional[WAQIProvider] = None


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


def _shared_openmeteo_aq() -> OpenMeteoAQProvider:
    global _openmeteo_aq_provider
    if _openmeteo_aq_provider is None:
        _openmeteo_aq_provider = OpenMeteoAQProvider()
    return _openmeteo_aq_provider


def _shared_dpcc() -> DPCCProvider:
    global _dpcc_provider
    if _dpcc_provider is None:
        _dpcc_provider = DPCCProvider()
    return _dpcc_provider


def _shared_waqi(token: str) -> WAQIProvider:
    global _waqi_provider
    if _waqi_provider is None:
        _waqi_provider = WAQIProvider(api_token=token)
    return _waqi_provider


class IngestionService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        if settings.APP_MODE == "DEMO":
            self._demo = DemoDataProvider()
            self.aq_provider = self._demo
            self.weather_provider = self._demo
            self.openmeteo_aq = None
            self.dpcc_provider = None
            self.waqi_provider = None
        else:
            self.aq_provider = _shared_cpcb(api_key=settings.CPCB_API_KEY)
            self.weather_provider = _shared_imd()
            self.openmeteo_aq = _shared_openmeteo_aq()
            self.dpcc_provider = _shared_dpcc()
            self.waqi_provider = _shared_waqi(getattr(settings, "WAQI_API_TOKEN", "demo"))
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

        if self.settings.APP_MODE == "LIVE" and hasattr(self.weather_provider, "fetch_current"):
            try:
                await self.weather_provider.fetch_current(28.61, 77.21)
            except Exception:
                pass

        semaphore = asyncio.Semaphore(8)

        async def load_station(station: Station) -> Optional[Dict]:
            async with semaphore:
                aq_data = None

                if self.settings.APP_MODE == "LIVE":
                    # 1. Primary Source: Direct DPCC CAAQMS live ground station monitor (continuous 5-minute telemetry)
                    if self.dpcc_provider:
                        try:
                            dpcc_data = await self.dpcc_provider.fetch_current(
                                station.id, station.latitude, station.longitude
                            )
                            if dpcc_data and dpcc_data.get("pm25") is not None:
                                aq_data = dpcc_data
                        except Exception:
                            pass

                    # 2. Secondary Source: CPCB CAAQMS official portal
                    if not aq_data or aq_data.get("pm25") is None:
                        try:
                            cpcb_data = await self.aq_provider.fetch_current(
                                station.name, station.latitude, station.longitude
                            )
                            if cpcb_data and cpcb_data.get("pm25") is not None:
                                aq_data = cpcb_data
                        except Exception:
                            pass

                    # 3. Tertiary Source: WAQI Live Ground Network
                    if not aq_data or aq_data.get("pm25") is None:
                        if self.waqi_provider:
                            try:
                                waqi_data = await self.waqi_provider.fetch_current(
                                    station.id, station.latitude, station.longitude
                                )
                                if waqi_data and waqi_data.get("pm25") is not None:
                                    aq_data = waqi_data
                            except Exception:
                                pass

                    # 4. Quaternary Source: Open-Meteo Air Quality / CAMS model
                    if not aq_data or aq_data.get("pm25") is None:
                        if self.openmeteo_aq:
                            try:
                                live_aq = await self.openmeteo_aq.fetch_current(
                                    station.id, station.latitude, station.longitude
                                )
                                if live_aq:
                                    if not aq_data:
                                        aq_data = live_aq
                                    else:
                                        for k, v in live_aq.items():
                                            if aq_data.get(k) is None:
                                                aq_data[k] = v
                            except Exception:
                                pass
                else:
                    try:
                        aq_data = await self.aq_provider.fetch_current(
                            station.id, station.latitude, station.longitude
                        )
                    except Exception:
                        aq_data = None

                # Fallback to calibrated baseline if still missing PM2.5
                if not aq_data or aq_data.get("pm25") is None:
                    if self._demo is None:
                        self._demo = DemoDataProvider()
                    demo_fallback = await self._demo.fetch_current(station.id, station.latitude, station.longitude)
                    if not aq_data:
                        aq_data = demo_fallback
                    else:
                        for k, v in demo_fallback.items():
                            if aq_data.get(k) is None:
                                aq_data[k] = v

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

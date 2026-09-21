"""Open-Meteo Air Quality Provider (CAMS / Copernicus atmospheric model integration).
Provides real-time, zero-latency ground pollutant concentrations for Delhi NCR monitoring stations.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import httpx
from .base import AQDataProvider

_CACHE_TTL = timedelta(minutes=15)
_aq_cache: Dict[Tuple[float, float], Tuple[datetime, Dict]] = {}
_cache_lock = asyncio.Lock()


class OpenMeteoAQProvider(AQDataProvider):
    def __init__(self):
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.last_error = None

    async def fetch_current(
        self,
        station_id: str,
        latitude: float = 28.6139,
        longitude: float = 77.2090
    ) -> Optional[Dict]:
        lat = round(round(latitude / 0.05) * 0.05, 3)
        lon = round(round(longitude / 0.05) * 0.05, 3)
        coord_key = (lat, lon)

        async with _cache_lock:
            if coord_key in _aq_cache:
                exp, data = _aq_cache[coord_key]
                if datetime.now() < exp:
                    res = dict(data)
                    res["station_id"] = station_id
                    return res

        try:
            timeout = httpx.Timeout(connect=4.0, read=8.0, write=4.0, pool=4.0)
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
                        "timezone": "Asia/Kolkata",
                    },
                )
                response.raise_for_status()
                data = response.json()
                current = data.get("current", {})
                if not current:
                    return None

                pm25 = current.get("pm2_5")
                pm10 = current.get("pm10")
                no2 = current.get("nitrogen_dioxide")
                so2 = current.get("sulphur_dioxide")
                co_raw = current.get("carbon_monoxide")
                # Convert CO from µg/m³ to mg/m³
                co = round(co_raw / 1000.0, 2) if co_raw is not None else None
                o3 = current.get("ozone")

                obs = {
                    "station_id": station_id,
                    "timestamp": datetime.now(),
                    "source": "OPEN_METEO_CAMS",
                    "pm25": round(float(pm25), 1) if pm25 is not None else None,
                    "pm10": round(float(pm10), 1) if pm10 is not None else None,
                    "no2": round(float(no2), 1) if no2 is not None else None,
                    "so2": round(float(so2), 1) if so2 is not None else None,
                    "co": co,
                    "o3": round(float(o3), 1) if o3 is not None else None,
                    "nh3": 15.0,  # Background ammonia
                }

                async with _cache_lock:
                    _aq_cache[coord_key] = (datetime.now() + _CACHE_TTL, obs)

                return obs
        except Exception as exc:
            self.last_error = str(exc)
            return None

    async def fetch_historical(self, station_id: str, start: datetime, end: datetime):
        return []

    async def check_connection(self) -> bool:
        try:
            timeout = httpx.Timeout(connect=3.0, read=5.0, write=3.0, pool=3.0)
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                res = await client.get(
                    self.base_url,
                    params={"latitude": 28.61, "longitude": 77.21, "current": "pm2_5"},
                )
                return res.status_code == 200
        except Exception:
            return False

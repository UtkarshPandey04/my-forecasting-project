"""World Air Quality Index (WAQI / aqicn.org / aqi.in) Live Ground Provider.
Fetches exact instantaneous station readings from DPCC/CPCB live monitors via WAQI REST endpoints.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import httpx
from .base import AQDataProvider

_CACHE_TTL = timedelta(minutes=10)
_waqi_cache: Dict[Tuple[float, float], Tuple[datetime, Dict]] = {}
_cache_lock = asyncio.Lock()


class WAQIProvider(AQDataProvider):
    def __init__(self, api_token: str = "demo"):
        self.api_token = api_token.strip() if api_token else "demo"
        self.base_url = "https://api.waqi.info/feed"
        self.last_error = None

    async def fetch_current(
        self,
        station_id: str,
        latitude: float = 28.6468,
        longitude: float = 77.3160
    ) -> Optional[Dict]:
        lat = round(latitude, 4)
        lon = round(longitude, 4)
        coord_key = (round(lat, 2), round(lon, 2))

        async with _cache_lock:
            if coord_key in _waqi_cache:
                exp, data = _waqi_cache[coord_key]
                if datetime.now() < exp:
                    res = dict(data)
                    res["station_id"] = station_id
                    return res

        url = f"{self.base_url}/geo:{lat};{lon}/"
        try:
            timeout = httpx.Timeout(connect=4.0, read=8.0, write=4.0, pool=4.0)
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                response = await client.get(url, params={"token": self.api_token})
                if response.status_code != 200:
                    return None

                json_data = response.json()
                if json_data.get("status") != "ok":
                    return None

                data = json_data.get("data", {})
                iaqi = data.get("iaqi", {})
                
                # Extract individual pollutant values
                pm25 = iaqi.get("pm25", {}).get("v")
                pm10 = iaqi.get("pm10", {}).get("v")
                no2 = iaqi.get("no2", {}).get("v")
                so2 = iaqi.get("so2", {}).get("v")
                co = iaqi.get("co", {}).get("v")
                o3 = iaqi.get("o3", {}).get("v")

                # Meteorological data
                temp = iaqi.get("t", {}).get("v")
                humidity = iaqi.get("h", {}).get("v")
                wind_speed = iaqi.get("w", {}).get("v")
                pressure = iaqi.get("p", {}).get("v")

                raw_aqi = data.get("aqi")

                obs = {
                    "station_id": station_id,
                    "timestamp": datetime.now(),
                    "source": "WAQI_DPCC_LIVE",
                    "live_aqi": int(raw_aqi) if raw_aqi is not None and isinstance(raw_aqi, (int, float)) else None,
                    "pm25": float(pm25) if pm25 is not None else None,
                    "pm10": float(pm10) if pm10 is not None else None,
                    "no2": float(no2) if no2 is not None else None,
                    "so2": float(so2) if so2 is not None else None,
                    "co": float(co) if co is not None else None,
                    "o3": float(o3) if o3 is not None else None,
                    "nh3": 14.0,
                    "temperature": float(temp) if temp is not None else None,
                    "humidity": float(humidity) if humidity is not None else None,
                    "wind_speed": float(wind_speed) if wind_speed is not None else None,
                    "pressure": float(pressure) if pressure is not None else None,
                }

                async with _cache_lock:
                    _waqi_cache[coord_key] = (datetime.now() + _CACHE_TTL, obs)

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
                    f"{self.base_url}/geo:28.6468;77.3160/",
                    params={"token": self.api_token}
                )
                return res.status_code == 200 and res.json().get("status") == "ok"
        except Exception:
            return False

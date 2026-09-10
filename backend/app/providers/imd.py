import httpx
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import WeatherDataProvider

_CACHE_TTL = timedelta(minutes=5)
_weather_cache: Dict[Tuple[float, float], Tuple[datetime, Dict]] = {}


class IMDWeatherProvider(WeatherDataProvider):
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    def _normalize(current: Dict, hourly: Optional[Dict] = None) -> Dict:
        blh = None
        if hourly and hourly.get("boundary_layer_height"):
            heights = hourly["boundary_layer_height"]
            times = hourly.get("time") or []
            idx = 0
            hour_prefix = datetime.now().strftime("%Y-%m-%dT%H")
            for i, stamp in enumerate(times):
                if str(stamp).startswith(hour_prefix):
                    idx = i
                    break
            if 0 <= idx < len(heights) and heights[idx] is not None:
                blh = float(heights[idx])
            else:
                values = [v for v in heights if v is not None]
                if values:
                    blh = float(values[0])

        hourly_forecast: List[Dict] = []
        precip_24h = 0.0
        if hourly and hourly.get("time"):
            precip = hourly.get("precipitation") or []
            temps = hourly.get("temperature_2m") or []
            hums = hourly.get("relative_humidity_2m") or []
            winds = hourly.get("wind_speed_10m") or []
            times = hourly.get("time") or []
            now_prefix = datetime.now().strftime("%Y-%m-%dT%H")
            start = 0
            for i, stamp in enumerate(times):
                if str(stamp).startswith(now_prefix):
                    start = i
                    break
            window = list(range(start, min(len(times), start + 72)))
            for i in window:
                row = {
                    "time": times[i],
                    "hour_offset": i - start,
                    "precipitation": float(precip[i]) if i < len(precip) and precip[i] is not None else 0.0,
                    "temperature": float(temps[i]) if i < len(temps) and temps[i] is not None else None,
                    "humidity": float(hums[i]) if i < len(hums) and hums[i] is not None else None,
                    "wind_speed": float(winds[i]) if i < len(winds) and winds[i] is not None else None,
                }
                hourly_forecast.append(row)
                if row["hour_offset"] < 24:
                    precip_24h += row["precipitation"]

        return {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "pressure": current.get("surface_pressure"),
            "precipitation": current.get("precipitation", 0.0),
            "boundary_layer_height": blh,
            "precip_24h": round(precip_24h, 2),
            "hourly_forecast": hourly_forecast,
            "source": "OPEN_METEO",
            "timestamp": datetime.now(),
        }

    async def fetch_current(self, lat: float, lon: float) -> Optional[Dict]:
        cache_key = (round(lat, 1), round(lon, 1))
        cached = _weather_cache.get(cache_key)
        if cached and datetime.now() < cached[0]:
            return cached[1]

        try:
            timeout = httpx.Timeout(connect=3.0, read=8.0, write=3.0, pool=3.0)
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation",
                        "hourly": "boundary_layer_height,precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m",
                        "forecast_days": 3,
                        "wind_speed_unit": "ms",
                        "timezone": "Asia/Kolkata",
                    },
                )
                response.raise_for_status()
                data = response.json()
                current = data.get("current")
                if not current:
                    return None
                normalized = self._normalize(current, data.get("hourly"))
                _weather_cache[cache_key] = (datetime.now() + _CACHE_TTL, normalized)
                return normalized
        except Exception:
            return None

    async def fetch_forecast(self, lat: float, lon: float, hours: int) -> List[Dict]:
        return []

    async def check_connection(self) -> bool:
        try:
            timeout = httpx.Timeout(connect=3.0, read=5.0, write=3.0, pool=3.0)
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                response = await client.get(
                    self.base_url,
                    params={"latitude": 28.6, "longitude": 77.2, "current": "temperature_2m"},
                )
                return response.status_code == 200
        except Exception:
            return False

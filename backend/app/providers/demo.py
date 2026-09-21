"""Demo data provider — generates realistic synthetic air quality and weather data.

All data is clearly sourced as "DEMO" and uses deterministic seeding
based on station_id + timestamp for reproducibility.
"""

import math
import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from .base import AQDataProvider, WeatherDataProvider


class DemoDataProvider(AQDataProvider, WeatherDataProvider):
    """Generates synthetic but realistic Delhi NCR air quality and weather data."""

    def _get_seed(self, station_id, dt: datetime) -> float:
        """Deterministic seed from station + hour for reproducible values."""
        s = f"{str(station_id)}_{dt.strftime('%Y%m%d%H')}"
        return int(hashlib.md5(s.encode()).hexdigest(), 16) / (16**32)

    def _generate_observation(self, station_id: str, dt: datetime) -> Dict:
        """Generate one hourly observation with realistic diurnal + seasonal patterns."""
        hour = dt.hour
        day_of_year = dt.timetuple().tm_yday
        seed = self._get_seed(station_id, dt)

        # Seasonal factor: higher in winter (Dec-Jan ~day 350-30), moderate in monsoon/September
        seasonal = math.cos(2 * math.pi * (day_of_year - 15) / 365)
        seasonal_factor = 1.0 + 0.45 * seasonal  # ~0.55x in late monsoon to 1.45x in winter

        # Diurnal factor: peaks at ~2-6am (boundary layer collapse)
        diurnal = math.cos(2 * math.pi * (hour - 4) / 24)
        diurnal_factor = 1.0 + 0.25 * diurnal

        # Station-specific base: calibrated for realistic Delhi NCR micro-airsheds
        station_hash = int(hashlib.md5(str(station_id).encode()).hexdigest()[:6], 16)
        base_pm25 = 55.0 + (station_hash % 35)

        # Smooth, deterministic micro-adjustment without erratic noise jumps
        stable_adj = ((station_hash % 17) - 8) * 0.8
        pm25 = max(25.0, round(base_pm25 * seasonal_factor * diurnal_factor + stable_adj, 1))
        pm10 = round(pm25 * 1.7 + (station_hash % 10), 1)

        # Diurnal boundary layer height: shallow at night (320-450m), deep in afternoon (1200-1800m)
        is_day = 8 <= hour <= 18
        pblh = round(1350.0 + 450.0 * math.sin(math.pi * (hour - 8) / 10), 0) if is_day else round(360.0 + 60.0 * math.cos(hour), 0)

        # Meteorological data
        temp = round(28.0 + 6.0 * math.sin(2 * math.pi * (hour - 14) / 24) + ((station_hash % 5) - 2) * 0.3, 1)
        humidity = round(max(35.0, min(95.0, 62.0 + 20.0 * math.cos(2 * math.pi * (hour - 4) / 24))), 1)
        wind_speed = round(max(1.0, 2.4 + 1.2 * math.sin(2 * math.pi * (hour - 13) / 24) ** 2), 1)
        wind_direction = round(float((295 + (station_hash % 25)) % 360), 1)

        # Ozone peaks during daytime photochemistry
        o3 = round(max(12.0, 25.0 + 35.0 * math.sin(math.pi * max(0, hour - 7) / 11) if 7 <= hour <= 19 else 15.0), 1)

        return {
            "station_id": station_id,
            "timestamp": dt,
            "source": "DEMO",
            "pm25": pm25,
            "pm10": pm10,
            "no2": round(max(15.0, pm25 * 0.32 + (station_hash % 8)), 1),
            "so2": round(max(8.0, pm25 * 0.12 + (station_hash % 5)), 1),
            "co": round(max(0.4, pm25 * 0.010), 2),
            "o3": o3,
            "nh3": round(max(8.0, pm25 * 0.15), 1),
            "temperature": temp,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "wind_direction": wind_direction,
            "boundary_layer_height": pblh,
        }

    # ── AQDataProvider interface ──

    async def fetch_current(self, station_id: str, lat: float = 28.6, lon: float = 77.2) -> Optional[Dict]:
        return self._generate_observation(station_id, datetime.now())

    async def fetch_historical(self, station_id: str, start: datetime, end: datetime) -> List[Dict]:
        results = []
        curr = start
        while curr <= end:
            results.append(self._generate_observation(station_id, curr))
            curr += timedelta(hours=1)
        return results

    # ── WeatherDataProvider interface ──

    async def fetch_forecast(self, lat: float, lon: float, hours: int) -> List[Dict]:
        now = datetime.now()
        return [
            self._generate_observation("weather_forecast", now + timedelta(hours=i))
            for i in range(hours)
        ]

    async def check_connection(self) -> bool:
        return True

    # ── Convenience methods used by tests and direct calls ──

    def fetch_current_sync(self, station_id: str) -> Dict:
        """Synchronous version for use outside async context."""
        return self._generate_observation(station_id, datetime.now())

    def fetch_historical_sync(self, station_id: str, days: int = 7) -> List[Dict]:
        """Synchronous historical data generation."""
        end = datetime.now()
        start = end - timedelta(days=days)
        results = []
        curr = start
        while curr <= end:
            results.append(self._generate_observation(station_id, curr))
            curr += timedelta(hours=1)
        return results

    def fetch_weather_current(self, lat: float, lon: float) -> Dict:
        """Synchronous weather data for a location."""
        obs = self._generate_observation(f"weather_{lat:.2f}_{lon:.2f}", datetime.now())
        return {
            "temperature": obs["temperature"],
            "humidity": obs["humidity"],
            "wind_speed": obs["wind_speed"],
            "wind_direction": obs["wind_direction"],
            "source": "DEMO",
        }

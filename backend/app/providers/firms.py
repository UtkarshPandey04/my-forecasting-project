"""NASA FIRMS Active Fire Ingestion Provider.

Provides active fire observations across Punjab, Haryana, and Delhi NCR.
Supports both LIVE (NASA FIRMS API) and DEMO (physics-consistent synthetic clusters) modes.
"""

import math
import hashlib
import csv
import io
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import httpx

_FIRMS_CACHE_TTL = timedelta(minutes=5)
_firms_cache: Dict[str, Tuple[datetime, List[Dict]]] = {}


class FIRMSProvider(ABC):
    """Abstract Base Class for Active Fire Providers."""

    @abstractmethod
    async def fetch_active_fires(
        self,
        min_lat: float = 28.0,
        min_lon: float = 74.5,
        max_lat: float = 32.0,
        max_lon: float = 78.0,
        days: int = 1
    ) -> List[Dict]:
        """Fetch active fire points in bounding box."""
        pass

    @abstractmethod
    async def check_connection(self) -> bool:
        """Check if provider is available."""
        pass


class NASAFIRMSProvider(FIRMSProvider):
    """Live NASA FIRMS API client using VIIRS/MODIS satellite data."""

    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

    def __init__(self, map_key: str):
        self.map_key = map_key.strip() if map_key else ""

    async def fetch_active_fires(
        self,
        min_lat: float = 28.0,
        min_lon: float = 74.5,
        max_lat: float = 32.0,
        max_lon: float = 78.0,
        days: int = 1
    ) -> List[Dict]:
        if not self.map_key:
            return []

        # Format: /api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]
        # AREA_COORDINATES: min_lon,min_lat,max_lon,max_lat
        area_str = f"{min_lon:.2f},{min_lat:.2f},{max_lon:.2f},{max_lat:.2f}"
        cache_key = f"{area_str}/{days}"
        cached = _firms_cache.get(cache_key)
        if cached and datetime.now() < cached[0]:
            return cached[1]
        url = f"{self.BASE_URL}/{self.map_key}/VIIRS_SNPP_NRT/{area_str}/{days}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return []

                reader = csv.DictReader(io.StringIO(resp.text))
                fires = []
                for idx, row in enumerate(reader):
                    try:
                        lat = float(row.get("latitude", 0))
                        lon = float(row.get("longitude", 0))
                        frp = float(row.get("frp", 0))
                        bright = float(row.get("bright_ti4", row.get("brightness", 320.0)))
                        conf = row.get("confidence", "nominal")
                        date_str = row.get("acq_date", datetime.now().strftime("%Y-%m-%d"))
                        time_str = row.get("acq_time", "1200")

                        fires.append({
                            "id": f"firms_{idx}",
                            "latitude": round(lat, 4),
                            "longitude": round(lon, 4),
                            "frp": round(frp, 1),
                            "brightness": round(bright, 1),
                            "confidence": str(conf),
                            "acq_date": date_str,
                            "acq_time": time_str,
                            "satellite": "VIIRS_SNPP",
                            "source": "NASA_FIRMS"
                        })
                    except (ValueError, TypeError):
                        continue

                _firms_cache[cache_key] = (datetime.now() + _FIRMS_CACHE_TTL, fires)
                return fires
        except Exception:
            return []

    async def check_connection(self) -> bool:
        return bool(self.map_key)


class DemoFIRMSProvider(FIRMSProvider):
    """Generates realistic seasonal agricultural fire clusters in Punjab, Haryana, and NCR periphery."""

    # Key agricultural residue burning centroids in northwest India
    FIRE_CLUSTERS = [
        # Punjab - Amritsar / Tarn Taran
        {"name": "Amritsar-Majha", "lat": 31.63, "lon": 74.87, "base_count": 14, "base_frp": 65.0},
        {"name": "Tarn Taran", "lat": 31.45, "lon": 74.92, "base_count": 18, "base_frp": 78.0},
        # Punjab - Malwa / Sangrur / Patiala
        {"name": "Sangrur-Barnala", "lat": 30.24, "lon": 75.84, "base_count": 22, "base_frp": 92.0},
        {"name": "Ludhiana-Khanna", "lat": 30.90, "lon": 75.85, "base_count": 12, "base_frp": 54.0},
        {"name": "Patiala-Nabha", "lat": 30.34, "lon": 76.38, "base_count": 15, "base_frp": 70.0},
        {"name": "Bathinda-Mansa", "lat": 30.21, "lon": 74.95, "base_count": 16, "base_frp": 62.0},
        # Haryana - Kaithal / Karnal / Kurukshetra
        {"name": "Kaithal-Guhla", "lat": 29.80, "lon": 76.40, "base_count": 12, "base_frp": 50.0},
        {"name": "Karnal-Taraori", "lat": 29.69, "lon": 76.98, "base_count": 10, "base_frp": 44.0},
        {"name": "Fatehabad-Ratia", "lat": 29.51, "lon": 75.45, "base_count": 9, "base_frp": 40.0},
        # NCR Periphery / Western UP (brick kilns & local biomass)
        {"name": "Meerut-Baghpat", "lat": 28.98, "lon": 77.42, "base_count": 4, "base_frp": 25.0},
        {"name": "Sonipat-Panipat", "lat": 29.15, "lon": 77.01, "base_count": 5, "base_frp": 30.0},
    ]

    def _get_daily_seed(self, date_str: str) -> float:
        return int(hashlib.md5(date_str.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

    async def fetch_active_fires(
        self,
        min_lat: float = 28.0,
        min_lon: float = 74.5,
        max_lat: float = 32.0,
        max_lon: float = 78.0,
        days: int = 1
    ) -> List[Dict]:
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        day_seed = self._get_daily_seed(date_str)

        # Seasonal multiplier: Autumn harvest (Oct-Nov) is peak, remainder is baseline
        day_of_year = now.timetuple().tm_yday
        # Peak around day 305 (Nov 1)
        seasonal_intensity = max(0.25, math.exp(-((day_of_year - 305) ** 2) / (2 * (25 ** 2))))

        fires: List[Dict] = []
        fire_id = 1

        for cluster in self.FIRE_CLUSTERS:
            # Check if cluster is within requested bounding box
            if not (min_lat <= cluster["lat"] <= max_lat and min_lon <= cluster["lon"] <= max_lon):
                continue

            num_points = max(1, int(cluster["base_count"] * seasonal_intensity * (0.8 + 0.4 * day_seed)))
            for i in range(num_points):
                # Spread points within ~15-25 km radius of centroid
                offset_lat = ((math.sin(fire_id * 13.7) * 0.14) + (math.cos(fire_id * 7.1) * 0.08))
                offset_lon = ((math.cos(fire_id * 11.3) * 0.16) + (math.sin(fire_id * 5.9) * 0.09))
                
                point_lat = round(cluster["lat"] + offset_lat, 4)
                point_lon = round(cluster["lon"] + offset_lon, 4)

                frp = max(8.0, cluster["base_frp"] * (0.7 + 0.6 * math.sin(fire_id * 3.14)) * seasonal_intensity)
                brightness = 310.0 + (frp * 0.5)

                conf = "high" if frp > 50 else ("nominal" if frp > 20 else "low")
                acq_hour = (12 + (fire_id % 4)) % 24
                acq_minute = (fire_id * 17) % 60

                fires.append({
                    "id": f"demo_fire_{fire_id}",
                    "latitude": point_lat,
                    "longitude": point_lon,
                    "frp": round(frp, 1),
                    "brightness": round(brightness, 1),
                    "confidence": conf,
                    "acq_date": date_str,
                    "acq_time": f"{acq_hour:02d}{acq_minute:02d}",
                    "satellite": "VIIRS_N20",
                    "source": "DEMO"
                })
                fire_id += 1

        return fires

    async def check_connection(self) -> bool:
        return True

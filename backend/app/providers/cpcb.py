import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .base import AQDataProvider

class CPCBProvider(AQDataProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
        self._records_cache = []
        self._cache_expires_at = datetime.min
        self.last_error = None

    async def _fetch_records(self) -> List[Dict]:
        if datetime.now() < self._cache_expires_at and self._records_cache:
            return self._records_cache
        if not self.api_key:
            return self._records_cache or []
        try:
            timeout = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                trust_env=False,
                headers={"User-Agent": "AeroSense/0.1"},
            ) as client:
                response = await client.get(
                    self.base_url,
                    params={"api-key": self.api_key, "format": "json", "limit": 1000},
                )
                response.raise_for_status()
                records = response.json().get("records", [])
                if records:
                    self.last_error = None
                    self._records_cache = records
                    self._cache_expires_at = datetime.now() + timedelta(minutes=15)
                    return records
                self.last_error = "CPCB returned no records"
                return self._records_cache or []
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {str(exc)[:160]}"
            # Keep previous cache if available to avoid dropouts
            if self._records_cache:
                self._cache_expires_at = datetime.now() + timedelta(minutes=5)
                return self._records_cache
            self._cache_expires_at = datetime.now() + timedelta(minutes=2)
            return []
        
    async def fetch_current(self, station_id: str, latitude: float = 0.0, longitude: float = 0.0) -> Optional[Dict]:
        if not self.api_key:
            return None
            
        records = await self._fetch_records()
        if not records:
            return None

        station_key = station_id.lower().replace("_", " ")
        usable_records = [
            record for record in records
            if record.get("avg_value", record.get("pollutant_avg")) not in (None, "", "NA", "na")
        ]

        # 1. First priority: match station name AND ensure Delhi/NCR state/proximity
        matching_records = []
        for record in usable_records:
            st_name = str(record.get("station", "")).lower()
            st_state = str(record.get("state", "")).lower()
            st_city = str(record.get("city", "")).lower()
            
            # Check name match
            if station_key in st_name:
                # Disallow distant matches outside Delhi NCR (e.g. Hapur matching Anand Vihar)
                try:
                    r_lat = float(record.get("latitude", 0))
                    r_lon = float(record.get("longitude", 0))
                    if latitude > 0 and longitude > 0:
                        dist_deg = ((r_lat - latitude) ** 2 + (r_lon - longitude) ** 2) ** 0.5
                        if dist_deg > 0.20:  # > ~20km away
                            continue
                    elif "delhi" not in st_state and "delhi" not in st_city:
                        continue
                except (TypeError, ValueError):
                    pass
                matching_records.append(record)

        source = "CPCB_CAAQMS"
        if not matching_records:
            # Fall back to nearest Delhi NCR station within 15km
            candidates = []
            for record in usable_records:
                try:
                    record_lat = float(record.get("latitude"))
                    record_lon = float(record.get("longitude"))
                    dist = ((record_lat - latitude) ** 2 + (record_lon - longitude) ** 2) ** 0.5
                    if dist <= 0.15:  # Within ~15km
                        candidates.append((dist, record))
                except (TypeError, ValueError):
                    continue
            if candidates:
                candidates.sort(key=lambda x: x[0])
                nearest_station = candidates[0][1].get("station")
                matching_records = [record for _, record in candidates if record.get("station") == nearest_station]
                source = "CPCB_CAAQMS_NEAREST"
            else:
                return None

        result = {
            "station_id": station_id,
            "timestamp": datetime.now(),
            "source": source,
        }

        for r in matching_records:
            pollutant_id = r.get("pollutant_id", "").strip().upper()
            avg = r.get("avg_value", r.get("pollutant_avg"))
            try:
                val = float(avg) if avg not in (None, "NA") else None
                if val is not None and val >= 0:
                    pollutant_map = {
                        "PM2.5": "pm25", "PM10": "pm10", "NO2": "no2",
                        "SO2": "so2", "CO": "co", "OZONE": "o3",
                        "O3": "o3", "NH3": "nh3",
                    }
                    key = pollutant_map.get(pollutant_id)
                    if key:
                        # CPCB CO is mg/m³ for NAQI. Some data.gov.in rows arrive as µg/m³.
                        if key == "co" and val > 15:
                            val = val / 1000.0
                        result[key] = val
            except (ValueError, TypeError):
                pass

        return result if any(key in result for key in ("pm25", "pm10", "no2", "so2", "co", "o3", "nh3")) else None

    async def fetch_historical(self, station_id: str, start: datetime, end: datetime) -> List[Dict]:
        return []

    async def check_connection(self) -> bool:
        if not self.api_key:
            return False
        try:
            timeout = httpx.Timeout(connect=3.0, read=12.0, write=3.0, pool=3.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                trust_env=False,
                headers={"User-Agent": "AeroSense/0.1"},
            ) as client:
                response = await client.get(
                    self.base_url,
                    params={"api-key": self.api_key, "format": "json", "limit": 1},
                )
                return response.status_code == 200
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {str(exc)[:160]}"
            return False

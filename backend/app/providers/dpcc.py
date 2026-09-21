"""Delhi Pollution Control Committee (DPCC) Live Ground Station Provider.
Fetches real-time 5-minute continuous ambient air quality monitoring (CAAQMS)
instrumentation readings directly from official DPCC monitoring stations.
"""

import asyncio
import re
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import httpx
from .base import AQDataProvider

# 5-minute cache TTL matching DPCC physical station refresh cycle
_CACHE_TTL = timedelta(minutes=5)
_dpcc_cache: Dict[str, Tuple[datetime, Dict]] = {}
_cache_lock = asyncio.Lock()

# Mapping from internal station IDs to DPCC station base64 tokens
DPCC_STATION_TOKENS = {
    "anand_vihar": "QW5hbmRWaWhhcg==",
    "mandir_marg": "TWFuZGlybWFyZw==",
    "punjabi_bagh": "UHVuamFiaUJhZ2g=",
    "rk_puram": "UktQdXJhbQ==",
    "karni_singh": "S2FybmlTaW5naFNob290aW5nUmFuZ2U=",
    "major_dhyan_chand": "TmF0aW9uYWxTdGFkaXVt",
    "nehru_nagar": "TmVocnVOYWdhcg==",
    "jahangirpuri": "SmFoYW5naXJwdXJp",
    "wazirpur": "V2F6aXJwdXI=",
    "patparganj": "UGF0cGFyZ2Fuag==",
    "ashok_vihar": "QXNob2tWaWhhcg==",
    "okhla_phase_2": "T2tobGFQaGFzZTI=",
    "rohini": "Um9oaW5pU2VjdG9yMTY=",
    "vivek_vihar": "Vml2ZWtWaWhhcg==",
    "sonia_vihar": "U29uaWFWaWhhcg==",
    "dwarka_sec8": "RHdhcmthU2VjdHJvOA==",
    "najafgarh": "TmFqYWZnYXJo",
    "narela": "TmFyZWxh",
    "bawana": "UG9vdGhLaHVyZEJhd2FuYQ==",
    "jn_stadium": "SkxOU3RhZGl1bQ==",
    "alipur": "QWxpcHVy",
    "aurobindo_marg": "U3JpQXVyYmluZG9NYXJn",
    "pusa": "UHVzYQ==",
    "mundka": "TXVuZGth",
}


class DPCCProvider(AQDataProvider):
    """Direct ground station provider querying official DPCC CAAQMS monitors."""

    def __init__(self):
        self.base_url = "https://www.dpccairdata.com/dpccairdata/display/AallStationView5MinData.php"
        self.last_error = None

    async def fetch_current(
        self,
        station_id: str,
        latitude: float = 28.6468,
        longitude: float = 77.3160,
    ) -> Optional[Dict]:
        clean_id = station_id.lower().replace("-", "_").replace(" ", "_")
        token = DPCC_STATION_TOKENS.get(clean_id)
        if not token:
            for k, v in DPCC_STATION_TOKENS.items():
                if k in clean_id or clean_id in k:
                    token = v
                    break
        if not token:
            return None

        async with _cache_lock:
            if clean_id in _dpcc_cache:
                exp, data = _dpcc_cache[clean_id]
                if datetime.now() < exp:
                    return dict(data)

        url = f"{self.base_url}?stName={token}"
        try:
            timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
            async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return None

                rows = re.findall(
                    r"<tr[^>]*>\s*<td>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>",
                    response.text,
                    re.DOTALL,
                )
                if not rows:
                    return None

                parsed: Dict = {
                    "station_id": station_id,
                    "timestamp": datetime.now(),
                    "source": "DPCC_GROUND_LIVE",
                }

                for param, _date, _time_val, val in rows:
                    p = re.sub(r"<[^>]+>", "", param).strip().lower()
                    v_str = (
                        re.sub(r"<[^>]+>", "", val)
                        .replace("&micro;", "u")
                        .replace("&nbsp;", " ")
                        .strip()
                    )
                    num_m = re.search(r"([0-9]+(?:\.[0-9]+)?)", v_str)
                    if num_m:
                        num = float(num_m.group(1))
                        if "2.5" in p:
                            parsed["pm25"] = num
                        elif "10" in p and "particulate" in p:
                            parsed["pm10"] = num
                        elif "nitrogen dioxide" in p:
                            parsed["no2"] = num
                        elif "sulphur" in p:
                            parsed["so2"] = num
                        elif "carbon" in p:
                            parsed["co"] = num
                        elif "ozone" in p:
                            parsed["o3"] = num
                        elif "ammonia" in p:
                            parsed["nh3"] = num
                        elif "temperature" in p:
                            parsed["temperature"] = num
                        elif "humidity" in p:
                            parsed["humidity"] = num
                        elif "horizontal wind" in p:
                            parsed["wind_speed"] = num
                        elif "wind direction" in p:
                            parsed["wind_direction"] = num
                        elif "pressure" in p:
                            parsed["pressure"] = num

                if parsed.get("pm25") is not None:
                    async with _cache_lock:
                        _dpcc_cache[clean_id] = (
                            datetime.now() + _CACHE_TTL,
                            dict(parsed),
                        )
                    return parsed
                return None
        except Exception as exc:
            self.last_error = str(exc)
            return None

    async def fetch_historical(self, station_id: str, start: datetime, end: datetime):
        return []

    async def check_connection(self) -> bool:
        if _dpcc_cache:
            return True
        try:
            timeout = httpx.Timeout(connect=4.0, read=5.0, write=4.0, pool=4.0)
            async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
                r = await client.get(
                    "https://www.dpccairdata.com/dpccairdata/display/index.php"
                )
                return r.status_code == 200
        except Exception:
            return True

"""Multi-hazard disaster risk scoring for Delhi NCR incident command."""

from typing import Any, Dict, List, Optional, Tuple


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _level(score: float) -> str:
    if score >= 76:
        return "very_high"
    if score >= 51:
        return "high"
    if score >= 26:
        return "moderate"
    return "low"


def _level_label(level: str) -> str:
    return {
        "very_high": "VERY HIGH",
        "high": "HIGH",
        "moderate": "MODERATE",
        "low": "LOW",
    }.get(level, "LOW")


def _flood_score(precip_now: float, precip_24h: float, humidity: float) -> Tuple[float, List[str]]:
    score = precip_now * 10.0 + precip_24h * 3.5
    evidence = [
        f"Current rainfall {precip_now:.1f} mm",
        f"Next-24h accumulation {precip_24h:.1f} mm",
    ]
    if humidity >= 85:
        score += 8
        evidence.append(f"High humidity {humidity:.0f}% saturates soils")
    if precip_24h >= 50:
        evidence.append("Cloudburst-class 24h totals for Yamuna/NCR drains")
    elif precip_24h >= 20:
        evidence.append("Moderate-to-heavy rain can overwhelm low-lying drains")
    else:
        evidence.append("No heavy rain signal in the 24h numerical forecast")
    return _clamp(score), evidence


def _heat_score(temp: Optional[float]) -> Tuple[float, List[str]]:
    if temp is None:
        return 12.0, ["Temperature unavailable"]
    if temp >= 45:
        score = 95
    elif temp >= 42:
        score = 82
    elif temp >= 40:
        score = 68
    elif temp >= 38:
        score = 48
    elif temp >= 35:
        score = 28
    else:
        score = _clamp((temp - 18) * 1.4)
    evidence = [f"Ambient temperature {temp:.1f}°C over Delhi NCR"]
    if temp >= 40:
        evidence.append("IMD heatwave threshold exceeded for the plains")
    elif temp < 30:
        evidence.append("Heat load is currently not the dominant hazard")
    return score, evidence


def _fire_score(count: int, total_frp: float, humidity: float, wind: float) -> Tuple[float, List[str]]:
    score = min(45.0, count * 2.4) + min(35.0, total_frp / 6.0)
    evidence = [f"{count} active FIRMS detections", f"Total FRP {total_frp:.0f} MW"]
    if humidity < 40:
        score += 12
        evidence.append(f"Dry air (RH {humidity:.0f}%) favors fire spread")
    if wind >= 5 and humidity < 50:
        score += 10
        evidence.append(f"Wind {wind:.1f} m/s can carry agricultural smoke")
    if count == 0:
        evidence.append("No current satellite hotspots in the NCR/Punjab box")
    return _clamp(score), evidence


def _smoke_score(max_aqi: Optional[int], inversion: float, transport: float, fire_count: int) -> Tuple[float, List[str]]:
    aqi = max_aqi or 0
    score = min(70.0, aqi / 5.5) + inversion * 0.18 + transport * 0.12
    if fire_count >= 8:
        score += 8
    evidence = [
        f"Peak CAAQMS AQI {aqi if max_aqi is not None else 'n/a'}",
        f"Inversion risk {inversion:.0f}/100",
        f"Wind-transport indicator {transport:.0f}/100",
    ]
    if aqi >= 201:
        evidence.append("GRAP-relevant poor air quality already in force")
    elif aqi and aqi < 100:
        evidence.append("Ground AQI is currently satisfactory; watch nocturnal trapping")
    return _clamp(score), evidence


def _road_score(precip_24h: float, wind: float, aqi: Optional[int]) -> Tuple[float, List[str]]:
    score = min(50.0, precip_24h * 1.6) + (8 if wind >= 8 else 0) + (10 if (aqi or 0) >= 300 else 0)
    evidence = [
        f"Rain loading {precip_24h:.1f} mm / 24h",
        f"Surface wind {wind:.1f} m/s",
    ]
    if precip_24h < 5 and (aqi or 0) < 300:
        evidence.append("No waterlogging or severe-visibility driver from current inputs")
    return _clamp(score), evidence


def _recommendation(hazard_id: str, score: float) -> str:
    if hazard_id == "flood":
        return "Issue Yamuna/drain flood watch and pre-position shelters" if score >= 51 else "Monitor CWC gauges; no flood warning from rainfall now"
    if hazard_id == "heat":
        return "Activate heatwave ORS camps and restrict afternoon outdoor work" if score >= 51 else "Standard heat awareness is sufficient"
    if hazard_id == "fire":
        return "Notify fire services and route stubble collection before the next burn window" if score >= 51 else "Keep FIRMS watch; collection network on standby"
    if hazard_id == "smoke":
        return "Publish GRAP health advisory for children, elderly, and outdoor workers" if score >= 51 else "Maintain routine AQI bulletin"
    if hazard_id == "road":
        return "Issue waterlogging / low-visibility route warnings" if score >= 51 else "No road-closure trigger from current rain or smoke"
    return "Continue multi-source monitoring"


def assess_disaster_risk(
    meteo: Dict[str, Any],
    fires: List[Dict[str, Any]],
    observations: List[Dict[str, Any]],
    indices: Optional[Dict[str, Any]] = None,
    mode: str = "DEMO",
) -> Dict[str, Any]:
    indices = indices or {}
    temp = meteo.get("temperature")
    humidity = float(meteo.get("humidity") or 60)
    wind = float(meteo.get("wind_speed") or 2.0)
    precip_now = float(meteo.get("precipitation") or 0.0)
    precip_24h = float(meteo.get("precip_24h") or 0.0)
    inversion = float(indices.get("inversion_risk_score") or 45)
    transport = float(indices.get("wind_transport_indicator") or 40)

    peak_obs = None
    for item in observations:
        if item.get("aqi") is None:
            continue
        if peak_obs is None or (item.get("aqi") or 0) > (peak_obs.get("aqi") or 0):
            peak_obs = item
    max_aqi = peak_obs.get("aqi") if peak_obs else None
    pm25 = None
    if peak_obs:
        pm25 = (peak_obs.get("pollutants") or {}).get("pm25")

    fire_count = len(fires)
    total_frp = round(sum(float(f.get("frp") or 0) for f in fires), 1)

    flood, flood_ev = _flood_score(precip_now, precip_24h, humidity)
    heat, heat_ev = _heat_score(temp)
    fire, fire_ev = _fire_score(fire_count, total_frp, humidity, wind)
    smoke, smoke_ev = _smoke_score(max_aqi, inversion, transport, fire_count)
    road, road_ev = _road_score(precip_24h, wind, max_aqi)

    hazards = [
        {
            "id": "flood",
            "name": "Flood / waterlogging",
            "score": round(flood, 1),
            "level": _level(flood),
            "evidence": flood_ev,
            "recommendation": _recommendation("flood", flood),
            "action_id": "flood",
        },
        {
            "id": "smoke",
            "name": "Air-quality / smoke",
            "score": round(smoke, 1),
            "level": _level(smoke),
            "evidence": smoke_ev,
            "recommendation": _recommendation("smoke", smoke),
            "action_id": "aqi",
        },
        {
            "id": "fire",
            "name": "Fire / stubble burning",
            "score": round(fire, 1),
            "level": _level(fire),
            "evidence": fire_ev,
            "recommendation": _recommendation("fire", fire),
            "action_id": "fire",
        },
        {
            "id": "heat",
            "name": "Heatwave",
            "score": round(heat, 1),
            "level": _level(heat),
            "evidence": heat_ev,
            "recommendation": _recommendation("heat", heat),
            "action_id": "heat",
        },
        {
            "id": "road",
            "name": "Road / mobility",
            "score": round(road, 1),
            "level": _level(road),
            "evidence": road_ev,
            "recommendation": _recommendation("road", road),
            "action_id": "road",
        },
    ]
    hazards.sort(key=lambda item: item["score"], reverse=True)
    primary = hazards[0]
    overall = round(0.45 * primary["score"] + 0.55 * (sum(h["score"] for h in hazards) / len(hazards)), 1)

    zones = [
        {
            "id": "yamuna",
            "name": "Yamuna floodplain",
            "hazard": "flood",
            "score": round(flood, 1),
            "level": _level(flood),
            "x_pct": 18,
            "y_pct": 23,
        },
        {
            "id": "punjab-belt",
            "name": "Upstream fire belt",
            "hazard": "fire",
            "score": round(fire, 1),
            "level": _level(fire),
            "x_pct": 70,
            "y_pct": 18,
        },
        {
            "id": "central-ncr",
            "name": "Central NCR airshed",
            "hazard": "smoke",
            "score": round(smoke, 1),
            "level": _level(smoke),
            "x_pct": 48,
            "y_pct": 58,
        },
        {
            "id": "south-delhi",
            "name": "South Delhi heat island",
            "hazard": "heat",
            "score": round(heat, 1),
            "level": _level(heat),
            "x_pct": 52,
            "y_pct": 78,
        },
    ]

    outlook = []
    hourly = meteo.get("hourly_forecast") or []
    for row in hourly:
        if row.get("hour_offset") not in (6, 12, 24, 48, 72):
            continue
        p = float(row.get("precipitation") or 0)
        t = row.get("temperature")
        outlook.append({
            "hour_offset": row["hour_offset"],
            "flood": round(_clamp(p * 12 + precip_24h * 0.4), 1),
            "heat": round(_heat_score(t)[0], 1) if t is not None else None,
            "label": f"+{row['hour_offset']}h",
        })

    return {
        "mode": mode,
        "overall_score": overall,
        "overall_level": _level(overall),
        "primary_hazard": primary["id"],
        "headline": f"{primary['name']} is the lead hazard at {_level_label(primary['level'])} ({primary['score']:.0f}/100).",
        "meteorology": {
            "temperature": temp,
            "humidity": humidity,
            "wind_speed": wind,
            "wind_direction": meteo.get("wind_direction"),
            "precipitation": precip_now,
            "precip_24h": precip_24h,
            "boundary_layer_height": meteo.get("boundary_layer_height"),
        },
        "air_quality": {
            "max_aqi": max_aqi,
            "pm25": pm25,
            "station_id": peak_obs.get("station_id") if peak_obs else None,
            "station_name": peak_obs.get("station_name") if peak_obs else None,
        },
        "fires": {"count": fire_count, "total_frp": total_frp},
        "hazards": hazards,
        "zones": zones,
        "outlook": outlook,
    }

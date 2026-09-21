"""Atmospheric Intelligence Service:
- Derived Meteorological Dispersion Indices (Ventilation, Stagnation, Inversion Risk, Transport)
- Physics-Guided Atmospheric Regime Classification
- Regional Wind Transport Corridor Vectorization
- Forecast Driver Attribution and Explainability Engine
"""

import math
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime


def calculate_ventilation_index(wind_speed: float, blh: float) -> Tuple[float, str]:
    """Computes Ventilation Index (m²/s) = Wind Speed (m/s) * Boundary Layer Height (m).
    
    Categorization:
    - Critical (< 2000 m²/s): Severe pollutant entrapment.
    - Moderate (2000 - 6000 m²/s): Normal dispersion balance.
    - High (> 6000 m²/s): Rapid convective and advective clearing.
    """
    ws = max(0.1, float(wind_speed)) if wind_speed is not None else 2.5
    h = max(50.0, float(blh)) if blh is not None else 800.0
    vi = round(ws * h, 1)

    if vi < 2000.0:
        category = "Critical"
    elif vi <= 6000.0:
        category = "Moderate"
    else:
        category = "High"

    return vi, category


def calculate_stagnation_index(wind_speed: float, blh: float, precipitation: float = 0.0) -> float:
    """Computes normalized Stagnation Index (0 - 100).
    
    Higher score indicates higher stagnation (calm surface winds and compressed mixing height).
    Precipitation causes atmospheric turbulence and particulate wet scavenging.
    """
    ws = max(0.0, float(wind_speed)) if wind_speed is not None else 2.0
    h = max(0.0, float(blh)) if blh is not None else 600.0
    precip = max(0.0, float(precipitation)) if precipitation is not None else 0.0

    # Wind calm component: 0 at >=8 m/s, 50 at 0 m/s
    wind_factor = (1.0 - min(ws, 8.0) / 8.0) * 50.0

    # BLH compression component: 0 at >=1500 m, 50 at 0 m
    blh_factor = (1.0 - min(h, 1500.0) / 1500.0) * 50.0

    stagnation = wind_factor + blh_factor

    # Precipitation washout dampening
    if precip >= 0.5:
        stagnation *= 0.20
    elif precip > 0.0:
        stagnation *= 0.60

    return round(max(0.0, min(100.0, stagnation)), 1)


def calculate_inversion_risk(
    temp: float,
    humidity: float,
    wind_speed: float,
    blh: float,
    hour: int
) -> float:
    """Evaluates the risk score (0 - 100) of surface thermal radiative inversion.
    
    Nocturnal radiative cooling + calm winds + high humidity + shallow BLH.
    """
    ws = max(0.1, float(wind_speed)) if wind_speed is not None else 1.8
    h = max(50.0, float(blh)) if blh is not None else 450.0
    rh = max(0.0, min(100.0, float(humidity))) if humidity is not None else 65.0

    # 1. Nocturnal cooling window: max between 22:00 and 06:00
    if 21 <= hour or hour <= 6:
        time_score = 100.0
    elif 7 <= hour <= 9 or 19 <= hour <= 20:
        time_score = 60.0
    else:
        time_score = 10.0

    # 2. BLH score: shallow mixing depth indicates trapped thermal cap
    if h < 250.0:
        blh_score = 100.0
    elif h < 500.0:
        blh_score = (1.0 - (h - 250.0) / 250.0) * 50.0 + 50.0
    else:
        blh_score = max(0.0, (1.0 - min(h, 1200.0) / 1200.0) * 40.0)

    # 3. Wind shear absence score: calm surface prevents inversion breakdown
    wind_score = max(0.0, (1.0 - min(ws, 4.0) / 4.0) * 100.0)

    # 4. Relative humidity factor: high RH favors nocturnal fog/smog radiation trapping
    rh_score = min(100.0, max(0.0, (rh - 40.0) * (100.0 / 60.0)))

    score = 0.35 * blh_score + 0.30 * wind_score + 0.20 * time_score + 0.15 * rh_score
    return round(max(0.0, min(100.0, score)), 1)


def calculate_transport_indicator(
    wind_speed: float,
    wind_dir: float,
    fire_count: int,
    total_frp: float
) -> float:
    """Calculates Regional Wind Transport Indicator (0 - 100).
    
    Measures advection alignment from the North-West biomass burning corridor
    (Punjab/Haryana azimuth: 285° - 330°, center at 305°).
    """
    wd = float(wind_dir) if wind_dir is not None else 295.0
    ws = float(wind_speed) if wind_speed is not None else 3.5
    fires = max(0, int(fire_count)) if fire_count is not None else 0
    frp = max(0.0, float(total_frp)) if total_frp is not None else 0.0

    # Direction alignment: cos(wd - 305°)
    rad_diff = math.radians(wd - 305.0)
    cos_val = math.cos(rad_diff)
    alignment = max(0.0, cos_val)

    # Transport speed efficiency: peak transport occurs around 4 - 8 m/s
    if ws < 1.0:
        speed_score = ws * 0.4
    elif ws <= 7.0:
        speed_score = 0.4 + (ws - 1.0) * 0.10
    else:
        speed_score = max(0.3, 1.0 - (ws - 7.0) * 0.05)

    # Upstream source strength (fire count & FRP)
    fire_score = min(1.0, (fires / 40.0) * 0.5 + (frp / 600.0) * 0.5)

    # Composite indicator
    wti = 100.0 * (alignment * 0.50 + speed_score * 0.25 + fire_score * 0.25)
    return round(max(0.0, min(100.0, wti)), 1)


def classify_regime(
    meteo: Dict[str, Any],
    active_fires: List[Dict[str, Any]],
    hour: Optional[int] = None
) -> Dict[str, Any]:
    """Classifies the prevailing atmospheric regime with confidence and physical explanation.
    
    Regimes:
    - RAIN_WASHOUT
    - HIGH_VENTILATION
    - STRONG_INVERSION
    - STAGNATION
    - REGIONAL_TRANSPORT
    - NORMAL
    """
    if hour is None:
        hour = datetime.now().hour

    ws = meteo.get("wind_speed") or 2.5
    blh = meteo.get("boundary_layer_height") or 600.0
    precip = meteo.get("precipitation") or 0.0
    humidity = meteo.get("humidity") or 60.0
    temp = meteo.get("temperature") or 26.0
    wd = meteo.get("wind_direction") or 290.0

    vi, vi_cat = calculate_ventilation_index(ws, blh)
    si = calculate_stagnation_index(ws, blh, precip)
    irs = calculate_inversion_risk(temp, humidity, ws, blh, hour)

    fire_count = len(active_fires)
    total_frp = sum(f.get("frp", 0.0) for f in active_fires)
    wti = calculate_transport_indicator(ws, wd, fire_count, total_frp)

    # Rule evaluation in priority order:
    # 1. Rain Washout
    if precip >= 0.5:
        return {
            "regime": "RAIN_WASHOUT",
            "confidence": min(0.98, 0.75 + precip * 0.05),
            "explanation": f"Active precipitation ({precip:.1f} mm/h) is scavenging particulate matter via wet deposition and disrupting surface stagnation.",
            "severity_level": "low"
        }

    # 2. High Ventilation
    if vi >= 6000.0 and ws >= 4.0:
        conf = min(0.95, 0.70 + (vi - 6000.0) / 10000.0)
        return {
            "regime": "HIGH_VENTILATION",
            "confidence": round(conf, 2),
            "explanation": f"Strong ventilation ({vi:.0f} m²/s) with brisk winds ({ws:.1f} m/s) and high mixing depth ({blh:.0f} m) promotes rapid dispersion.",
            "severity_level": "low"
        }

    # 3. Strong Nocturnal Thermal Inversion
    if irs >= 65.0 and blh < 350.0 and (hour >= 20 or hour <= 7):
        conf = min(0.96, 0.65 + (irs / 100.0) * 0.3)
        return {
            "regime": "STRONG_INVERSION",
            "confidence": round(conf, 2),
            "explanation": f"Surface radiative cooling with compressed boundary layer ({blh:.0f} m) and calm winds ({ws:.1f} m/s) creates an impenetrable thermal ceiling trapping ground pollutants.",
            "severity_level": "severe"
        }

    # 4. Regional Transport Advection
    if 275.0 <= wd <= 340.0 and wti >= 45.0 and fire_count >= 5 and ws >= 2.0:
        conf = min(0.92, 0.60 + (wti / 100.0) * 0.32)
        return {
            "regime": "REGIONAL_TRANSPORT",
            "confidence": round(conf, 2),
            "explanation": f"North-westerly winds ({wd:.0f}°, {ws:.1f} m/s) are actively transporting smoke plumes from {fire_count} detected agricultural fire hotspots ({total_frp:.0f} MW total FRP) directly into Delhi NCR.",
            "severity_level": "high"
        }

    # 5. Stagnation
    if si >= 60.0 or vi < 2000.0:
        conf = min(0.94, 0.60 + (si / 100.0) * 0.32)
        return {
            "regime": "STAGNATION",
            "confidence": round(conf, 2),
            "explanation": f"Critical stagnation (Ventilation Index: {vi:.0f} m²/s, Stagnation Score: {si:.0f}/100) due to low surface wind ({ws:.1f} m/s) and shallow mixing height ({blh:.0f} m).",
            "severity_level": "high"
        }

    # 6. Normal Urban Diurnal
    return {
        "regime": "NORMAL",
        "confidence": 0.85,
        "explanation": f"Moderate urban dispersion balance (Ventilation Index: {vi:.0f} m²/s) with standard diurnal mixing and background emissions.",
        "severity_level": "moderate"
    }


def compute_transport_corridors(
    wind_speed: float,
    wind_dir: float,
    fires: List[Dict[str, Any]],
    delhi_coords: Tuple[float, float] = (28.6139, 77.2090)
) -> List[Dict[str, Any]]:
    """Calculates directional advection corridors between upstream active fire centroids and Delhi NCR."""
    if not fires:
        return []

    ws = max(0.5, float(wind_speed)) if wind_speed is not None else 3.2
    wd = float(wind_dir) if wind_dir is not None else 305.0

    # Group fires into key regional clusters
    cluster_groups: Dict[str, List[Dict[str, Any]]] = {}
    for f in fires:
        lat = f.get("latitude", 0)
        lon = f.get("longitude", 0)
        if lat >= 31.0:
            c_name = "North Punjab (Amritsar-Majha)"
        elif lat >= 30.0 and lon <= 75.5:
            c_name = "West Punjab (Bathinda-Malwa)"
        elif lat >= 30.0 and lon > 75.5:
            c_name = "East Punjab (Sangrur-Patiala)"
        elif lat >= 29.3:
            c_name = "North Haryana (Kaithal-Karnal)"
        else:
            c_name = "NCR North Periphery (Sonipat-Panipat)"

        cluster_groups.setdefault(c_name, []).append(f)

    corridors = []
    d_lat, d_lon = delhi_coords

    for c_name, c_fires in cluster_groups.items():
        avg_lat = sum(f["latitude"] for f in c_fires) / len(c_fires)
        avg_lon = sum(f["longitude"] for f in c_fires) / len(c_fires)
        cluster_frp = sum(f.get("frp", 0.0) for f in c_fires)

        # Vector from cluster to Delhi
        d_y = d_lat - avg_lat
        d_x = d_lon - avg_lon
        distance_km = math.sqrt(d_y**2 + (d_x * math.cos(math.radians(avg_lat)))**2) * 111.0
        
        # Bearing from cluster to Delhi (degrees)
        bearing = (math.degrees(math.atan2(d_x, d_y)) + 360.0) % 360.0

        # Transit time (hours)
        speed_kmh = ws * 3.6
        transit_hours = round(distance_km / max(5.0, speed_kmh), 1)

        # Risk level based on wind alignment
        alignment = math.cos(math.radians(wd - bearing))
        if alignment > 0.8 and cluster_frp > 100:
            risk = "severe"
        elif alignment > 0.6:
            risk = "elevated"
        elif alignment > 0.2:
            risk = "moderate"
        else:
            risk = "low"

        corridors.append({
            "id": f"corridor_{len(corridors)+1}",
            "origin_cluster": f"{c_name} ({len(c_fires)} fires, {cluster_frp:.0f} MW)",
            "destination": "Delhi NCR Airshed",
            "bearing_degrees": round(bearing, 1),
            "wind_speed_kmh": round(speed_kmh, 1),
            "estimated_transit_hours": transit_hours,
            "transport_risk": risk,
            "coordinates": [
                [round(avg_lon, 4), round(avg_lat, 4)],
                [round(d_lon, 4), round(d_lat, 4)]
            ]
        })

    return corridors


def explain_forecast_drivers(
    station_id: str,
    station_name: str,
    meteo: Dict[str, Any],
    regime_info: Dict[str, Any],
    indices: Dict[str, Any],
    fires: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generates explainable physical driver attributions for forecast dynamics."""
    regime = regime_info.get("regime", "NORMAL")
    vi = indices.get("ventilation_index", 3000.0)
    si = indices.get("stagnation_index", 40.0)
    irs = indices.get("inversion_risk_score", 30.0)
    wti = indices.get("wind_transport_indicator", 20.0)
    ws = meteo.get("wind_speed", 2.5)
    blh = meteo.get("boundary_layer_height", 600.0)
    wd = meteo.get("wind_direction", 290.0)
    fire_count = len(fires)

    # Calculate continuous dynamic weightings based on atmospheric indices and micro-meteorology
    blh_score = max(10.0, min(45.0, 45.0 - (blh / 45.0) + (irs * 0.2)))
    wind_score = max(10.0, min(40.0, (si * 0.3) + max(0.0, 18.0 - ws * 3.5)))
    fire_score = max(5.0, min(45.0, (wti * 0.35) + min(18.0, fire_count * 2.5)))
    urban_score = 22.0

    total_score = blh_score + wind_score + fire_score + urban_score
    pct_blh = round((blh_score / total_score) * 100.0)
    pct_wind = round((wind_score / total_score) * 100.0)
    pct_fire = round((fire_score / total_score) * 100.0)
    pct_urban = max(5, 100 - (pct_blh + pct_wind + pct_fire))

    # 1. Boundary Layer Dynamic
    if blh < 350.0:
        drivers.append({
            "factor": "Boundary Layer Compression",
            "impact": "trapping",
            "contribution_pct": float(pct_blh),
            "description": f"Extremely shallow mixing height of {blh:.0f} m severely restricts vertical volume, trapping all surface exhaust."
        })
    elif blh > 1200.0:
        drivers.append({
            "factor": "Boundary Layer Expansion",
            "impact": "clearing",
            "contribution_pct": float(pct_blh),
            "description": f"Deep convective mixing layer of {blh:.0f} m provides high volumetric dilution capacity."
        })
    else:
        drivers.append({
            "factor": "Diurnal Mixing Height",
            "impact": "trapping" if blh < 600 else "clearing",
            "contribution_pct": float(pct_blh),
            "description": f"Moderate mixing height of {blh:.0f} m following normal solar thermal progression."
        })

    # 2. Surface Wind Calm / Ventilation
    if ws < 2.0:
        drivers.append({
            "factor": "Calm Surface Winds",
            "impact": "trapping",
            "contribution_pct": float(pct_wind),
            "description": f"Calm wind speed of {ws:.1f} m/s fails to generate horizontal advection, causing localized vehicular smog stagnation."
        })
    elif ws > 4.5:
        drivers.append({
            "factor": "Brisk Advection Winds",
            "impact": "clearing",
            "contribution_pct": float(pct_wind),
            "description": f"Active surface winds ({ws:.1f} m/s) promote horizontal advection and urban plume displacement."
        })
    else:
        drivers.append({
            "factor": "Moderate Surface Winds",
            "impact": "trapping" if ws < 3.0 else "clearing",
            "contribution_pct": float(pct_wind),
            "description": f"Surface wind speed of {ws:.1f} m/s maintains baseline dispersion."
        })

    # 3. Regional Biomass Advection
    if wti >= 35.0 and fire_count >= 3:
        drivers.append({
            "factor": "Upstream Fire Advection",
            "impact": "advection",
            "contribution_pct": float(pct_fire),
            "description": f"Prevailing winds ({wd:.0f}°) align with {fire_count} active agricultural fire clusters in Punjab/Haryana."
        })
    elif fire_count > 0:
        drivers.append({
            "factor": "Regional Fire Activity",
            "impact": "advection",
            "contribution_pct": float(pct_fire),
            "description": f"{fire_count} active fires detected regionally, with partial wind corridor alignment."
        })

    # 4. Local Primary Emissions
    drivers.append({
        "factor": "Local Urban Emissions",
        "impact": "emission",
        "contribution_pct": float(pct_urban),
        "description": "Continuous baseline urban background from transport, construction dust, and commercial energy consumption."
    })

    # Determine primary and secondary drivers
    if regime == "STRONG_INVERSION":
        primary = f"Nocturnal thermal inversion with boundary layer compressed to {blh:.0f} m."
        secondary = f"Surface wind calm ({ws:.1f} m/s) preventing mechanical turbulence."
        summary = f"Pollution at {station_name} is projected to intensify due to a strong thermal inversion capping surface emissions."
    elif regime == "REGIONAL_TRANSPORT":
        primary = f"Direct North-Westerly advection corridor ({wd:.0f}°) from {fire_count} upstream fire hotspots."
        secondary = f"Stagnation score at {si:.0f}/100 allowing advected particulates to settle."
        summary = f"Pollution at {station_name} is expected to rise sharply due to regional biomass smoke advection combined with favorable transport vectors."
    elif regime == "STAGNATION":
        primary = f"Critical atmospheric stagnation (Ventilation Index: {vi:.0f} m²/s)."
        secondary = f"Low wind speed ({ws:.1f} m/s) trapping local vehicular and industrial pollutants."
        summary = f"Atmospheric stagnation at {station_name} will suppress pollutant dispersion, driving up particulate concentrations."
    elif regime == "HIGH_VENTILATION":
        primary = f"High ventilation capacity ({vi:.0f} m²/s) and strong boundary layer depth ({blh:.0f} m)."
        secondary = f"Brisk surface winds ({ws:.1f} m/s) rapidly cleansing the airshed."
        summary = f"Pollution levels at {station_name} are expected to decline due to high atmospheric ventilation and elevated mixing depth."
    elif regime == "RAIN_WASHOUT":
        primary = "Active precipitation wet scavenging and particulate washout."
        secondary = "Convective atmospheric turnover clearing ground-level layers."
        summary = f"Significant reduction in particulate concentrations at {station_name} due to rain scavenging."
    else:
        primary = "Standard diurnal boundary layer expansion and contraction cycle."
        secondary = "Steady urban baseline vehicular and background emissions."
        summary = f"Pollution levels at {station_name} will track standard diurnal urban rhythm with morning and evening rush hour peaks."

    return {
        "station_id": station_id,
        "station_name": station_name,
        "summary": summary,
        "regime": regime,
        "primary_driver": primary,
        "secondary_driver": secondary,
        "dispersion_rating": "Critical" if vi < 2000 else ("Moderate" if vi <= 6000 else "Favorable"),
        "drivers": drivers,
        "mode": "DEMO"
    }

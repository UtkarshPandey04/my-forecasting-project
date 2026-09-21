"""FastAPI routes for Atmospheric Intelligence, NASA FIRMS Fires, Transport Corridors, and Forecast Drivers."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from datetime import datetime, timezone
import math

from app.api.deps import get_db_session, get_app_settings
from app.core.config import Settings
from app.models.station import Station
from app.schemas.atmospheric import (
    AtmosphericRegimeResponse,
    DerivedIndicesResponse,
    ActiveFirePoint,
    ActiveFiresResponse,
    TransportCorridor,
    TransportResponse,
    ForecastExplanationResponse
)
from app.providers.firms import NASAFIRMSProvider, DemoFIRMSProvider
from app.providers.demo import DemoDataProvider
from app.providers.imd import IMDWeatherProvider
from app.services.atmospheric import (
    calculate_ventilation_index,
    calculate_stagnation_index,
    calculate_inversion_risk,
    calculate_transport_indicator,
    classify_regime,
    compute_transport_corridors,
    explain_forecast_drivers
)

router = APIRouter()


def _get_firms_provider(settings: Settings):
    if settings.APP_MODE == "LIVE" and settings.FIRMS_MAP_KEY:
        return NASAFIRMSProvider(settings.FIRMS_MAP_KEY)
    return DemoFIRMSProvider()


def _get_weather_provider(settings: Settings):
    if settings.APP_MODE == "LIVE":
        return IMDWeatherProvider()
    return DemoDataProvider()


@router.get("/atmospheric/regime", response_model=AtmosphericRegimeResponse)
async def get_atmospheric_regime(settings: Settings = Depends(get_app_settings)):
    """Returns current atmospheric regime classification, confidence score, and physical explanation."""
    wx_provider = _get_weather_provider(settings)
    firms_provider = _get_firms_provider(settings)

    # Fetch weather for central Delhi (28.6139, 77.2090)
    meteo = await wx_provider.fetch_current(28.6139, 77.2090) or {}
    # Ensure boundary layer height is present
    if not meteo.get("boundary_layer_height"):
        meteo["boundary_layer_height"] = 550.0

    fires = await firms_provider.fetch_active_fires()
    classification = classify_regime(meteo, fires)

    return AtmosphericRegimeResponse(
        regime=classification["regime"],
        confidence=classification["confidence"],
        explanation=classification["explanation"],
        severity_level=classification["severity_level"],
        timestamp=datetime.now(),
        mode=settings.APP_MODE
    )


@router.get("/atmospheric/indices", response_model=DerivedIndicesResponse)
async def get_derived_indices(
    station_id: Optional[str] = Query(None, description="Optional station ID for localized dispersion indices"),
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings)
):
    """Returns the four core atmospheric dispersion indices:
    - Ventilation Index (m²/s)
    - Stagnation Index (0-100)
    - Inversion Risk Score (0-100)
    - Wind Transport Indicator (0-100)
    """
    wx_provider = _get_weather_provider(settings)
    firms_provider = _get_firms_provider(settings)

    lat = 28.6139
    lon = 77.2090
    if station_id:
        try:
            station = db.query(Station).filter(Station.id == station_id).first()
            if station:
                lat = station.latitude
                lon = station.longitude
        except Exception:
            pass

    meteo = await wx_provider.fetch_current(lat, lon) or {}
    hour = datetime.now().hour
    
    # Station micro-variance factor
    st_seed = sum(ord(c) for c in (station_id or "delhi")) % 17 - 8

    # Diurnal solar boundary layer height if sounding unavailable
    is_day = 9 <= hour <= 17
    default_blh = (
        round(1400.0 + 400.0 * math.sin(math.pi * (hour - 9) / 8) + st_seed * 20, 0)
        if is_day
        else round(350.0 + 50.0 * math.cos(hour) + st_seed * 10, 0)
    )

    ws = meteo.get("wind_speed")
    if ws is None or ws <= 0:
        ws = max(1.2, round(2.8 + st_seed * 0.15, 1))
    else:
        ws = round(float(ws), 1)

    blh = meteo.get("boundary_layer_height")
    if blh is None or blh <= 0:
        blh = max(250.0, default_blh)
    else:
        blh = round(float(blh), 0)

    precip = float(meteo.get("precipitation") or 0.0)
    humidity = float(meteo.get("humidity") or 62.0)
    temp = float(meteo.get("temperature") or 25.0)
    wd = float(meteo.get("wind_direction") or (300.0 + st_seed))

    vi, vi_cat = calculate_ventilation_index(ws, blh)
    si = calculate_stagnation_index(ws, blh, precip)
    irs = calculate_inversion_risk(temp, humidity, ws, blh, hour)

    fires = await firms_provider.fetch_active_fires()
    total_frp = sum(f.get("frp", 0.0) for f in fires)
    wti = calculate_transport_indicator(ws, wd, len(fires), total_frp)

    return DerivedIndicesResponse(
        ventilation_index=vi,
        ventilation_category=vi_cat,
        stagnation_index=si,
        inversion_risk_score=irs,
        wind_transport_indicator=wti,
        timestamp=datetime.now(),
        mode=settings.APP_MODE
    )


@router.get("/fires/active", response_model=ActiveFiresResponse)
async def get_active_fires(
    min_lat: float = 28.0,
    min_lon: float = 74.5,
    max_lat: float = 32.0,
    max_lon: float = 78.0,
    settings: Settings = Depends(get_app_settings)
):
    """Returns active fire hotspots across Punjab, Haryana, and Delhi NCR from NASA FIRMS."""
    firms_provider = _get_firms_provider(settings)
    raw_fires = await firms_provider.fetch_active_fires(min_lat, min_lon, max_lat, max_lon)

    fire_points = [ActiveFirePoint(**f) for f in raw_fires]
    total_frp = round(sum(f.frp for f in fire_points), 1)

    return ActiveFiresResponse(
        fires=fire_points,
        count=len(fire_points),
        total_frp=total_frp,
        mode=settings.APP_MODE,
        last_updated=datetime.now(timezone.utc)
    )


@router.get("/transport/corridors", response_model=TransportResponse)
async def get_transport_corridors(settings: Settings = Depends(get_app_settings)):
    """Returns estimated regional biomass advection corridors from upstream fire clusters to Delhi NCR."""
    wx_provider = _get_weather_provider(settings)
    firms_provider = _get_firms_provider(settings)

    meteo = await wx_provider.fetch_current(28.6139, 77.2090) or {}
    ws = meteo.get("wind_speed", 3.2)
    wd = meteo.get("wind_direction", 305.0)

    fires = await firms_provider.fetch_active_fires()
    raw_corridors = compute_transport_corridors(ws, wd, fires)

    corridor_models = [TransportCorridor(**c) for c in raw_corridors]

    return TransportResponse(
        corridors=corridor_models,
        dominant_wind_direction=round(float(wd), 1),
        wind_speed_ms=round(float(ws), 1),
        disclaimer="Estimated atmospheric transport trajectory and relative influence based on prevailing wind advection; not an exact chemical source apportionment.",
        mode=settings.APP_MODE
    )


@router.get("/forecast/explain/{station_id}", response_model=ForecastExplanationResponse)
async def get_forecast_explanation(
    station_id: str,
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings)
):
    """Provides physical driver attributions explaining why pollution is projected to rise, stagnate, or clear."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found")

    wx_provider = _get_weather_provider(settings)
    firms_provider = _get_firms_provider(settings)

    meteo = await wx_provider.fetch_current(station.latitude, station.longitude) or {}
    hour = datetime.now().hour
    st_seed = sum(ord(c) for c in station.id) % 17 - 8

    is_day = 9 <= hour <= 17
    default_blh = (
        round(1400.0 + 400.0 * math.sin(math.pi * (hour - 9) / 8) + st_seed * 20, 0)
        if is_day
        else round(350.0 + 50.0 * math.cos(hour) + st_seed * 10, 0)
    )

    ws = meteo.get("wind_speed")
    ws = round(float(ws), 1) if ws is not None and float(ws) > 0 else max(1.2, round(2.8 + st_seed * 0.15, 1))

    blh = meteo.get("boundary_layer_height")
    blh = round(float(blh), 0) if blh is not None and float(blh) > 0 else max(250.0, default_blh)

    precip = float(meteo.get("precipitation") or 0.0)
    humidity = float(meteo.get("humidity") or 62.0)
    temp = float(meteo.get("temperature") or 25.0)
    wd = float(meteo.get("wind_direction") or (300.0 + st_seed))

    fires = await firms_provider.fetch_active_fires()
    total_frp = sum(f.get("frp", 0.0) for f in fires)

    vi, vi_cat = calculate_ventilation_index(ws, blh)
    si = calculate_stagnation_index(ws, blh, precip)
    irs = calculate_inversion_risk(temp, humidity, ws, blh, hour)
    wti = calculate_transport_indicator(ws, wd, len(fires), total_frp)

    regime_info = classify_regime(meteo, fires)
    indices = {
        "ventilation_index": vi,
        "stagnation_index": si,
        "inversion_risk_score": irs,
        "wind_transport_indicator": wti
    }

    explanation = explain_forecast_drivers(
        station_id=station.id,
        station_name=station.name,
        meteo=meteo,
        regime_info=regime_info,
        indices=indices,
        fires=fires
    )
    explanation["mode"] = settings.APP_MODE

    return ForecastExplanationResponse(**explanation)


@router.post("/atmospheric/ask")
async def ask_atmospheric_intelligence(
    req: dict,
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings)
):
    """Aliased atmospheric query endpoint for Ask AeroSense Intelligence."""
    from app.schemas.intelligence import AtmosphericQueryRequest
    from app.services.intelligence import IntelligenceService
    service = IntelligenceService(db, settings)
    request_obj = AtmosphericQueryRequest(**req)
    return await service.answer_query(request_obj)


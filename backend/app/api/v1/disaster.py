"""Disaster risk prediction API for incident command."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_db_session
from app.core.config import Settings
from app.providers.firms import DemoFIRMSProvider, NASAFIRMSProvider
from app.providers.demo import DemoDataProvider
from app.providers.imd import IMDWeatherProvider
from app.services.atmospheric import (
    calculate_inversion_risk,
    calculate_transport_indicator,
    calculate_ventilation_index,
)
from app.services.disaster_risk import assess_disaster_risk
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/disaster", tags=["disaster"])


def _firms(settings: Settings):
    if settings.APP_MODE == "LIVE" and settings.FIRMS_MAP_KEY:
        return NASAFIRMSProvider(settings.FIRMS_MAP_KEY)
    return DemoFIRMSProvider()


def _weather(settings: Settings):
    if settings.APP_MODE == "LIVE":
        return IMDWeatherProvider()
    return DemoDataProvider()


@router.get("/risk")
async def get_disaster_risk(
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
):
    wx = _weather(settings)
    firms = _firms(settings)
    meteo = await wx.fetch_current(28.6139, 77.2090) or {}
    if not meteo.get("boundary_layer_height"):
        meteo["boundary_layer_height"] = 550.0
    if meteo.get("precip_24h") is None:
        meteo["precip_24h"] = float(meteo.get("precipitation") or 0.0) * 6.0

    fires = await firms.fetch_active_fires()
    observations = []
    import asyncio
    try:
        observations = await asyncio.wait_for(
            IngestionService(db, settings).get_current_observations("anand_vihar"),
            timeout=2.5
        )
    except Exception:
        observations = []

    ws = float(meteo.get("wind_speed") or 2.6)
    blh = float(meteo.get("boundary_layer_height") or 520)
    humidity = float(meteo.get("humidity") or 64)
    temp = float(meteo.get("temperature") or 26)
    wd = float(meteo.get("wind_direction") or 295)
    vi, _ = calculate_ventilation_index(ws, blh)
    irs = calculate_inversion_risk(temp, humidity, ws, blh, datetime.now().hour)
    wti = calculate_transport_indicator(ws, wd, len(fires), sum(f.get("frp", 0.0) for f in fires))

    from app.services.disaster_telemetry import get_telemetry_mesh_status
    mesh_status = get_telemetry_mesh_status(
        settings_mode=settings.APP_MODE,
        meteo=meteo,
        fires=fires,
        observations=observations,
        firms_configured=bool(settings.FIRMS_MAP_KEY)
    )

    assessment = assess_disaster_risk(
        meteo=meteo,
        fires=fires,
        observations=observations,
        indices={"ventilation_index": vi, "inversion_risk_score": irs, "wind_transport_indicator": wti},
        telemetry_mesh=mesh_status,
        mode=settings.APP_MODE,
    )
    assessment["generated_at"] = datetime.now(timezone.utc).isoformat()
    assessment["fires"]["points"] = [
        {
            "id": fire.get("id"),
            "latitude": fire.get("latitude"),
            "longitude": fire.get("longitude"),
            "frp": fire.get("frp"),
            "confidence": fire.get("confidence"),
        }
        for fire in fires[:40]
    ]
    assessment["telemetry_mesh"] = mesh_status
    return assessment


@router.get("/telemetry-mesh")
async def get_disaster_telemetry_mesh(
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
):
    """Returns real-time linked status, endpoints, latency, and sample payloads for all 11 mesh data sources."""
    wx = _weather(settings)
    firms = _firms(settings)
    meteo = await wx.fetch_current(28.6139, 77.2090) or {}
    fires = await firms.fetch_active_fires()
    import asyncio
    try:
        observations = await asyncio.wait_for(
            IngestionService(db, settings).get_current_observations("anand_vihar"),
            timeout=2.5
        )
    except Exception:
        observations = []

    from app.services.disaster_telemetry import get_telemetry_mesh_status
    return get_telemetry_mesh_status(
        settings_mode=settings.APP_MODE,
        meteo=meteo,
        fires=fires,
        observations=observations,
        firms_configured=bool(settings.FIRMS_MAP_KEY)
    )


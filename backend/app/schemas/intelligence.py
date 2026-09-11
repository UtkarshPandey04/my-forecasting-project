"""Pydantic schemas for AeroSense Intelligence, LLM Reasoning, and Confidence Estimation."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AtmosphericQueryRequest(BaseModel):
    query: str = Field(..., description="Atmospheric question or forecast query", min_length=2)
    station_id: Optional[str] = Field(None, description="Optional target station ID (e.g. anand_vihar)")
    horizon_hours: Optional[int] = Field(24, description="Forecast horizon in hours (default 24)")


class AtmosphericQueryResponse(BaseModel):
    query: str
    assessment: str = Field(..., description="Operational atmospheric synthesis answering the query")
    forecast_trajectory: str = Field(..., description="Expected 24h-72h particulate progression")
    confidence: float = Field(..., description="Dynamically derived forecast confidence score (0.0 - 1.0)")
    confidence_level: str = Field(..., description="Qualitative confidence tier: HIGH, MODERATE, or CAUTIONARY")
    confidence_drivers: List[str] = Field(default_factory=list, description="Specific factors contributing to or reducing confidence")
    primary_driver: str = Field(..., description="Primary physical driver (e.g. Boundary layer compression)")
    secondary_driver: Optional[str] = Field(None, description="Secondary atmospheric or emission driver")
    ventilation_status: str = Field(..., description="Critical, Moderate, or High ventilation")
    ventilation_index: float = Field(..., description="Computed Ventilation Index in m²/s")
    regime: str = Field(..., description="Classified atmospheric regime")
    inversion_risk: float = Field(..., description="Surface thermal inversion risk score (0-100)")
    evidence_sources: List[str] = Field(default_factory=list, description="Ground truth and sensor telemetry sources")
    model_name: str = Field(..., description="AI model generating the forecast assessment")
    suggested_actions: List[str] = Field(default_factory=list, description="Actionable recommendations / mitigation alerts")
    predicted_pm25: Optional[float] = Field(None, description="Target predicted PM2.5 in ug/m3 if resolved")
    predicted_aqi: Optional[int] = Field(None, description="Predicted AQI value if resolved")
    predicted_category: Optional[str] = Field(None, description="Predicted AQI category")
    station_id: Optional[str] = Field(None, description="Resolved station ID")
    station_name: Optional[str] = Field(None, description="Resolved station human-readable name")
    timestamp: datetime = Field(default_factory=datetime.now)


class AIModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    is_available: bool
    is_active: bool
    description: str


class AvailableModelsResponse(BaseModel):
    models: List[AIModelInfo]
    active_model: str
    external_provider_active: bool

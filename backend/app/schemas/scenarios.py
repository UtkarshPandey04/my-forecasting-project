"""Pydantic schemas for What-If Decision Scenarios, WRF-Chem Numerical Chemistry, and Blended Forecasts."""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class ScenarioParameters(BaseModel):
    station_id: str = "anand_vihar"
    wind_speed_delta_pct: float = Field(0.0, ge=-80.0, le=150.0, description="Wind speed change in percent (-80% to +150%)")
    rainfall_mm: float = Field(0.0, ge=0.0, le=100.0, description="Simulated rainfall in mm (0 to 100mm)")
    fire_activity_delta_pct: float = Field(0.0, ge=-100.0, le=200.0, description="Regional fire activity change (-100% to +200%)")
    scenario_name: Optional[str] = "Custom Scenario"


class ScenarioPoint(BaseModel):
    hour_offset: int
    timestamp: str
    baseline_pm25: float
    scenario_pm25: float
    delta_pm25: float
    uncertainty_lower: float
    uncertainty_upper: float
    baseline_aqi: Optional[int] = None
    scenario_aqi: Optional[int] = None
    scenario_aqi_category: Optional[str] = None
    scenario_aqi_color: Optional[str] = None


class ScenarioSummaryDelta(BaseModel):
    mean_baseline_pm25: float
    mean_scenario_pm25: float
    net_change_pm25: float
    net_change_pct: float
    air_quality_impact: str


class ScenarioExplanation(BaseModel):
    headline: str
    primary_mechanisms: List[str]
    physical_rationale: str


class ScenarioResponse(BaseModel):
    scenario_name: str
    station_id: str
    station_name: str
    parameters: Dict[str, float]
    summary_delta: ScenarioSummaryDelta
    explanation: ScenarioExplanation
    assumptions: List[str]
    disclaimer: str
    live_context: Dict[str, Any] = {}
    points: List[ScenarioPoint]


class PresetScenario(BaseModel):
    id: str
    name: str
    description: str
    wind_speed_delta_pct: float
    rainfall_mm: float
    fire_activity_delta_pct: float


class PresetsResponse(BaseModel):
    presets: List[PresetScenario]


class BlendedPoint(BaseModel):
    hour_offset: int
    timestamp: str
    physics_pm25: float
    ai_residual_pm25: float
    blended_pm25: float
    uncertainty_lower_pm25: float
    uncertainty_upper_pm25: float
    physics_o3: float
    physics_no2: float
    temperature: float
    wind_speed: float
    pblh: float
    aqi: Optional[int] = None
    aqi_category: Optional[str] = None
    aqi_color: Optional[str] = None


class ForecastProvenance(BaseModel):
    forecast_type: str
    physics_provider: str
    physics_model: str
    chemistry_mechanism: str
    source_file: str
    ai_residual_corrector: str
    blending_formulation: str
    blending_weights: Dict[str, float]
    mean_bias_correction_pm25: float
    generated_at: str


class BlendedForecastResponse(BaseModel):
    station_id: str
    station_name: str
    horizon_hours: int
    provenance: ForecastProvenance
    points: List[BlendedPoint]


class WRFChemStatusResponse(BaseModel):
    netcdf_support: bool
    directory: str
    available_files: List[str]
    default_file: str
    status: str

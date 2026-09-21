"""Incident lifecycle management models for AeroSense Command Console."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    ASSESSED = "ASSESSED"
    RESPONSE_REQUIRED = "RESPONSE_REQUIRED"
    TEAM_ASSIGNED = "TEAM_ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    MONITORING = "MONITORING"
    RESOLVED = "RESOLVED"


class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TimelineEntry(BaseModel):
    id: str
    timestamp: str
    actor: str = "AeroSense AI Engine"
    action: str
    notes: Optional[str] = None


class AssignedResource(BaseModel):
    id: str
    resource_type: str  # e.g., "Anti-Smog Gun", "Fire Patrol Unit", "Biomass Logistics Taskforce"
    unit_code: str
    dispatched_at: str
    contact: str
    status: str = "DEPLOYED"


class IncidentCreate(BaseModel):
    station_id: str = "anand_vihar"
    station_name: str = "Anand Vihar, Delhi"
    severity: IncidentSeverity = IncidentSeverity.CRITICAL
    risk_score: float = Field(..., ge=0, le=100)
    aqi: int
    pm25: float
    trigger_reason: str
    weather_summary: Dict[str, Any] = {}
    contributing_sources: List[Dict[str, Any]] = []
    recommended_actions: List[str] = []
    circular_opportunity: Optional[Dict[str, Any]] = None


class Incident(IncidentCreate):
    id: str
    created_at: str
    updated_at: str
    status: IncidentStatus = IncidentStatus.DETECTED
    assigned_resources: List[AssignedResource] = []
    timeline: List[TimelineEntry] = []
    is_demo: bool = True

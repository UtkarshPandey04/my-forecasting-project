"""Incident lifecycle management API for AeroSense Command Console."""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.incident import (
    Incident,
    IncidentCreate,
    IncidentStatus,
    IncidentSeverity,
    AssignedResource,
    TimelineEntry,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])

_INCIDENTS: List[Incident] = [
    Incident(
        id="INC-DL-2026-081",
        station_id="anand_vihar",
        station_name="Anand Vihar, Delhi",
        severity=IncidentSeverity.CRITICAL,
        risk_score=94.2,
        aqi=312,
        pm25=198.5,
        trigger_reason="Compound Airshed Crisis: Severe PM2.5 spike + Stagnant Ventilation (<1100 m²/s) + Transboundary Stubble Plume",
        weather_summary={
            "wind_speed_ms": 1.4,
            "wind_direction_deg": 295,
            "temperature_c": 28.5,
            "boundary_layer_height_m": 420,
            "inversion_strength": "STRONG",
        },
        contributing_sources=[
            {"source": "Agricultural Stubble Burning (Punjab/Haryana Advection)", "share_pct": 42, "confidence": "HIGH (FIRMS satellite verified)"},
            {"source": "Local Vehicular Congestion (ISBT Anand Vihar)", "share_pct": 28, "confidence": "HIGH"},
            {"source": "Industrial & Ghazipur Landfill Flaring", "share_pct": 18, "confidence": "MODERATE"},
            {"source": "Construction & Road Dust Resuspension", "share_pct": 12, "confidence": "MODERATE"},
        ],
        recommended_actions=[
            "Deploy Anti-Smog water mist cannons along Vikas Marg arterial corridor",
            "Enforce GRAP Stage-IV heavy commercial vehicle diversions at Anand Vihar border",
            "Trigger AeroSense Circular intervention: Mobilize nearby residue off-takers in Meerut/Ghaziabad to absorb incoming stubble biomass",
            "Issue high-priority community advisory for vulnerable respiratory groups",
        ],
        circular_opportunity={
            "nearby_residue_listings_count": 24,
            "nearby_processors_count": 7,
            "available_straw_tonnage": 2840.0,
            "priority_districts": ["Meerut", "Bulandshahr", "Ghaziabad"],
            "action_cta": "Route biomass from upwind farms directly to CBG digesters before burning",
        },
        status=IncidentStatus.RESPONSE_REQUIRED,
        assigned_resources=[
            AssignedResource(
                id="RES-MIST-04",
                resource_type="Anti-Smog Cannon Truck #04",
                unit_code="DL-01-AS-882",
                dispatched_at="2026-09-21T18:15:00Z",
                contact="Duty Officer Sharma (+91-98110-XXXXX)",
                status="DEPLOYED",
            ),
            AssignedResource(
                id="RES-CIRC-01",
                resource_type="Circular Stubble Logistics Taskforce",
                unit_code="NCR-AGRI-01",
                dispatched_at="2026-09-21T18:30:00Z",
                contact="FPO Regional Coordinator (+91-98712-XXXXX)",
                status="MOBILIZED",
            ),
        ],
        timeline=[
            TimelineEntry(
                id="TL-01",
                timestamp="2026-09-21T17:45:00Z",
                actor="AeroSense Automated Risk Engine",
                action="INCIDENT_DETECTED",
                notes="Risk score breached critical threshold (94.2/100) triggered by PM2.5 crossing 190 µg/m³ under calm winds.",
            ),
            TimelineEntry(
                id="TL-02",
                timestamp="2026-09-21T18:00:00Z",
                actor="Incident Commander (Operator)",
                action="ASSESSED",
                notes="Verified CPCB telemetry and ISRO aerosol plume alignment. Escalated to RESPONSE_REQUIRED.",
            ),
            TimelineEntry(
                id="TL-03",
                timestamp="2026-09-21T18:15:00Z",
                actor="Dispatcher",
                action="TEAM_ASSIGNED",
                notes="Anti-smog cannon unit DL-01-AS-882 routed to Anand Vihar ISBT node.",
            ),
        ],
        created_at="2026-09-21T17:45:00Z",
        updated_at="2026-09-21T18:30:00Z",
        is_demo=True,
    ),
    Incident(
        id="INC-DL-2026-082",
        station_id="mundka",
        station_name="Mundka, West Delhi",
        severity=IncidentSeverity.HIGH,
        risk_score=78.5,
        aqi=268,
        pm25=142.0,
        trigger_reason="Industrial emissions & scrap burning detected along Rohtak corridor",
        weather_summary={"wind_speed_ms": 2.1, "wind_direction_deg": 310, "temperature_c": 29.0},
        contributing_sources=[
            {"source": "Industrial Plastic/Rubber Waste Pyrolysis", "share_pct": 52, "confidence": "HIGH"},
            {"source": "Heavy Transit Traffic on NH-10", "share_pct": 33, "confidence": "HIGH"},
            {"source": "Regional Background", "share_pct": 15, "confidence": "MODERATE"},
        ],
        recommended_actions=[
            "Dispatch flying squad inspection to Mundka industrial cluster",
            "Reroute non-destined freight to Western Peripheral Expressway",
        ],
        circular_opportunity=None,
        status=IncidentStatus.TEAM_ASSIGNED,
        assigned_resources=[],
        timeline=[
            TimelineEntry(
                id="TL-01",
                timestamp="2026-09-21T16:20:00Z",
                actor="AeroSense ML Engine",
                action="INCIDENT_DETECTED",
                notes="Automated alert on localized VOC and PM10 spike.",
            )
        ],
        created_at="2026-09-21T16:20:00Z",
        updated_at="2026-09-21T16:45:00Z",
        is_demo=True,
    ),
]


class StatusUpdateRequest(BaseModel):
    status: IncidentStatus
    notes: Optional[str] = None
    actor: str = "Operator"


class AssignResourceRequest(BaseModel):
    resource_type: str = "Anti-Smog Gun Unit"
    unit_code: str = "DL-TRUCK-09"
    contact: str = "+91-98100-XXXXX"
    notes: Optional[str] = None


@router.get("", response_model=Dict)
def list_incidents():
    """List all active and resolved incidents."""
    return {
        "incidents": _INCIDENTS,
        "count": len(_INCIDENTS),
        "active_count": len([i for i in _INCIDENTS if i.status != IncidentStatus.RESOLVED]),
        "critical_count": len([i for i in _INCIDENTS if i.severity == IncidentSeverity.CRITICAL and i.status != IncidentStatus.RESOLVED]),
    }


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    """Retrieve details and complete audit timeline of an incident."""
    incident = next((i for i in _INCIDENTS if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("", response_model=Incident)
def create_incident(payload: IncidentCreate):
    """Create a new incident manually or via automated trigger."""
    inc_id = f"INC-DL-2026-{uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    new_inc = Incident(
        id=inc_id,
        created_at=now_iso,
        updated_at=now_iso,
        status=IncidentStatus.DETECTED,
        assigned_resources=[],
        timeline=[
            TimelineEntry(
                id=f"TL-{uuid4().hex[:4]}",
                timestamp=now_iso,
                actor="AeroSense Risk Engine",
                action="INCIDENT_DETECTED",
                notes=payload.trigger_reason,
            )
        ],
        is_demo=True,
        **payload.model_dump(),
    )
    _INCIDENTS.insert(0, new_inc)
    return new_inc


@router.patch("/{incident_id}/status", response_model=Incident)
def update_incident_status(incident_id: str, req: StatusUpdateRequest):
    """Transition an incident through its operational lifecycle."""
    incident = next((i for i in _INCIDENTS if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = req.status
    incident.updated_at = datetime.now(timezone.utc).isoformat()
    incident.timeline.append(
        TimelineEntry(
            id=f"TL-{uuid4().hex[:4]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=req.actor,
            action=f"STATUS_TRANSITION_TO_{req.status.value}",
            notes=req.notes or f"Status updated to {req.status.value}",
        )
    )
    return incident


@router.post("/{incident_id}/assign-resource", response_model=Incident)
def assign_resource(incident_id: str, req: AssignResourceRequest):
    """Assign physical or logistical response units to the incident."""
    incident = next((i for i in _INCIDENTS if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    res_id = f"RES-{uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    new_res = AssignedResource(
        id=res_id,
        resource_type=req.resource_type,
        unit_code=req.unit_code,
        dispatched_at=now_iso,
        contact=req.contact,
        status="DEPLOYED",
    )
    incident.assigned_resources.append(new_res)
    incident.status = IncidentStatus.TEAM_ASSIGNED
    incident.updated_at = now_iso
    incident.timeline.append(
        TimelineEntry(
            id=f"TL-{uuid4().hex[:4]}",
            timestamp=now_iso,
            actor="Dispatch Controller",
            action="RESOURCE_ASSIGNED",
            notes=f"Dispatched {req.resource_type} ({req.unit_code}). {req.notes or ''}",
        )
    )
    return incident


@router.post("/{incident_id}/escalate", response_model=Incident)
def escalate_incident(incident_id: str):
    """Escalate incident priority to CRITICAL and notify Inter-Agency Emergency Taskforce."""
    incident = next((i for i in _INCIDENTS if i.id == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.severity = IncidentSeverity.CRITICAL
    incident.updated_at = datetime.now(timezone.utc).isoformat()
    incident.timeline.append(
        TimelineEntry(
            id=f"TL-{uuid4().hex[:4]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor="Incident Command",
            action="ESCALATED",
            notes="Escalated to CRITICAL priority: Inter-agency emergency notification transmitted.",
        )
    )
    return incident

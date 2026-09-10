"""Farmer and agency coordination for agricultural residue collection."""

from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/mitigation", tags=["mitigation"])

PARTNERS: List[Dict] = [
    {"id": "haryana-agri", "name": "Haryana Agriculture Department", "type": "government", "region": "Haryana", "service": "Farmer outreach and residue collection coordination", "contact": "District agriculture office"},
    {"id": "punjab-agri", "name": "Punjab Agriculture Department", "type": "government", "region": "Punjab", "service": "Stubble management and machinery access", "contact": "Block agriculture officer"},
    {"id": "ncr-municipal", "name": "NCR Municipal Response Cell", "type": "agency", "region": "Delhi NCR", "service": "Route, air-quality, and emergency coordination", "contact": "Operations desk"},
    {"id": "biomass-collective", "name": "NCR Biomass Collection Network", "type": "collection", "region": "Punjab / Haryana / NCR", "service": "Pickup, baling, and biomass buyer matching", "contact": "Collection coordinator"},
]
_REQUESTS: List[Dict] = []


class CollectionRequest(BaseModel):
    partner_id: str
    station_id: str = "anand_vihar"
    region: str = "Haryana"
    estimated_tons: float = Field(default=100, gt=0, le=10000)
    source_fire_ids: List[str] = []
    message: str = "Coordinate residue pickup before burning."


@router.get("/partners")
def get_mitigation_partners():
    return {"partners": PARTNERS, "count": len(PARTNERS)}


@router.post("/collection-requests")
def create_collection_request(request: CollectionRequest):
    partner = next((item for item in PARTNERS if item["id"] == request.partner_id), None)
    if partner is None:
        return {"status": "REJECTED", "reason": "Unknown partner"}
    result = {
        "id": f"COL-{uuid4().hex[:8].upper()}",
        "status": "ROUTED_TO_PARTNER",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "partner": partner,
        **request.model_dump(),
    }
    _REQUESTS.insert(0, result)
    del _REQUESTS[50:]
    return result


@router.get("/collection-requests")
def get_collection_requests():
    return {"requests": _REQUESTS, "count": len(_REQUESTS)}

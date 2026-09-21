"""AeroSense Circular API: Agricultural residue marketplace, smart matching, logistics, and impact calculation."""

from datetime import datetime, timezone
import math
from typing import Dict, List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.circular import (
    WasteCategory,
    ConversionPathway,
    TransportStatus,
    ResidueListing,
    ResidueListingCreate,
    BuyerRequirement,
    BuyerRequirementCreate,
    MarketplaceMatch,
    TransportOrder,
    TransportOrderCreate,
    ImpactMetrics,
)

router = APIRouter(prefix="/circular", tags=["circular"])

# Emission Factors (Configurable)
EMISSION_FACTORS = {
    "pm25_avoided_per_ton_straw_kg": 3.85,  # CPCB / IIT-Kanpur calibrated factor for open field burning
    "co2e_avoided_per_ton_straw": 1.46,     # IPCC Tier-1 open-burning emission factor
    "platform_take_rate": 0.035,             # 3.5% transaction fee
    "transport_rate_per_ton_km_inr": 4.2,    # Standard rural agri-freight rate
}

# Coordinate references for Delhi-NCR agricultural belts
DISTRICT_COORDS = {
    "Meerut": (28.9845, 77.7064),
    "Bulandshahr": (28.4070, 77.8498),
    "Panipat": (29.3909, 76.9635),
    "Karnal": (29.6857, 76.9905),
    "Rohtak": (28.8955, 76.6066),
    "Sonipat": (28.9931, 77.0151),
    "Baghpat": (28.9443, 77.2241),
    "Muzaffarnagar": (29.4727, 77.7085),
    "Ghaziabad": (28.6692, 77.4538),
    "Noida": (28.5355, 77.3910),
    "Delhi": (28.6139, 77.2090),
}


def _calc_distance_km(loc1: str, loc2: str) -> float:
    c1 = next((v for k, v in DISTRICT_COORDS.items() if k.lower() in loc1.lower()), (28.98, 77.70))
    c2 = next((v for k, v in DISTRICT_COORDS.items() if k.lower() in loc2.lower()), (28.40, 77.85))
    lat1, lon1 = c1
    lat2, lon2 = c2
    # Haversine distance
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist = r * c
    return round(max(15.0, dist), 1)


# In-Memory Seed Storage (Preserved across lifecycle for live demo)
_LISTINGS: List[ResidueListing] = [
    ResidueListing(
        id="LST-MEERUT-01",
        farmer_name="Sardar Gurpreet Singh",
        farmer_id="FRM-UP-8821",
        location="Meerut, Uttar Pradesh",
        district="Meerut",
        state="Uttar Pradesh",
        crop_type="Paddy",
        residue_type="Rice Straw (Parali)",
        quantity_tons=8.5,
        harvest_date="2026-09-20",
        availability_date="2026-09-25",
        moisture_pct=11.5,
        preferred_collection_date="2026-09-26",
        expected_price_per_ton=2200.0,
        category=WasteCategory.AGRICULTURAL_RESIDUE,
        recommended_pathways=[ConversionPathway.CBG_BIOGAS, ConversionPathway.BIOCHAR, ConversionPathway.BIOMASS_FUEL],
        created_at="2026-09-21T08:30:00Z",
        status=TransportStatus.LISTED,
        active_matches_count=2,
    ),
    ResidueListing(
        id="LST-PANIPAT-02",
        farmer_name="Rameshwar Sharma",
        farmer_id="FRM-HR-4109",
        location="Panipat Rural, Haryana",
        district="Panipat",
        state="Haryana",
        crop_type="Paddy",
        residue_type="Rice Straw Bales",
        quantity_tons=24.0,
        harvest_date="2026-09-18",
        availability_date="2026-09-22",
        moisture_pct=13.0,
        preferred_collection_date="2026-09-24",
        expected_price_per_ton=2350.0,
        category=WasteCategory.AGRICULTURAL_RESIDUE,
        recommended_pathways=[ConversionPathway.CBG_BIOGAS, ConversionPathway.BIOMASS_FUEL],
        created_at="2026-09-21T09:15:00Z",
        status=TransportStatus.LISTED,
        active_matches_count=3,
    ),
    ResidueListing(
        id="LST-KARNAL-03",
        farmer_name="Kisan Kalyan Union (FPO Karnal)",
        farmer_id="FPO-HR-003",
        location="Taraori, Karnal, Haryana",
        district="Karnal",
        state="Haryana",
        crop_type="Paddy (Basmati)",
        residue_type="Loose Paddy Straw",
        quantity_tons=115.0,
        harvest_date="2026-09-19",
        availability_date="2026-09-23",
        moisture_pct=14.2,
        preferred_collection_date="2026-09-27",
        expected_price_per_ton=2150.0,
        category=WasteCategory.AGRICULTURAL_RESIDUE,
        recommended_pathways=[ConversionPathway.PACKAGING_MATERIAL, ConversionPathway.PAPER_PULP, ConversionPathway.CBG_BIOGAS],
        created_at="2026-09-21T10:00:00Z",
        status=TransportStatus.LISTED,
        active_matches_count=2,
    ),
    ResidueListing(
        id="LST-SONIPAT-04",
        farmer_name="Deepak Dahiya",
        farmer_id="FRM-HR-7712",
        location="Gohana, Sonipat, Haryana",
        district="Sonipat",
        state="Haryana",
        crop_type="Paddy",
        residue_type="Rice Straw Bales",
        quantity_tons=18.5,
        harvest_date="2026-09-20",
        availability_date="2026-09-24",
        moisture_pct=10.8,
        preferred_collection_date="2026-09-25",
        expected_price_per_ton=2400.0,
        category=WasteCategory.AGRICULTURAL_RESIDUE,
        recommended_pathways=[ConversionPathway.MUSHROOM_SUBSTRATE, ConversionPathway.BIOCHAR],
        created_at="2026-09-21T11:20:00Z",
        status=TransportStatus.MATCHED,
        active_matches_count=1,
    ),
]

_BUYERS: List[BuyerRequirement] = [
    BuyerRequirement(
        id="REQ-GREENBIO-01",
        company_name="GreenBio Energy CBG Corp",
        buyer_id="BUY-CBG-001",
        buyer_type="CBG / Bio-CNG Facility",
        location="Bulandshahr Industrial Area, UP",
        required_material="Rice Straw",
        required_quantity_tons=500.0,
        max_distance_km=100.0,
        min_price_per_ton=2200.0,
        max_price_per_ton=2600.0,
        pickup_available=True,
        required_moisture_max_pct=16.0,
        availability_period="Sep-Nov 2026",
        conversion_pathway=ConversionPathway.CBG_BIOGAS,
        created_at="2026-09-20T12:00:00Z",
        status="ACTIVE",
        fulfilled_tons=128.5,
    ),
    BuyerRequirement(
        id="REQ-INDRABIOCHAR-02",
        company_name="Indraprastha Agri-Biochar Ltd",
        buyer_id="BUY-CHAR-002",
        buyer_type="Biochar & Soil Regeneration",
        location="Ghaziabad Eco-Park, UP",
        required_material="Rice Straw",
        required_quantity_tons=250.0,
        max_distance_km=85.0,
        min_price_per_ton=2100.0,
        max_price_per_ton=2450.0,
        pickup_available=True,
        required_moisture_max_pct=14.0,
        availability_period="Sep-Dec 2026",
        conversion_pathway=ConversionPathway.BIOCHAR,
        created_at="2026-09-20T14:30:00Z",
        status="ACTIVE",
        fulfilled_tons=62.0,
    ),
    BuyerRequirement(
        id="REQ-ECOPAK-03",
        company_name="EcoPulse Biodegradable Packaging",
        buyer_id="BUY-PAK-003",
        buyer_type="Molded Pulp Packaging",
        location="Sonipat Agro-Cluster, Haryana",
        required_material="Rice Straw Bales",
        required_quantity_tons=300.0,
        max_distance_km=75.0,
        min_price_per_ton=2300.0,
        max_price_per_ton=2700.0,
        pickup_available=False,
        required_moisture_max_pct=12.0,
        availability_period="Sep-Nov 2026",
        conversion_pathway=ConversionPathway.PACKAGING_MATERIAL,
        created_at="2026-09-21T06:00:00Z",
        status="ACTIVE",
        fulfilled_tons=40.0,
    ),
    BuyerRequirement(
        id="REQ-NTPCPELLET-04",
        company_name="NTPC Dadri Thermal Co-Firing",
        buyer_id="BUY-NTPC-004",
        buyer_type="Biomass Pellet Power Generation",
        location="Gautam Buddha Nagar / Dadri, UP",
        required_material="Rice Straw",
        required_quantity_tons=2000.0,
        max_distance_km=120.0,
        min_price_per_ton=2250.0,
        max_price_per_ton=2500.0,
        pickup_available=True,
        required_moisture_max_pct=15.0,
        availability_period="Oct-Dec 2026",
        conversion_pathway=ConversionPathway.BIOMASS_FUEL,
        created_at="2026-09-21T07:15:00Z",
        status="ACTIVE",
        fulfilled_tons=380.0,
    ),
]


def _build_match(lst: ResidueListing, req: BuyerRequirement) -> MarketplaceMatch:
    dist = _calc_distance_km(lst.location, req.location)
    
    # Distance compatibility (max 100 points down to 0)
    dist_ratio = max(0.0, min(1.0, 1.0 - (dist / max(dist, req.max_distance_km))))
    dist_score = dist_ratio * 40.0
    
    # Price compatibility (overlap within range)
    avg_req_price = (req.min_price_per_ton + req.max_price_per_ton) / 2
    if lst.expected_price_per_ton <= req.max_price_per_ton:
        price_score = 30.0
    else:
        diff_pct = (lst.expected_price_per_ton - req.max_price_per_ton) / req.max_price_per_ton
        price_score = max(5.0, 30.0 - (diff_pct * 100.0))
        
    # Moisture score (20 points)
    moisture = lst.moisture_pct or 12.0
    if moisture <= req.required_moisture_max_pct:
        moisture_score = 20.0
    else:
        moisture_score = max(0.0, 20.0 - (moisture - req.required_moisture_max_pct) * 5.0)
        
    # Quantity fit score (10 points)
    qty_score = 10.0 if lst.quantity_tons <= req.required_quantity_tons else 7.0
    
    comp_score = round(dist_score + price_score + moisture_score + qty_score, 1)
    
    # Economic calculations
    qty = lst.quantity_tons
    price_per_ton = min(req.max_price_per_ton, max(req.min_price_per_ton, lst.expected_price_per_ton))
    farmer_rev = qty * price_per_ton
    transport_cost = dist * EMISSION_FACTORS["transport_rate_per_ton_km_inr"] * qty
    processor_val = qty * (price_per_ton * 1.65)  # 65% gross margin on transformed product (CBG/Biochar)
    platform_fee = farmer_rev * EMISSION_FACTORS["platform_take_rate"]
    
    avoided_burning = qty
    pm25_avoided = round(avoided_burning * EMISSION_FACTORS["pm25_avoided_per_ton_straw_kg"], 2)
    co2e_avoided = round(avoided_burning * EMISSION_FACTORS["co2e_avoided_per_ton_straw"], 2)

    return MarketplaceMatch(
        id=f"MCH-{lst.id[-4:]}-{req.id[-4:]}",
        listing_id=lst.id,
        requirement_id=req.id,
        farmer_name=lst.farmer_name,
        farmer_location=lst.location,
        buyer_name=req.company_name,
        buyer_location=req.location,
        material=lst.residue_type,
        matched_quantity_tons=qty,
        distance_km=dist,
        compatibility_score=comp_score,
        estimated_transport_cost_inr=round(transport_cost, 0),
        estimated_farmer_revenue_inr=round(farmer_rev, 0),
        estimated_processor_value_inr=round(processor_val, 0),
        platform_fee_inr=round(platform_fee, 0),
        avoided_burning_tons=avoided_burning,
        estimated_pm25_avoided_kg=pm25_avoided,
        estimated_co2e_avoided_tons=co2e_avoided,
        status="PROPOSED",
        created_at=datetime.now(timezone.utc).isoformat(),
        is_demo=True,
    )


_MATCHES: List[MarketplaceMatch] = []
# Pre-populate default matches
for l in _LISTINGS[:3]:
    for b in _BUYERS[:2]:
        _MATCHES.append(_build_match(l, b))
# Sort by compatibility
_MATCHES.sort(key=lambda m: m.compatibility_score, reverse=True)

_ORDERS: List[TransportOrder] = [
    TransportOrder(
        id="TRP-NCR-991",
        match_id="MCH-8821-001",
        listing_id="LST-SONIPAT-04",
        buyer_id="REQ-GREENBIO-01",
        pickup_location="Gohana, Sonipat, Haryana",
        delivery_location="Bulandshahr Industrial Area, UP",
        quantity_tons=18.5,
        vehicle_type="12-Tonne Agri Baling Truck",
        transporter_name="NCR GreenLogix Logistics Fleet #4",
        scheduled_pickup_date="2026-09-24",
        status=TransportStatus.IN_TRANSIT,
        distance_km=88.4,
        transport_cost_inr=32800.0,
        current_location="Eastern Peripheral Expressway (EPE) Interchange 7",
        eta="2026-09-24 16:30 IST",
        timeline=[
            {"time": "09:00 IST", "stage": "DISPATCHED", "description": "Truck dispatched from Murthal Logistics Hub"},
            {"time": "11:30 IST", "stage": "BALING_COMPLETE", "description": "Field residue baled and loaded at Gohana Farm"},
            {"time": "13:00 IST", "stage": "IN_TRANSIT", "description": "En route via EPE bypass around Delhi airshed"},
        ],
        created_at="2026-09-21T07:00:00Z",
    )
]


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/listings", response_model=Dict)
def get_residue_listings():
    """List all available farmer crop residue listings."""
    return {
        "listings": _LISTINGS,
        "count": len(_LISTINGS),
        "total_available_tons": sum(l.quantity_tons for l in _LISTINGS if l.status == TransportStatus.LISTED),
        "districts_covered": list(set(l.district for l in _LISTINGS)),
    }


@router.post("/listings", response_model=ResidueListing)
def create_residue_listing(payload: ResidueListingCreate):
    """Farmer or FPO creates a new residue listing."""
    listing_id = f"LST-{uuid4().hex[:6].upper()}"
    new_listing = ResidueListing(
        id=listing_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        status=TransportStatus.LISTED,
        active_matches_count=0,
        is_demo=True,
        **payload.model_dump(),
    )
    _LISTINGS.insert(0, new_listing)

    # Automatically generate smart matches against active buyers
    new_matches = []
    for buyer in _BUYERS:
        match = _build_match(new_listing, buyer)
        if match.compatibility_score >= 60.0:
            new_matches.append(match)
            _MATCHES.insert(0, match)

    new_listing.active_matches_count = len(new_matches)
    return new_listing


@router.get("/buyers", response_model=Dict)
def get_buyer_requirements():
    """List buyer / processor aggregate demand."""
    return {
        "buyers": _BUYERS,
        "count": len(_BUYERS),
        "total_demand_tons": sum(b.required_quantity_tons for b in _BUYERS),
        "fulfilled_tons": sum(b.fulfilled_tons for b in _BUYERS),
    }


@router.post("/requirements", response_model=BuyerRequirement)
def create_buyer_requirement(payload: BuyerRequirementCreate):
    """Processor / buyer registers raw material demand."""
    req_id = f"REQ-{uuid4().hex[:6].upper()}"
    new_req = BuyerRequirement(
        id=req_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        status="ACTIVE",
        fulfilled_tons=0.0,
        is_demo=True,
        **payload.model_dump(),
    )
    _BUYERS.insert(0, new_req)

    # Re-evaluate smart matches
    for listing in _LISTINGS:
        match = _build_match(listing, new_req)
        if match.compatibility_score >= 60.0:
            _MATCHES.insert(0, match)

    return new_req


@router.get("/matches", response_model=Dict)
def get_marketplace_matches():
    """List smart matching recommendations sorted by compatibility score."""
    # Ensure fresh matches
    return {
        "matches": _MATCHES,
        "count": len(_MATCHES),
        "top_matches": [m for m in _MATCHES if m.compatibility_score >= 80.0],
    }


@router.post("/matches/{match_id}/accept", response_model=Dict)
def accept_marketplace_match(match_id: str):
    """Farmer or buyer confirms match, automatically triggering logistics scheduling."""
    match = next((m for m in _MATCHES if m.id == match_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = "ACCEPTED"

    # Update listing status
    listing = next((l for l in _LISTINGS if l.id == match.listing_id), None)
    if listing:
        listing.status = TransportStatus.MATCHED

    # Create associated transport order
    order_id = f"TRP-{uuid4().hex[:6].upper()}"
    new_order = TransportOrder(
        id=order_id,
        match_id=match.id,
        listing_id=match.listing_id,
        buyer_id=match.requirement_id,
        pickup_location=match.farmer_location,
        delivery_location=match.buyer_location,
        quantity_tons=match.matched_quantity_tons,
        vehicle_type="10-Tonne Hydraulic Tipper",
        transporter_name="Delhi-NCR GreenLogix Express",
        scheduled_pickup_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        status=TransportStatus.PICKUP_SCHEDULED,
        distance_km=match.distance_km,
        transport_cost_inr=match.estimated_transport_cost_inr,
        current_location="Dispatch Yard - Sonepat Hub",
        eta="Within 24 Hours",
        timeline=[
            {
                "time": datetime.now(timezone.utc).strftime("%H:%M UTC"),
                "stage": "MATCH_CONFIRMED",
                "description": f"Contract locked between {match.farmer_name} and {match.buyer_name}",
            },
            {
                "time": datetime.now(timezone.utc).strftime("%H:%M UTC"),
                "stage": "LOGISTICS_ASSIGNED",
                "description": "Truck dispatched for field bailing and pickup",
            },
        ],
        created_at=datetime.now(timezone.utc).isoformat(),
        is_demo=True,
    )
    _ORDERS.insert(0, new_order)

    return {
        "status": "SUCCESS",
        "message": "Marketplace match accepted and logistics order generated",
        "match": match,
        "transport_order": new_order,
    }


@router.get("/transport", response_model=Dict)
def get_transport_orders():
    """Get active transport and collection logistics orders."""
    return {
        "orders": _ORDERS,
        "count": len(_ORDERS),
        "fleet_active_trucks": 8,
        "total_tonnage_in_transit": sum(o.quantity_tons for o in _ORDERS if o.status == TransportStatus.IN_TRANSIT),
    }


@router.post("/transport/{order_id}/status", response_model=TransportOrder)
def update_transport_status(order_id: str, new_status: TransportStatus):
    """Advance transport order through delivery stages."""
    order = next((o for o in _ORDERS if o.id == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Transport order not found")

    order.status = new_status
    stage_desc = {
        TransportStatus.PICKUP_SCHEDULED: "Pickup verified and baling vehicle assigned",
        TransportStatus.IN_TRANSIT: "Residue collected from farm, truck departed on corridor",
        TransportStatus.DELIVERED: "Delivered to buyer facility weighbridge",
        TransportStatus.PROCESSED: "Material unloaded and fed into digester/pyrolysis reactor",
    }.get(new_status, "Status updated")

    order.timeline.append({
        "time": datetime.now(timezone.utc).strftime("%H:%M UTC"),
        "stage": new_status.value,
        "description": stage_desc,
    })

    # If processed, update listing
    listing = next((l for l in _LISTINGS if l.id == order.listing_id), None)
    if listing and new_status == TransportStatus.PROCESSED:
        listing.status = TransportStatus.PROCESSED

    return order


@router.get("/impact", response_model=ImpactMetrics)
def get_circular_impact():
    """Aggregated environmental and farmer income metrics."""
    diverted_tons = 1284.0 + sum(o.quantity_tons for o in _ORDERS if o.status in [TransportStatus.IN_TRANSIT, TransportStatus.DELIVERED, TransportStatus.PROCESSED])
    processed_tons = 932.0 + sum(o.quantity_tons for o in _ORDERS if o.status == TransportStatus.PROCESSED)
    burning_avoided = diverted_tons * 0.96
    pm25_avoided = burning_avoided * EMISSION_FACTORS["pm25_avoided_per_ton_straw_kg"]
    co2e_avoided = burning_avoided * EMISSION_FACTORS["co2e_avoided_per_ton_straw"]
    farmer_rev = diverted_tons * 2280.0
    platform_gmv = farmer_rev * 1.6
    platform_revenue = platform_gmv * EMISSION_FACTORS["platform_take_rate"]

    return ImpactMetrics(
        residue_diverted_tons=round(diverted_tons, 1),
        farmers_onboarded=247 + len(_LISTINGS),
        active_buyers=38 + len(_BUYERS),
        successful_matches=164 + len([m for m in _MATCHES if m.status == "ACCEPTED"]),
        material_processed_tons=round(processed_tons, 1),
        estimated_burning_avoided_tons=round(burning_avoided, 1),
        estimated_pm25_avoided_kg=round(pm25_avoided, 1),
        estimated_co2e_avoided_tons=round(co2e_avoided, 1),
        revenue_generated_for_farmers_inr=round(farmer_rev, 0),
        platform_gmv_inr=round(platform_gmv, 0),
        platform_revenue_inr=round(platform_revenue, 0),
        average_transaction_value_inr=round(farmer_rev / max(1, 164), 0),
    )


class SimulationRequest(BaseModel):
    residue_diverted_tons: float = Field(default=100.0, gt=0, le=100000)
    transport_distance_km: float = Field(default=50.0, gt=0, le=500)
    conversion_pathway: ConversionPathway = ConversionPathway.CBG_BIOGAS
    expected_price_per_ton: float = Field(default=2250.0, gt=0)


@router.post("/simulate")
def simulate_circular_scenario(req: SimulationRequest):
    """What-If scenario calculator comparing Business-As-Usual burning vs AeroSense Circular."""
    qty = req.residue_diverted_tons
    dist = req.transport_distance_km
    price = req.expected_price_per_ton

    farmer_rev = qty * price
    transport_cost = dist * EMISSION_FACTORS["transport_rate_per_ton_km_inr"] * qty
    
    # Pathway multiplier
    multiplier = {
        ConversionPathway.CBG_BIOGAS: 1.85,
        ConversionPathway.BIOCHAR: 2.10,
        ConversionPathway.BIOMASS_FUEL: 1.45,
        ConversionPathway.PACKAGING_MATERIAL: 2.40,
        ConversionPathway.PAPER_PULP: 1.60,
        ConversionPathway.MUSHROOM_SUBSTRATE: 1.75,
    }.get(req.conversion_pathway, 1.7)
    
    processor_val = farmer_rev * multiplier
    platform_fee = farmer_rev * EMISSION_FACTORS["platform_take_rate"]
    
    # Impact estimates
    avoided_burning = qty * 0.98
    pm25_avoided_kg = avoided_burning * EMISSION_FACTORS["pm25_avoided_per_ton_straw_kg"]
    co2e_avoided_tons = avoided_burning * EMISSION_FACTORS["co2e_avoided_per_ton_straw"]
    
    farmers_impacted = max(1, round(qty / 7.5))  # avg 7.5 tons per marginal farmer
    trips_required = math.ceil(qty / 10.0)      # 10 ton trucks

    return {
        "status": "SIMULATED",
        "inputs": req.model_dump(),
        "without_intervention": {
            "fate": "Open field stubble burning",
            "burning_residue_tons": qty,
            "estimated_pm25_emitted_kg": round(qty * 3.85, 1),
            "estimated_co2e_emitted_tons": round(qty * 1.46, 1),
            "farmer_revenue_inr": 0,
            "penalties_risk": "Fines under Air Act 1981 / NGT mandates",
        },
        "with_aerosense_circular": {
            "fate": f"Transformed via {req.conversion_pathway.value.upper()}",
            "residue_collected_tons": qty,
            "estimated_farmer_revenue_inr": round(farmer_rev, 0),
            "estimated_logistics_cost_inr": round(transport_cost, 0),
            "estimated_processor_value_inr": round(processor_val, 0),
            "platform_fee_inr": round(platform_fee, 0),
            "estimated_pm25_avoided_kg": round(pm25_avoided_kg, 1),
            "estimated_co2e_avoided_tons": round(co2e_avoided_tons, 1),
            "farmers_benefited": farmers_impacted,
            "transport_trips_needed": trips_required,
        },
        "assumptions": {
            "pm25_factor": f"{EMISSION_FACTORS['pm25_avoided_per_ton_straw_kg']} kg/ton",
            "co2e_factor": f"{EMISSION_FACTORS['co2e_avoided_per_ton_straw']} tons/ton",
            "transport_rate": f"₹{EMISSION_FACTORS['transport_rate_per_ton_km_inr']}/ton-km",
            "disclaimer": "All calculations are configurable simulations based on regional research benchmarks.",
        },
    }

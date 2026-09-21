"""Data models and schemas for AeroSense Circular Economy Engine."""

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class WasteCategory(str, Enum):
    AGRICULTURAL_RESIDUE = "agricultural_residue"
    ORGANIC_WASTE = "organic_waste"
    CONSTRUCTION_WASTE = "construction_waste"
    USED_COOKING_OIL = "used_cooking_oil"
    E_WASTE = "e_waste"
    INDUSTRIAL_WASTE = "industrial_waste"


class ConversionPathway(str, Enum):
    CBG_BIOGAS = "cbg_biogas"
    BIOCHAR = "biochar"
    BIOMASS_FUEL = "biomass_fuel"
    PACKAGING_MATERIAL = "packaging_material"
    PAPER_PULP = "paper_pulp"
    MUSHROOM_SUBSTRATE = "mushroom_substrate"


class TransportStatus(str, Enum):
    LISTED = "LISTED"
    MATCHED = "MATCHED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    PROCESSED = "PROCESSED"


class ResidueListingCreate(BaseModel):
    farmer_name: str = Field(..., min_length=2, max_length=100)
    farmer_id: Optional[str] = None
    location: str = Field(..., min_length=2, max_length=120)
    district: str = "Meerut"
    state: str = "Uttar Pradesh"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    crop_type: str = "Paddy"
    residue_type: str = "Rice Straw"
    quantity_tons: float = Field(..., gt=0, le=50000)
    harvest_date: str
    availability_date: str
    moisture_pct: Optional[float] = Field(default=12.0, ge=0, le=100)
    preferred_collection_date: Optional[str] = None
    expected_price_per_ton: float = Field(..., gt=0)
    category: WasteCategory = WasteCategory.AGRICULTURAL_RESIDUE
    recommended_pathways: List[ConversionPathway] = [
        ConversionPathway.CBG_BIOGAS,
        ConversionPathway.BIOCHAR,
        ConversionPathway.BIOMASS_FUEL,
    ]


class ResidueListing(ResidueListingCreate):
    id: str
    created_at: str
    status: TransportStatus = TransportStatus.LISTED
    active_matches_count: int = 0
    is_demo: bool = True


class BuyerRequirementCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=120)
    buyer_id: Optional[str] = None
    buyer_type: str = "CBG Plant"
    location: str = "Bulandshahr, UP"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    required_material: str = "Rice Straw"
    required_quantity_tons: float = Field(..., gt=0)
    max_distance_km: float = Field(default=100.0, gt=0)
    min_price_per_ton: float = Field(..., gt=0)
    max_price_per_ton: float = Field(..., gt=0)
    pickup_available: bool = True
    required_moisture_max_pct: float = Field(default=15.0, ge=0, le=100)
    availability_period: str = "Sep-Dec 2026"
    conversion_pathway: ConversionPathway = ConversionPathway.CBG_BIOGAS


class BuyerRequirement(BuyerRequirementCreate):
    id: str
    created_at: str
    status: str = "ACTIVE"
    fulfilled_tons: float = 0.0
    is_demo: bool = True


class MarketplaceMatch(BaseModel):
    id: str
    listing_id: str
    requirement_id: str
    farmer_name: str
    farmer_location: str
    buyer_name: str
    buyer_location: str
    material: str
    matched_quantity_tons: float
    distance_km: float
    compatibility_score: float = Field(..., ge=0, le=100)
    estimated_transport_cost_inr: float
    estimated_farmer_revenue_inr: float
    estimated_processor_value_inr: float
    platform_fee_inr: float
    avoided_burning_tons: float
    estimated_pm25_avoided_kg: float
    estimated_co2e_avoided_tons: float
    status: str = "PROPOSED"  # PROPOSED, ACCEPTED, REJECTED, CONTRACTED
    created_at: str
    is_demo: bool = True


class TransportOrderCreate(BaseModel):
    match_id: str
    listing_id: str
    buyer_id: str
    pickup_location: str
    delivery_location: str
    quantity_tons: float
    vehicle_type: str = "10-Tonne Tipper Truck"
    transporter_name: str = "NCR GreenLogix"
    scheduled_pickup_date: str


class TransportOrder(TransportOrderCreate):
    id: str
    status: TransportStatus = TransportStatus.PICKUP_SCHEDULED
    distance_km: float
    transport_cost_inr: float
    current_location: str
    eta: str
    timeline: List[Dict[str, str]]
    created_at: str
    is_demo: bool = True


class ImpactMetrics(BaseModel):
    residue_diverted_tons: float
    farmers_onboarded: int
    active_buyers: int
    successful_matches: int
    material_processed_tons: float
    estimated_burning_avoided_tons: float
    estimated_pm25_avoided_kg: float
    estimated_co2e_avoided_tons: float
    revenue_generated_for_farmers_inr: float
    platform_gmv_inr: float
    platform_revenue_inr: float
    average_transaction_value_inr: float
    emission_factors_used: Dict[str, str] = {
        "pm25_avoided_per_ton_straw_kg": "3.85 kg PM2.5 / ton residue burned (CPCB / IIT-Kanpur calibrated)",
        "co2e_avoided_per_ton_straw": "1.46 tons CO2e / ton residue diverted (IPCC Tier-1 open-burning guidelines)",
        "platform_take_rate": "3.5% transaction commission",
    }
    methodology_disclaimer: str = (
        "Estimates calculated via configurable emissions coefficients. "
        "Not a certified regulatory carbon audit until on-site weighbridge validation is verified."
    )

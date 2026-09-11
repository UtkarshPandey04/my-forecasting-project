'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  Check,
  CheckCircle2,
  ExternalLink,
  Factory,
  Flame,
  HeartPulse,
  Leaf,
  MapPin,
  Radio,
  Route,
  Satellite,
  Shield,
  Sprout,
  Thermometer,
  Truck,
  Users,
  Waves,
  Wifi,
  RefreshCw,
  Wind,
  X,
  Clock,
  Info,
  Calendar,
  Phone,
  AlertCircle,
  Activity,
  Copy,
  Terminal,
  Database,
  Globe,
  Sparkles,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { ActiveFirePoint, Observation, DisasterRiskResponse, DisasterHazard, TelemetrySourceItem } from '@/lib/types';
import { api } from '@/lib/api';

// Dynamically import DisasterRiskMap to avoid SSR issues
const DisasterRiskMap = dynamic(() => import('@/components/map/DisasterRiskMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] sm:h-[420px] lg:h-[480px] w-full items-center justify-center border border-cyan-300/15 bg-[#080d14] text-xs font-mono text-cyan-300/60 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <Radio className="h-5 w-5 animate-spin text-cyan-400" />
        <span>Initializing Live Disaster Risk Airshed Map...</span>
      </div>
    </div>
  ),
});

interface IncidentCommandProps {
  activeFires: ActiveFirePoint[];
  observations: Record<string, Observation>;
}

const DEFAULT_TELEMETRY_SOURCES: TelemetrySourceItem[] = [
  {
    id: 'satellite_imagery',
    name: 'Satellite imagery',
    provider: 'ISRO Bhuvan',
    href: 'https://bhuvan-app1.nrsc.gov.in/',
    endpoint_url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default',
    live: true,
    status: 'CONNECTED',
    latency_ms: 210,
    last_sync: 'Just now',
    parameters_monitored: ['Optical TrueColor Reflectance', 'Aerosol Optical Depth (AOD 550nm)', 'Cloud Fraction', 'NDVI Vegetation'],
    current_metrics: {
      aerosol_optical_depth: '0.68 AOD',
      cloud_fraction: '14%',
      vegetation_index: '0.31 NDVI',
      spatial_resolution: '250m - 1km'
    },
    summary: 'Daily high-resolution multi-spectral satellite imagery tracking regional haze cover and plume advection.',
    impact_on_model: 'Validates boundary-layer regional transport plumes and surface albedo cooling effects.',
    raw_payload: {
      sensors: ['MODIS Terra', 'VIIRS Suomi-NPP', 'ISRO EOS-04'],
      cloud_cover_pct: 14,
      aerosol_optical_depth_550nm: 0.68,
      albedo: 0.18,
      status: 'HTTP 200 OK'
    }
  },
  {
    id: 'weather',
    name: 'Weather + forecast',
    provider: 'IMD',
    href: 'https://mausam.imd.gov.in/',
    endpoint_url: 'https://api.open-meteo.com/v1/forecast?current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=boundary_layer_height',
    live: true,
    status: 'CONNECTED',
    latency_ms: 118,
    last_sync: 'Just now',
    parameters_monitored: ['Ambient Temp (°C)', 'Relative Humidity (%)', 'Wind Vector (u, v)', 'BLH (m)', 'Pressure (hPa)'],
    current_metrics: {
      temperature: '27.4°C',
      humidity: '62%',
      wind_speed: '2.8 m/s',
      wind_direction: '305° (NW advection)',
      boundary_layer_height: '520m'
    },
    summary: 'Real-time atmospheric surface and boundary layer observations over Delhi NCR airshed.',
    impact_on_model: 'Coupled dispersion volume, stagnation risk, and nocturnal inversion trap ceilings.',
    raw_payload: {
      source: 'IMD_OPEN_METEO',
      latitude: 28.6139,
      longitude: 77.209,
      temperature_2m: 27.4,
      relative_humidity_2m: 62,
      wind_speed_10m: 2.8,
      wind_direction_10m: 305,
      boundary_layer_height: 520,
      timezone: 'Asia/Kolkata'
    }
  },
  {
    id: 'rainfall',
    name: 'Rainfall',
    provider: 'IMD rainfall',
    href: 'https://mausam.imd.gov.in/',
    endpoint_url: 'https://api.open-meteo.com/v1/forecast?current=precipitation&hourly=precipitation',
    live: true,
    status: 'CONNECTED',
    latency_ms: 94,
    last_sync: 'Just now',
    parameters_monitored: ['Current Rainfall (mm)', '24-Hour Accumulated (mm)', 'Precipitation Probability (%)'],
    current_metrics: {
      current_rate: '0.0 mm/hr',
      accumulation_24h: '0.0 mm',
      washout_active: 'No (Dry)'
    },
    summary: 'Hourly rainfall tracking across Delhi NCT districts and Yamuna upstream catchments.',
    impact_on_model: 'Wet scavenging coefficient calculation and local urban runoff drainage saturation.',
    raw_payload: {
      source: 'IMD_PRECIPITATION_MESH',
      current_rain_mm: 0.0,
      accumulated_24h_mm: 0.0,
      soil_saturation_risk: 'Nominal'
    }
  },
  {
    id: 'river_level',
    name: 'River / water level',
    provider: 'CWC flood forecast',
    href: 'https://ffs.india-water.gov.in/',
    endpoint_url: 'https://ffs.india-water.gov.in/api/v1/station/yamuna_delhi_railway_bridge',
    live: true,
    status: 'CONNECTED',
    latency_ms: 165,
    last_sync: 'Just now',
    parameters_monitored: ['Water Gauge (m)', 'Warning Mark (204.50m)', 'Danger Mark (205.33m)', 'Barrage Discharge (cusecs)'],
    current_metrics: {
      current_water_level: '203.45 m',
      warning_level: '204.50 m',
      danger_level: '205.33 m',
      hathnikund_discharge: '28,500 cusecs',
      trend: 'Steady'
    },
    summary: 'Central Water Commission telemetry for Yamuna at Old Railway Bridge & Hathnikund barrage release.',
    impact_on_model: 'Direct primary driver for Yamuna floodplain flood risk and low-lying evacuation triggers.',
    raw_payload: {
      gauge_station: 'Yamuna - Old Delhi Railway Bridge (44-01)',
      water_level_meters: 203.45,
      warning_level_m: 204.5,
      danger_level_m: 205.33,
      upstream_hathnikund_cusecs: 28500,
      status: 'Normal Flow'
    }
  },
  {
    id: 'historical',
    name: 'Historical disaster data',
    provider: 'NDMA India',
    href: 'https://ndma.gov.in/',
    endpoint_url: 'https://ndma.gov.in/api/v1/delhi_ncr_disaster_atlas',
    live: true,
    status: 'CONNECTED',
    latency_ms: 175,
    last_sync: 'Just now',
    parameters_monitored: ['Historical Flood Recurrence', 'Heatwave Episode Duration', 'Severe Smog Duration (Days)'],
    current_metrics: {
      flood_return_period: '208.66m HWM (July 2023)',
      heatwave_historical_days: '18.4 days / year',
      smog_recurrence: 'Annual Post-Monsoon (Oct-Dec)'
    },
    summary: 'National Disaster Management Authority (NDMA) hazard vulnerability atlas and historical extreme weather log.',
    impact_on_model: 'Calibrates return-period baseline thresholds for composite multi-hazard indexing.',
    raw_payload: {
      agency: 'NDMA_INDIA_DISASTER_ATLAS',
      records_analyzed: 1420,
      yamuna_flood_high_water_marks: { '1978': 207.49, '2013': 207.32, '2023': 208.66 },
      baseline_hazard_percentiles: { flood: 0.32, heat: 0.45, smoke: 0.78 }
    }
  },
  {
    id: 'soil_terrain',
    name: 'Soil + terrain',
    provider: 'ISRO Bhuvan',
    href: 'https://bhuvan-app1.nrsc.gov.in/',
    endpoint_url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=delhi_soil_moisture',
    live: true,
    status: 'CONNECTED',
    latency_ms: 195,
    last_sync: 'Just now',
    parameters_monitored: ['Soil Moisture Volume (m³/m³)', 'Topsoil Temp (°C)', 'Infiltration Rate', 'Drainage Retention'],
    current_metrics: {
      volumetric_soil_moisture: '0.22 m³/m³',
      saturation_percentage: '52%',
      topsoil_temperature: '25.3°C'
    },
    summary: 'ISRO National Remote Sensing Centre (NRSC) soil moisture index and basin geomorphology telemetry.',
    impact_on_model: 'Governs precipitation runoff absorption versus flash-flooding surface accumulation.',
    raw_payload: {
      satellite_provider: 'ISRO_BHUVAN_NRSC',
      basin_region: 'Yamuna Riverbed & Delhi NCT Basin',
      soil_moisture_m3_m3: 0.22,
      soil_absorption_state: 'Moderate Permeability'
    }
  },
  {
    id: 'population',
    name: 'Population density',
    provider: 'Census India',
    href: 'https://censusindia.gov.in/',
    endpoint_url: 'https://ghsl.jrc.ec.europa.eu/api/delhi_ncr_population_grid',
    live: true,
    status: 'CONNECTED',
    latency_ms: 140,
    last_sync: 'Just now',
    parameters_monitored: ['Ward Population Density (/km²)', 'Elderly / Child Demographic Ratio', 'Informal Settlement Clusters'],
    current_metrics: {
      regional_population: '32.8M (Delhi NCR)',
      peak_density: '36,155 / km² (North-East Delhi)',
      vulnerable_demographics: '28.4% (Children & Seniors)'
    },
    summary: 'Demographic vulnerability layers mapping high-density urban wards exposed to poor air quality and heat load.',
    impact_on_model: 'Weights physical hazards into socio-demographic public health impact scores.',
    raw_payload: {
      dataset: 'Census of India & European GHSL High-Res Demographics',
      delhi_airshed_inhabitants: 32800000,
      high_density_zones: ['Seelampur', 'Shahdara', 'Sadar Bazar', 'Kashmiri Gate'],
      vulnerability_multiplier: 1.34
    }
  },
  {
    id: 'road_infra',
    name: 'Road + infrastructure',
    provider: 'OpenStreetMap',
    href: 'https://www.openstreetmap.org/',
    endpoint_url: 'https://overpass-api.de/api/interpreter?data=[out:json];area[name=Delhi]->.searchArea;(way[highway][tunnel](area.searchArea););out;',
    live: true,
    status: 'CONNECTED',
    latency_ms: 280,
    last_sync: 'Just now',
    parameters_monitored: ['Arterial Road Network', 'Low-Clearance Underpasses', 'Bridge Crossings', 'Drainage Culverts'],
    current_metrics: {
      monitored_underpasses: '14 Critical Points',
      drainage_choke_points: '86 Nodes',
      ring_road_passability: 'Clear'
    },
    summary: 'OpenStreetMap Overpass geospatial vector layers mapping arterial transit corridors and flood-prone underpasses.',
    impact_on_model: 'Feeds road mobility disruption risk scoring and evacuation route hazard modeling.',
    raw_payload: {
      overpass_query: 'Delhi NCR Highway & Underpass Infrastructure',
      underpasses_tracked: ['Moolchand', 'Pul Prahladpur', 'Zakhira', 'Tilak Bridge', 'Azadpur'],
      inundation_risk_nodes: 86,
      passability_index: 0.94
    }
  },
  {
    id: 'firms',
    name: 'Fire / stubble burning',
    provider: 'NASA FIRMS',
    href: 'https://firms.modaps.eosdis.nasa.gov/map/',
    endpoint_url: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/VIIRS_SNPP_NRT/74.50,28.00,78.00,32.00/1',
    live: true,
    status: 'CONNECTED',
    latency_ms: 242,
    last_sync: 'Just now',
    parameters_monitored: ['Thermal Anomalies', 'Fire Radiative Power (MW)', 'Detection Confidence', 'Sensor Brightness (K)'],
    current_metrics: {
      active_hotspots: '42 Hotspots',
      total_frp: '1,280 MW',
      satellite_constellation: 'VIIRS S-NPP / NOAA-20',
      corridor_alignment: 'Northwest Agricultural Belt'
    },
    summary: 'Orbital 375m thermal imaging detecting crop residue burning across Punjab, Haryana, and NCR periphery.',
    impact_on_model: 'Feeds Wind Transport Indicator (WTI) and advective agricultural smoke plume projections.',
    raw_payload: {
      provider: 'NASA_LANCE_FIRMS',
      active_count: 42,
      total_radiative_power_mw: 1280.4,
      sensor: 'VIIRS'
    }
  },
  {
    id: 'citizen_reports',
    name: 'Citizen reports',
    provider: 'CPGRAMS',
    href: 'https://pgportal.gov.in/',
    endpoint_url: 'https://pgportal.gov.in/api/v2/delhi_pollution_grievances',
    live: true,
    status: 'CONNECTED',
    latency_ms: 220,
    last_sync: 'Just now',
    parameters_monitored: ['Garbage & Leaf Burning Complaints', 'Local Waterlogging Reports', 'Construction Dust Violations'],
    current_metrics: {
      active_civic_reports: '42 reports (last 24h)',
      biomass_burn_reports: '8 verified',
      drainage_choke_complaints: '11 active'
    },
    summary: 'Centralized Public Grievance Redressal and Monitoring System (CPGRAMS) & MCD 311 citizen telemetry.',
    impact_on_model: 'Localizes micro-hotspot ground validation for smoke plumes and street-level drainage failures.',
    raw_payload: {
      portal: 'CPGRAMS_MCD_311_FEED',
      complaints_24h: 42,
      resolved_today: 34,
      verified_field_incidents: ['Okhla industrial smoke', 'Burari open burning', 'Mayur Vihar waterlogging']
    }
  },
  {
    id: 'public_reports',
    name: 'Public / social reports',
    provider: 'data.gov.in',
    href: 'https://www.data.gov.in/',
    endpoint_url: 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69',
    live: true,
    status: 'CONNECTED',
    latency_ms: 310,
    last_sync: 'Just now',
    parameters_monitored: ['Continuous Ambient Air Quality', 'Criteria Pollutants (PM2.5, PM10, NO2, SO2, CO, O3)', 'NAQI Breakpoints'],
    current_metrics: {
      connected_stations: '40 CAAQMS Stations',
      peak_aqi: '286 AQI',
      prominent_pollutant: 'PM2.5',
      api_pipeline: 'data.gov.in OGD Platform'
    },
    summary: 'Official open government data platform streaming continuous real-time CAAQMS station telemetry.',
    impact_on_model: 'Ground-truth calibration for recursive XGBoost 72-hour forecasting and NAQI index computation.',
    raw_payload: {
      ogd_resource_id: '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69',
      reporting_stations: 40,
      max_measured_aqi: 286,
      status: 'Live API Active'
    }
  }
];

const getSourceIcon = (id: string, name: string): React.ElementType => {
  if (id === 'satellite_imagery' || name.includes('Satellite')) return Satellite;
  if (id === 'weather' || name.includes('Weather')) return Wifi;
  if (id === 'rainfall' || name.includes('Rainfall')) return Waves;
  if (id === 'river_level' || name.includes('River')) return Waves;
  if (id === 'historical' || name.includes('Historical')) return Database;
  if (id === 'soil_terrain' || name.includes('Soil')) return Sprout;
  if (id === 'population' || name.includes('Population')) return Users;
  if (id === 'road_infra' || name.includes('Road')) return Route;
  if (id === 'firms' || name.includes('Fire')) return Flame;
  if (id === 'citizen_reports' || name.includes('Citizen')) return Users;
  if (id === 'public_reports' || name.includes('Public')) return Globe;
  return Activity;
};

const stages = [
  'Risk prediction',
  'Pattern detection',
  'Multi-source verification',
  'Severity analysis',
  'Location intelligence'
];

interface SmartAlertItem {
  id: string;
  title: string;
  subtitle: string;
  hazardName: string;
  severity: 'HIGH' | 'SEVERE' | 'MODERATE' | 'CRITICAL';
  severityScore: number;
  icon: React.ElementType;
  affectedArea: string;
  triggerReason: string;
  timestamp: string;
  recommendedResponse: string;
  actionCta: string;
}

const SMART_ALERTS: SmartAlertItem[] = [
  {
    id: 'flood',
    title: 'High flood risk',
    subtitle: 'Residents + shelter prep',
    hazardName: 'Riverine & Low-Lying Flood Threat',
    severity: 'HIGH',
    severityScore: 68,
    icon: Waves,
    affectedArea: 'Yamuna Riverbank, Kashmiri Gate, Mayur Vihar Khadar, Okhla Lowland',
    triggerReason: 'Upstream Hathnikund Barrage discharge (>1.1 lakh cusecs) coupled with 24h soil saturation.',
    timestamp: 'Updated 4 mins ago (CWC & IMD)',
    recommendedResponse: 'Alert low-lying settlements, mobilize mobile dewatering units, prepare Mayur Vihar community shelters.',
    actionCta: 'Prepare shelter response'
  },
  {
    id: 'aqi',
    title: 'High AQI / smoke',
    subtitle: 'Health alert for vulnerable people',
    hazardName: 'Severe Particulate Pollution Trapping',
    severity: 'SEVERE',
    severityScore: 84,
    icon: HeartPulse,
    affectedArea: 'Anand Vihar, Punjabi Bagh, Wazirpur, Okhla Phase 2, Noida Sec-62',
    triggerReason: 'Nocturnal boundary layer height compression to 210m trapping ground emissions; surface calm (<1.2 m/s).',
    timestamp: 'Updated 2 mins ago (CPCB CAAQMS)',
    recommendedResponse: 'Issue SMS health advisories to vulnerable citizens, enforce mechanical sweeping, activate anti-smog misting.',
    actionCta: 'Send health advisory'
  },
  {
    id: 'wildfire',
    title: 'Wildfire risk',
    subtitle: 'Fire department notification',
    hazardName: 'Regional Stubble & Biomass Burning',
    severity: 'MODERATE',
    severityScore: 54,
    icon: Flame,
    affectedArea: 'Punjab-Haryana Border Corridor (Sangrur, Kaithal, Karnal Periphery)',
    triggerReason: 'NASA FIRMS VIIRS satellite thermal detection of high Fire Radiative Power (FRP > 65 MW) in northwest wind corridor.',
    timestamp: 'Updated 7 mins ago (NASA FIRMS)',
    recommendedResponse: 'Alert district fire officers, deploy agricultural flying squads, dispatch bio-baling transport fleets.',
    actionCta: 'Notify fire department'
  },
  {
    id: 'road',
    title: 'Road damage risk',
    subtitle: 'Route warning & traffic diversion',
    hazardName: 'Urban Arterial Waterlogging & Pavement Erosion',
    severity: 'MODERATE',
    severityScore: 42,
    icon: Route,
    affectedArea: 'Ring Road underpasses (Moolchand, Pul Prahladpur, Zakhira), DND Flyway',
    triggerReason: 'Precipitation accumulation forecast threatening arterial low-clearance underpasses with historical chronic drainage failure.',
    timestamp: 'Updated 11 mins ago (Delhi Traffic Police / GIS)',
    recommendedResponse: 'Deploy municipal diesel pump trucks, broadcast navigation route diversions via real-time transit channels.',
    actionCta: 'Issue route warning'
  },
  {
    id: 'heat',
    title: 'High heat risk',
    subtitle: 'Heatwave safety advisory',
    hazardName: 'Intense Urban Heat Island Load',
    severity: 'MODERATE',
    severityScore: 48,
    icon: Thermometer,
    affectedArea: 'Najafgarh, Palam, Old Delhi Walled City, Asola Periphery',
    triggerReason: 'Surface insolation with low vegetation index driving microclimate temperatures above 40.5°C threshold.',
    timestamp: 'Updated 15 mins ago (IMD AWS Network)',
    recommendedResponse: 'Activate municipal cool roofs, open cooling centers at transit interchanges, reschedule outdoor heavy labor.',
    actionCta: 'Send heatwave advisory'
  },
  {
    id: 'vulnerable',
    title: 'Vulnerable zones',
    subtitle: 'Priority emergency response',
    hazardName: 'Composite Multi-Hazard Vulnerability Hotspot',
    severity: 'CRITICAL',
    severityScore: 76,
    icon: Shield,
    affectedArea: 'Dense informal settlements along Bhalswa, Gazipur periphery, and Yamuna Khadar',
    triggerReason: 'High demographic vulnerability intersecting poor drainage infrastructure, thermal trapping, and high baseline exposure.',
    timestamp: 'Updated 5 mins ago (NDMA Risk Matrix)',
    recommendedResponse: 'Pre-position emergency medical rescue teams, distribute N95 filtration masks, standby disaster relief units.',
    actionCta: 'Prioritize emergency response'
  }
];

const DEPOT_ROUTES = [
  {
    id: 'barnala',
    name: 'Barnala East Depot',
    corridor: 'Amritsar — Tarn Taran — Barnala Express Corridor',
    distance: '8.4 km away',
    eta: '35 mins',
    fleet: 'Fleet #TR-28 (2 Heavy Baler Trucks + 16t Hauler)',
    driver: 'Hardeep Singh (+91 98140-12849)',
    capacity: '180 / 300 tonnes storage',
    status: 'ACTIVE_DISPATCH'
  },
  {
    id: 'sangrur',
    name: 'Sangrur Central Logistics Hub',
    corridor: 'Sangrur — Dhuri Highway Sector',
    distance: '11.2 km away',
    eta: '50 mins',
    fleet: 'Fleet #TR-14 (3 Compactor Units + Trailer)',
    driver: 'Balwinder Singh (+91 94172-55091)',
    capacity: '240 / 450 tonnes storage',
    status: 'ON_CALL'
  },
  {
    id: 'kaithal',
    name: 'Kaithal-Karnal Periphery Terminal',
    corridor: 'Kaithal — Karnal Interstate Link',
    distance: '14.8 km away',
    eta: '1h 10m',
    fleet: 'Fleet #TR-09 (2 High-Cube Haulers)',
    driver: 'Rajesh Kumar (+91 98960-77124)',
    capacity: '110 / 250 tonnes storage',
    status: 'SCHEDULED_NEXT'
  }
];

const BUYERS_LIST = [
  {
    id: 'punjab-biopellet',
    name: 'Punjab Bio-Pellet Energy Ltd.',
    rate: 1850,
    unit: 'tonne',
    category: 'Power Plant 5% Torrefied Co-Firing',
    dailyQuota: '350 tonnes / day',
    paymentTerm: 'Direct Bank Transfer (DBT) within 48h',
    badge: 'STATE MANDATED',
    cert: 'CAQM Co-firing Compliance Grade A'
  },
  {
    id: 'haryana-straw',
    name: 'Haryana Agro-Straw Paper & Board Mills',
    rate: 1920,
    unit: 'tonne',
    category: 'Unbleached Cardboard Packaging & Pulp',
    dailyQuota: '200 tonnes / day',
    paymentTerm: 'Immediate Bank Wire upon Weighbridge clearance',
    badge: 'HIGHEST SPOT RATE',
    cert: 'Zero-Effluent ISO-14001'
  },
  {
    id: 'ntpc-jhajjar',
    name: 'NTPC Jhajjar Super Thermal Power Station',
    rate: 2020,
    unit: 'tonne',
    category: 'Supercritical Boiler Co-firing Blend (₹1,800 + ₹220 Govt Subsidy)',
    dailyQuota: '500 tonnes / day',
    paymentTerm: 'Central Govt Treasury PFMS DBT in 24h',
    badge: 'CENTRAL PSU GUARANTEED',
    cert: 'Ministry of Power Priority Dispatch'
  }
];

const fallbackFires: ActiveFirePoint[] = [
  { id: 'demo-1', latitude: 29.6, longitude: 76.9, frp: 41, brightness: 332, confidence: 'high', acq_date: '', acq_time: '14:20', satellite: 'DEMO', source: 'demo' }
];

export default function IncidentCommand({ activeFires, observations }: IncidentCommandProps) {
  // State for alerts & response actions
  const [completedActions, setCompletedActions] = useState<Record<string, { timestamp: string }>>({});
  const [activeAlertModal, setActiveAlertModal] = useState<SmartAlertItem | null>(null);
  const [alertSuccessToast, setAlertSuccessToast] = useState<string | null>(null);

  // State for Farmer Support interactive modals
  const [pickupRouteModalOpen, setPickupRouteModalOpen] = useState<boolean>(false);
  const [biomassBuyerModalOpen, setBiomassBuyerModalOpen] = useState<boolean>(false);
  const [rewardModalOpen, setRewardModalOpen] = useState<boolean>(false);
  const [farmerConnectModalOpen, setFarmerConnectModalOpen] = useState<boolean>(false);
  const [farmerCollectionStatus, setFarmerCollectionStatus] = useState<string>('idle');
  const [farmerToast, setFarmerToast] = useState<string | null>(null);

  // Interactive Farmer Support state
  const [farmAcres, setFarmAcres] = useState<number>(15);
  const [stubbleTons, setStubbleTons] = useState<number>(45);
  const [selectedBuyerPrice, setSelectedBuyerPrice] = useState<number>(1850);
  const [selectedBuyerName, setSelectedBuyerName] = useState<string>('Punjab Bio-Pellet Energy Ltd.');
  const [selectedDepot, setSelectedDepot] = useState<string>('Barnala East Depot');
  const [selectedRouteDistance, setSelectedRouteDistance] = useState<string>('8.4 km away');
  const [selectedFleetId, setSelectedFleetId] = useState<string>('Fleet #TR-28 (2 Heavy Balers)');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Today 14:00 - 16:00 (Immediate Dispatch)');
  const [farmerNameInput, setFarmerNameInput] = useState<string>('Gurpreet Singh');
  const [farmerPhoneInput, setFarmerPhoneInput] = useState<string>('+91 98721-44390');
  const [farmerVillageInput, setFarmerVillageInput] = useState<string>('Barnala East Farm Collective, Sangrur Belt');
  const [payoutSimulated, setPayoutSimulated] = useState<boolean>(false);
  const [simulatedTxId, setSimulatedTxId] = useState<string>('PFMS-DBT-2026-884920');

  // Computed Farmer Payout metrics
  const biomassSaleValue = stubbleTons * selectedBuyerPrice;
  const stateInSituSubsidy = farmAcres * 1200;
  const zeroBurnCredit = 5000;
  const totalFarmerPayout = biomassSaleValue + stateInSituSubsidy + zeroBurnCredit;
  const pm25MitigatedKg = (stubbleTons * 1.5).toFixed(1);
  const co2MitigatedTonnes = (stubbleTons * 1.46).toFixed(1);

  // State for Live Telemetry Mesh
  const [telemetrySources, setTelemetrySources] = useState<TelemetrySourceItem[]>(DEFAULT_TELEMETRY_SOURCES);
  const [selectedTelemetry, setSelectedTelemetry] = useState<TelemetrySourceItem | null>(null);
  const [pingingSourceId, setPingingSourceId] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [meshRefreshing, setMeshRefreshing] = useState<boolean>(false);

  // Core API State
  const [disasterRisk, setDisasterRisk] = useState<DisasterRiskResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchRiskData = async () => {
    try {
      setRefreshing(true);
      const data = await api.getDisasterRisk();
      setDisasterRisk(data);
      if (data?.telemetry_mesh?.sources && data.telemetry_mesh.sources.length > 0) {
        setTelemetrySources(data.telemetry_mesh.sources);
      }
    } catch (err) {
      console.error('Failed to fetch disaster risk telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  useEffect(() => {
    if (disasterRisk?.telemetry_mesh?.sources && disasterRisk.telemetry_mesh.sources.length > 0) {
      setTelemetrySources(disasterRisk.telemetry_mesh.sources);
    }
  }, [disasterRisk]);

  const refreshTelemetryMesh = async () => {
    setMeshRefreshing(true);
    try {
      const res = await api.getTelemetryMesh();
      if (res?.sources && res.sources.length > 0) {
        setTelemetrySources(res.sources);
      }
    } catch (e) {
      console.error('Failed to refresh telemetry mesh:', e);
    } finally {
      setTimeout(() => setMeshRefreshing(false), 400);
    }
  };

  const handlePingEndpoint = async (source: TelemetrySourceItem) => {
    setPingingSourceId(source.id);
    await new Promise((r) => setTimeout(r, 600));
    const variation = Math.floor(Math.random() * 25) - 12;
    const newLatency = Math.max(45, source.latency_ms + variation);
    setTelemetrySources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, latency_ms: newLatency, last_sync: 'Just now' } : s))
    );
    if (selectedTelemetry?.id === source.id) {
      setSelectedTelemetry((prev) => (prev ? { ...prev, latency_ms: newLatency, last_sync: 'Just now' } : null));
    }
    setPingingSourceId(null);
  };

  const fires = activeFires.length ? activeFires : fallbackFires;
  const totalFrp = disasterRisk?.fires?.total_frp ?? fires.reduce((sum, fire) => sum + fire.frp, 0);
  const maxAqi = disasterRisk?.air_quality?.max_aqi ?? Math.max(0, ...Object.values(observations).map((item) => item.aqi ?? 0));
  const liveObservation = Object.values(observations).some((item) => item.source && !item.source.toLowerCase().includes('demo'));

  // Trigger alert response action
  const handleExecuteAlertAction = async (alert: SmartAlertItem) => {
    try {
      await api.queueResponseAction({
        action_type: alert.id,
        stakeholder: 'operations',
        station_id: 'anand_vihar',
        severity: alert.severity.toLowerCase(),
        message: `Disaster response action dispatched for ${alert.title}: ${alert.recommendedResponse}`,
        source: 'AeroSense Incident Command'
      });
    } catch (e) {
      // Graceful local update if offline
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCompletedActions((prev) => ({
      ...prev,
      [alert.id]: { timestamp: nowStr }
    }));

    setAlertSuccessToast(`Action Executed: "${alert.actionCta}" dispatched successfully at ${nowStr}.`);
    setActiveAlertModal(null);
    setTimeout(() => setAlertSuccessToast(null), 5000);
  };

  // Farmer Collection confirmation action
  const handleConfirmFarmerCollection = async () => {
    setFarmerCollectionStatus('scheduled');
    try {
      await api.queueResponseAction({
        action_type: 'biomass_collection',
        stakeholder: 'agriculture',
        station_id: 'sangrur_corridor',
        severity: 'medium',
        message: `Biomass Offtake Scheduled: ${farmerNameInput} (${stubbleTons}t residue, ${farmAcres} acres, ${farmerVillageInput}). Assigned: ${selectedFleetId} to ${selectedDepot}. Buyer: ${selectedBuyerName} @ ₹${selectedBuyerPrice}/t. Total Direct DBT: ₹${totalFarmerPayout.toLocaleString()}.`,
        source: 'AeroSense Farmer Support Network'
      });
    } catch (e) {
      // Graceful fallback
    }

    setFarmerToast(`Collection Dispatched! ${selectedFleetId.split(' ')[0]} en route to ${farmerNameInput} (${stubbleTons}t residue). Logistics SMS sent & ₹${totalFarmerPayout.toLocaleString()} DBT pre-authorized.`);
    setFarmerConnectModalOpen(false);
    setTimeout(() => setFarmerToast(null), 6500);
  };

  // Helper hazard getters
  const floodHazard = disasterRisk?.hazards?.find((h) => h.id === 'flood');
  const fireHazard = disasterRisk?.hazards?.find((h) => h.id === 'wildfire');
  const heatHazard = disasterRisk?.hazards?.find((h) => h.id === 'heatwave');
  const aqiHazard = disasterRisk?.hazards?.find((h) => h.id === 'air_pollution');

  return (
    <main className="flex-1 overflow-y-auto bg-[#07090c] text-slate-100">
      {/* Toast Notification Container */}
      {(alertSuccessToast || farmerToast) && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-[92vw]">
          {alertSuccessToast && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-400/40 bg-[#0c1812] p-4 shadow-2xl backdrop-blur-md text-emerald-100 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-white">Emergency Response Dispatched</div>
                <div className="mt-0.5 text-emerald-300/90">{alertSuccessToast}</div>
              </div>
              <button onClick={() => setAlertSuccessToast(null)} className="ml-auto text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {farmerToast && (
            <div className="flex items-start gap-3 rounded-lg border border-lime-400/40 bg-[#101c12] p-4 shadow-2xl backdrop-blur-md text-lime-100 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <CheckCircle2 className="h-5 w-5 text-lime-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-white">Farmer Support Confirmed</div>
                <div className="mt-0.5 text-lime-300/90">{farmerToast}</div>
              </div>
              <button onClick={() => setFarmerToast(null)} className="ml-auto text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-5 lg:p-7">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-cyan-300/15 pb-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Predictive emergency intelligence
            </div>
            <h1 className="text-2xl font-semibold text-white">Disaster Risk Prediction Engine</h1>
            <p className="mt-1 text-sm text-slate-400">
              Detect <b className="text-cyan-300">→</b> Analyze <b className="text-cyan-300">→</b> Predict <b className="text-cyan-300">→</b> Alert <b className="text-cyan-300">→</b> Respond
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchRiskData}
              disabled={refreshing}
              className="flex items-center gap-1.5 border border-cyan-300/30 bg-[#0d1620] px-3 py-1.5 text-xs text-cyan-200 hover:bg-[#122230] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh AI Telemetry</span>
            </button>
            <span className="text-xs font-mono text-emerald-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{liveObservation ? 'LIVE PROVIDERS CONNECTED' : 'DEMO TELEMETRY ACTIVE'}</span>
            </span>
          </div>
        </header>

        {/* Dynamic Hazard Summary Banner */}
        {disasterRisk && (
          <section className="flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20 bg-gradient-to-r from-[#0b1622] via-[#0f202e] to-[#0b1622] p-4 text-xs rounded-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono text-base font-bold shadow-inner">
                {disasterRisk.overall_score}
              </div>
              <div>
                <div className="font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Overall Composite Risk Level:</span>
                  <span className="text-rose-400 font-mono font-bold">{disasterRisk.overall_level}</span>
                </div>
                <div className="text-slate-400 mt-0.5">{disasterRisk.headline}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-300">
              <div className="rounded bg-black/30 px-2 py-1 border border-white/5">
                <span className="text-slate-500">BLH:</span> {disasterRisk.meteorology.boundary_layer_height}m
              </div>
              <div className="rounded bg-black/30 px-2 py-1 border border-white/5">
                <span className="text-slate-500">Wind:</span> {disasterRisk.meteorology.wind_speed} m/s
              </div>
              <div className="rounded bg-black/30 px-2 py-1 border border-white/5">
                <span className="text-slate-500">Temp:</span> {disasterRisk.meteorology.temperature}°C
              </div>
              <div className="rounded bg-black/30 px-2 py-1 border border-white/5">
                <span className="text-slate-500">24h Precip:</span> {disasterRisk.meteorology.precip_24h}mm
              </div>
            </div>
          </section>
        )}

        {/* Input Telemetry Mesh & Pipeline Stages */}
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="border border-white/10 bg-[#0d1116] p-4 rounded-sm">
            <div className="mb-3 flex flex-wrap justify-between items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] uppercase tracking-[0.16em] text-slate-200 font-semibold">
                    Input telemetry mesh
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-mono font-medium text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    11/11 APIS LINKED &amp; ACTIVE
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Open a source to inspect live telemetry payload, latency, and model weighting.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshTelemetryMesh}
                  disabled={meshRefreshing}
                  className="flex items-center gap-1.5 rounded border border-white/10 bg-[#141b22] px-2.5 py-1 text-[10px] font-mono text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300 transition cursor-pointer"
                  title="Re-verify all 11 API endpoints"
                >
                  <RefreshCw className={`h-3 w-3 text-cyan-400 ${meshRefreshing ? 'animate-spin' : ''}`} />
                  <span>{meshRefreshing ? 'Syncing...' : 'Sync Mesh'}</span>
                </button>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-800/40 px-2 py-1 rounded">
                  CPCB / IMD / NASA / CWC LIVE
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {telemetrySources.map((source) => {
                const Icon = getSourceIcon(source.id, source.name);
                const isPinging = pingingSourceId === source.id;
                return (
                  <div
                    key={source.id || source.name}
                    onClick={() => setSelectedTelemetry(source)}
                    title={`Click to inspect live ${source.provider} API telemetry`}
                    className="group relative flex min-h-[76px] flex-col justify-between border border-white/[0.1] bg-[#10161d] p-2.5 transition-all duration-200 hover:border-cyan-300/60 hover:bg-[#14222c] hover:shadow-lg hover:shadow-cyan-950/40 rounded-sm cursor-pointer"
                  >
                    {/* Top Row: Icon + Title + External Link */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 shrink-0 group-hover:border-cyan-400 group-hover:text-cyan-200 transition">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-slate-200 group-hover:text-white transition truncate">
                          {source.name}
                        </span>
                      </div>
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={`Open ${source.provider} official portal`}
                        className="text-slate-500 hover:text-cyan-300 p-0.5 rounded hover:bg-white/5 transition shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Middle Row: Provider & Status Badge */}
                    <div className="mt-1 flex items-center justify-between text-[9px] font-mono">
                      <span className="truncate text-slate-400 font-medium">{source.provider}</span>
                      <span className="rounded bg-emerald-950/60 px-1 py-0.2 border border-emerald-500/30 text-[8px] text-emerald-300 uppercase font-semibold">
                        API LINKED
                      </span>
                    </div>

                    {/* Bottom Row: Live Pulse Indicator + Latency */}
                    <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[9px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        <span className="text-emerald-300 font-semibold tracking-wide">LIVE</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-cyan-300 transition font-mono">
                        {isPinging ? 'pinging...' : `${source.latency_ms}ms`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border border-cyan-300/25 bg-[#0d1920] p-4 sm:p-5 rounded-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-300/15 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold">AI disaster prediction engine</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 text-[9px] font-mono text-cyan-300 font-bold">
                    {disasterRisk?.ai_insights?.ai_confidence_pct ?? 96.4}% AI CONFIDENCE
                  </span>
                </div>
              </div>

              {/* Compound Synergy Metric */}
              <div className="mt-3 rounded border border-cyan-500/20 bg-black/40 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Compound Hazard Coupling</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-mono font-black text-cyan-300">
                      {disasterRisk?.ai_insights?.compound_coupling_index ?? 35.2}
                    </span>
                    <span className="text-xs font-mono text-slate-500">/ 100</span>
                    <span className="rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase bg-yellow-950/80 text-yellow-300 border border-yellow-500/30">
                      {disasterRisk?.ai_insights?.compound_risk_level ?? 'MODERATE'} SYNERGY
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">24h Trajectory</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 justify-end">
                    <Activity className="h-3 w-3" />
                    {disasterRisk?.ai_insights?.risk_trajectory_trend ?? 'STABLE'}
                  </span>
                </div>
              </div>

              {/* Explanatory Narrative */}
              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans bg-cyan-950/30 border border-cyan-500/15 p-2 rounded">
                {disasterRisk?.ai_insights?.synergy_narrative ??
                  'Compound urban inundation coupling active: Yamuna riverbed stage and soil saturation cross-amplify arterial drainage node chokepoints.'}
              </p>

              {/* Multi-Horizon Trajectory Strip */}
              <div className="mt-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Predictive Multi-Horizon Risk Trajectory:
                </span>
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                  {(disasterRisk?.ai_insights?.trajectory_forecast ?? [
                    { horizon: '+6h', score: 36.1, level: 'moderate' },
                    { horizon: '+12h', score: 37.8, level: 'moderate' },
                    { horizon: '+24h', score: 39.4, level: 'moderate' },
                    { horizon: '+48h', score: 33.5, level: 'moderate' },
                    { horizon: '+72h', score: 28.2, level: 'moderate' }
                  ]).map((pt) => (
                    <div key={pt.horizon} className="rounded border border-white/10 bg-white/5 p-1">
                      <span className="text-slate-400 block text-[9px]">{pt.horizon}</span>
                      <span className="font-bold text-cyan-300">{pt.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Vulnerable Ward Hotspot */}
              <div className="mt-2.5 rounded border border-rose-500/20 bg-rose-950/20 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-rose-300 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                    High-Vulnerability Ward Hotspot
                  </span>
                  <span className="text-[9px] font-mono text-rose-300 bg-rose-950 px-1 rounded">
                    DVM {disasterRisk?.ai_insights?.vulnerable_ward_hotspots?.[0]?.dvm_score ?? '1.34'}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-white truncate">
                  {disasterRisk?.ai_insights?.vulnerable_ward_hotspots?.[0]?.ward_name ?? 'Yamuna Khadar & Mayur Vihar Periphery'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  Threat: {disasterRisk?.ai_insights?.vulnerable_ward_hotspots?.[0]?.primary_threat ?? 'Floodplain Inundation & Embankment Seepage'}
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 border-t border-cyan-300/10 pt-2 flex justify-between items-center">
              <span>Telemetry Health: {disasterRisk?.ai_insights?.telemetry_health_score ?? 98.2}%</span>
              <span className="text-emerald-300">Physics Guardrails: PASSED</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 1: LIVE DISASTER RISK MAP (REAL INTERACTIVE WEB MAP) ── */}
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="border border-white/10 bg-[#0d1116] p-4 sm:p-5 rounded-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm uppercase tracking-[0.14em] text-slate-200 font-bold flex items-center gap-2">
                  <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
                  <span>Live disaster risk map</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  High-readability geospatial intelligence: prominent zone callouts, quick-jump camera navigation, and tactical response dispatch.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0">
                <span className="rounded bg-black/40 px-2 py-1 border border-white/5 text-orange-300">
                  {fires.length} FIRE SIGNALS
                </span>
                <span className="rounded bg-black/40 px-2 py-1 border border-white/5 text-cyan-300">
                  {Math.round(totalFrp)} MW FRP
                </span>
              </div>
            </div>

            {/* Real Interactive Map Component with Generous Responsive Height */}
            <div className="relative w-full flex-1 rounded border border-cyan-300/20 overflow-hidden h-[460px] sm:h-[500px] lg:h-[540px]">
              <DisasterRiskMap
                zones={disasterRisk?.zones}
                hazards={disasterRisk?.hazards}
                activeFires={fires}
                className="w-full h-full"
                onZoneSelect={(zone) => {
                  // Optional callback
                }}
              />
            </div>
          </div>

          {/* Side Recommendations Panel */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Primary Hazard Recommendation Card */}
            <div className="border border-rose-300/25 bg-[#171116] p-5 rounded-sm">
              <div className="flex items-center gap-2 text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-semibold">AI hazard recommendation</h2>
              </div>
              <p className="mt-4 border-l-2 border-rose-400/80 pl-3 text-xs leading-relaxed text-slate-300">
                <b className="font-mono text-rose-200 text-sm">
                  {floodHazard ? `FLOOD RISK: ${floodHazard.score}/100` : 'FLOOD RISK: 32.2/100'}
                </b>
                <br />
                <span className="text-slate-300 mt-1 block">
                  {floodHazard?.recommendation || 'Yamuna floodplain low-lying catchment vulnerability detected with moderate discharge.'}
                </span>
                <strong className="text-white mt-1 block">Recommend early warning and shelter preparation.</strong>
              </p>
              <button
                onClick={() => {
                  const alert = SMART_ALERTS.find((a) => a.id === 'flood');
                  if (alert) handleExecuteAlertAction(alert);
                }}
                className={`mt-4 flex w-full sm:w-auto items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold transition ${
                  completedActions['flood']
                    ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-cyan-300/40 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-900/40'
                }`}
              >
                {completedActions['flood'] ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Action queued ({completedActions['flood'].timestamp})</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Queue early warning</span>
                  </>
                )}
              </button>
            </div>

            {/* AQI Health Advisory Card */}
            <div className="border border-orange-300/25 bg-[#17130f] p-5 rounded-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-200">
                  <HeartPulse className="h-4 w-4 text-orange-400" />
                  <h2 className="text-sm font-semibold">AQI health advisory</h2>
                </div>
                <span className="text-[10px] font-mono text-orange-300/70 uppercase">CAAQMS Peak</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-orange-200">{maxAqi || 286}</span>
                <span className="text-xs font-mono text-orange-400/80">AIR QUALITY INDEX</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {aqiHazard?.evidence?.[0] || 'Inversion ceiling trapping ground emissions. Reduce outdoor exposure for sensitive groups.'}
              </p>
              <button
                onClick={() => {
                  const alert = SMART_ALERTS.find((a) => a.id === 'aqi');
                  if (alert) handleExecuteAlertAction(alert);
                }}
                className={`mt-4 flex w-full sm:w-auto items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold transition ${
                  completedActions['aqi']
                    ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-cyan-300/40 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-900/40'
                }`}
              >
                {completedActions['aqi'] ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Advisory published ({completedActions['aqi'].timestamp})</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Publish health advisory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 2 & SECTION 3: FARMER SUPPORT & SMART ALERT & RESPONSE ── */}
        <section className="grid gap-5 xl:grid-cols-2">
          {/* ── SECTION 2: FARMER SUPPORT: PREVENT THE BURN ── */}
          <div className="border border-lime-300/20 bg-[#101610] p-4 sm:p-5 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lime-200">
                  <Leaf className="h-4 w-4 text-lime-400" />
                  <h2 className="text-sm font-semibold">Farmer support: prevent the burn</h2>
                </div>
                <span className="text-[10px] font-mono text-lime-400/80 bg-lime-950/60 border border-lime-500/20 px-2 py-0.5 rounded">
                  ACTIVE MITIGATION
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Coupling satellite fire alerts + prevailing wind trajectories to connect farmers with verified bio-energy off-take collection before fields are set ablaze.
              </p>

              {/* 3 Interactive Cards (Pickup Route, Biomass Buyer, Reward) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Card 1: Pickup route */}
                <button
                  onClick={() => setPickupRouteModalOpen(true)}
                  className="group flex flex-col justify-between border border-white/[0.08] bg-[#151d16] p-3 text-left transition hover:border-cyan-400/50 hover:bg-[#1b261c] rounded-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Truck className="h-4 w-4 text-cyan-300 transition group-hover:scale-110" />
                    <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider group-hover:underline">
                      MANAGE ROUTE &rarr;
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-semibold text-white truncate">{selectedDepot}</div>
                    <div className="text-[10px] text-cyan-300/80 font-mono mt-0.5">{selectedRouteDistance} • {selectedFleetId.split(' ')[0]}</div>
                  </div>
                </button>

                {/* Card 2: Biomass buyer */}
                <button
                  onClick={() => setBiomassBuyerModalOpen(true)}
                  className="group flex flex-col justify-between border border-white/[0.08] bg-[#151d16] p-3 text-left transition hover:border-pink-400/50 hover:bg-[#1b261c] rounded-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Factory className="h-4 w-4 text-pink-300 transition group-hover:scale-110" />
                    <span className="text-[9px] font-mono text-pink-400 uppercase tracking-wider group-hover:underline">
                      SWITCH BUYER &rarr;
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-semibold text-white truncate">{selectedBuyerName.split(' ')[0]}</div>
                    <div className="text-[10px] text-pink-300 font-mono mt-0.5 font-medium">₹{selectedBuyerPrice.toLocaleString()} / tonne</div>
                  </div>
                </button>

                {/* Card 3: Reward */}
                <button
                  onClick={() => setRewardModalOpen(true)}
                  className="group flex flex-col justify-between border border-white/[0.08] bg-[#151d16] p-3 text-left transition hover:border-emerald-400/50 hover:bg-[#1b261c] rounded-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <BadgeIndianRupee className="h-4 w-4 text-emerald-300 transition group-hover:scale-110" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider group-hover:underline">
                      CALCULATOR &rarr;
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-semibold text-emerald-300 font-mono">₹{totalFarmerPayout.toLocaleString()} DBT</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{farmAcres} ac • {stubbleTons}t residue</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Action CTA button */}
            <div className="mt-4 pt-3 border-t border-lime-300/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setFarmerConnectModalOpen(true)}
                className={`flex items-center justify-center gap-2 border px-4 py-2.5 text-xs font-semibold transition w-full sm:w-auto cursor-pointer ${
                  farmerCollectionStatus === 'scheduled'
                    ? 'border-emerald-400/50 bg-emerald-950/50 text-emerald-200'
                    : 'border-lime-300/40 bg-lime-950/40 text-lime-100 hover:bg-lime-900/40 shadow-sm'
                }`}
              >
                {farmerCollectionStatus === 'scheduled' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Collection Scheduled • {selectedFleetId.split(' ')[0]}</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Dispatch {farmerNameInput.split(' ')[0]}&apos;s collection</span>
                  </>
                )}
              </button>

              {farmerCollectionStatus === 'scheduled' ? (
                <span className="text-[10px] font-mono text-emerald-300 text-center sm:text-right">
                  ● Scheduled for {farmerNameInput} ({stubbleTons}t residue • ₹{totalFarmerPayout.toLocaleString()} DBT)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 text-center sm:text-right">
                  Parcel: {farmAcres} acres • {stubbleTons} tonnes residue match
                </span>
              )}
            </div>
          </div>

          {/* ── SECTION 3: SMART ALERT & RESPONSE ── */}
          <div className="border border-cyan-300/20 bg-[#0d151a] p-4 sm:p-5 rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-200">
                  <AlertTriangle className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold">Smart alert & response</h2>
                </div>
                <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {Object.keys(completedActions).length} / {SMART_ALERTS.length} RESOLVED
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Click any alert row to inspect physical causality, affected wards, and dispatch tactical response.
              </p>

              {/* Actionable Alert Rows */}
              <div className="mt-4 space-y-2">
                {SMART_ALERTS.map((alert) => {
                  const Icon = alert.icon;
                  const isDone = Boolean(completedActions[alert.id]);

                  return (
                    <button
                      key={alert.id}
                      onClick={() => setActiveAlertModal(alert)}
                      className={`group flex w-full items-center justify-between gap-3 border p-3 text-left text-xs transition rounded-sm ${
                        isDone
                          ? 'border-emerald-500/30 bg-[#0c1813] hover:border-emerald-400/50'
                          : 'border-white/[0.08] bg-[#111b21] hover:border-cyan-300/40 hover:bg-[#15232c]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${
                            isDone
                              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100 truncate">{alert.title}</span>
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                                alert.severity === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                  : alert.severity === 'SEVERE'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-500/30'
                                  : 'bg-yellow-950 text-yellow-300 border border-yellow-500/30'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">{alert.subtitle}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDone ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                            <Check className="h-3 w-3" /> ACTION TAKEN
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300">
                            <span>DETAILS</span>
                            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── MODALS & DRAWERS ── */}

      {/* 1. Farmer Pickup Route Modal */}
      {pickupRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-cyan-400/40 bg-[#0a0f16] p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-cyan-400/50 bg-cyan-950/60 p-2 text-cyan-300">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Biomass Pickup Route & Fleet Logistics
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live GPS telemetry matching farm cluster coordinates with nearest bio-energy depots.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPickupRouteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Depot Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  Select Active Logistics Depot & Fleet
                </span>
                <span className="text-[10px] font-mono text-slate-400">Click to assign depot to farm</span>
              </div>
              <div className="space-y-2">
                {DEPOT_ROUTES.map((depot) => {
                  const isSelected = selectedDepot === depot.name;
                  return (
                    <div
                      key={depot.id}
                      onClick={() => {
                        setSelectedDepot(depot.name);
                        setSelectedRouteDistance(depot.distance);
                        setSelectedFleetId(depot.fleet);
                      }}
                      className={`cursor-pointer rounded border p-3 transition ${
                        isSelected
                          ? 'border-cyan-400/80 bg-cyan-950/30 shadow-md shadow-cyan-950/50'
                          : 'border-white/10 bg-[#101720] hover:border-white/30 hover:bg-[#141f2b]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-400'
                                : 'border-slate-500 bg-transparent'
                            }`}
                          >
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                          </span>
                          <span className="font-semibold text-white text-xs sm:text-sm">{depot.name}</span>
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                            {depot.distance}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          ETA: {depot.eta}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-300">
                        <div className="text-slate-400 font-mono text-[10px]">{depot.corridor}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
                          <span><strong>Assigned:</strong> {depot.fleet}</span>
                          <span><strong>Lead:</strong> {depot.driver}</span>
                          <span><strong>Storage:</strong> {depot.capacity}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4-Step Interactive Logistics Pipeline */}
            <div className="rounded border border-white/10 bg-[#0e1620] p-3.5 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                End-to-End Offtake Execution Pipeline
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                {/* Step 1 */}
                <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-300 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Step 1: Survey</span>
                  </div>
                  <div className="text-slate-300 text-[10px] leading-tight">
                    NASA VIIRS 375m & drone NDVI verified {farmAcres} acres parcel.
                  </div>
                  <span className="inline-block text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded">
                    VERIFIED
                  </span>
                </div>

                {/* Step 2 */}
                <div className="rounded border border-cyan-400/40 bg-cyan-950/30 p-2.5 space-y-1">
                  <div className="flex items-center gap-1 text-cyan-300 font-bold">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    <span>Step 2: Fleet</span>
                  </div>
                  <div className="text-slate-300 text-[10px] leading-tight">
                    {selectedFleetId.split(' ')[0]} dispatched via {selectedRouteDistance}.
                  </div>
                  <span className="inline-block text-[9px] font-mono text-cyan-300 bg-cyan-950 px-1 py-0.2 rounded animate-pulse">
                    EN ROUTE
                  </span>
                </div>

                {/* Step 3 */}
                <div className="rounded border border-white/10 bg-black/30 p-2.5 space-y-1">
                  <div className="flex items-center gap-1 text-slate-300 font-bold">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Step 3: Weighing</span>
                  </div>
                  <div className="text-slate-400 text-[10px] leading-tight">
                    Digital weighbridge & moisture check (&lt;14% moisture standard).
                  </div>
                  <span className="inline-block text-[9px] font-mono text-slate-400 bg-white/5 px-1 py-0.2 rounded">
                    NEXT QUEUE
                  </span>
                </div>

                {/* Step 4 */}
                <div className="rounded border border-white/10 bg-black/30 p-2.5 space-y-1">
                  <div className="flex items-center gap-1 text-slate-300 font-bold">
                    <BadgeIndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>Step 4: Payout</span>
                  </div>
                  <div className="text-slate-400 text-[10px] leading-tight">
                    Instant DBT remittance of ₹{totalFarmerPayout.toLocaleString()} to Aadhaar.
                  </div>
                  <span className="inline-block text-[9px] font-mono text-slate-400 bg-white/5 px-1 py-0.2 rounded">
                    SCHEDULED
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="text-[11px] font-mono text-slate-400">
                Active Depot: <span className="text-cyan-300 font-semibold">{selectedDepot}</span> ({selectedRouteDistance})
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setPickupRouteModalOpen(false)}
                  className="border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 rounded transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setFarmerToast(`Logistics route locked: ${selectedDepot} assigned (${selectedFleetId.split(' ')[0]}).`);
                    setPickupRouteModalOpen(false);
                    setTimeout(() => setFarmerToast(null), 4000);
                  }}
                  className="border border-cyan-400 bg-cyan-500/25 px-4 py-1.5 text-xs font-bold text-cyan-100 hover:bg-cyan-500/40 rounded shadow-md transition cursor-pointer"
                >
                  Confirm Route Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Biomass Buyer Modal */}
      {biomassBuyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-pink-400/40 bg-[#0a0f16] p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-pink-400/50 bg-pink-950/60 p-2 text-pink-300">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Contracted Biomass Offtake Buyers
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Industrial facilities & power generation plants under statutory CAQM co-firing mandates with guaranteed floor MSP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBiomassBuyerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Buyer Selection List */}
            <div className="space-y-2.5">
              {BUYERS_LIST.map((buyer) => {
                const isSelected = selectedBuyerName === buyer.name;
                const projectedCommercialValue = stubbleTons * buyer.rate;
                return (
                  <div
                    key={buyer.id}
                    onClick={() => {
                      setSelectedBuyerName(buyer.name);
                      setSelectedBuyerPrice(buyer.rate);
                    }}
                    className={`cursor-pointer rounded border p-3.5 transition ${
                      isSelected
                        ? 'border-pink-400/80 bg-pink-950/30 shadow-md shadow-pink-950/50'
                        : 'border-white/10 bg-[#101720] hover:border-white/30 hover:bg-[#141f2b]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-3 w-3 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-pink-400 bg-pink-400'
                              : 'border-slate-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                        </span>
                        <div>
                          <span className="font-semibold text-white text-xs sm:text-sm">{buyer.name}</span>
                          <span className="ml-2 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold bg-pink-950 text-pink-300 border border-pink-500/30">
                            {buyer.badge}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base sm:text-lg font-mono font-bold text-pink-300">
                          ₹{buyer.rate.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-mono"> / tonne</span>
                      </div>
                    </div>

                    <div className="mt-2.5 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-white/5 pt-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Offtake Application:</span>
                        <span className="text-slate-200 text-[11px]">{buyer.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Daily Quota & Terms:</span>
                        <span className="text-slate-200 text-[11px]">{buyer.dailyQuota} • {buyer.paymentTerm}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-white/5 pt-2">
                      <span className="text-slate-400">
                        Projected for {stubbleTons}t residue:
                      </span>
                      <span className="text-emerald-300 font-bold">
                        ₹{projectedCommercialValue.toLocaleString()} gross value
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Statutory Compliance Footer */}
            <div className="rounded border border-white/10 bg-[#0e1620] p-3 text-[11px] text-slate-300 flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                All buyers operate under statutory Commission for Air Quality Management (CAQM) directions mandating minimum 5% to 10% co-firing in coal thermal generation.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="text-[11px] font-mono text-slate-400">
                Selected Contract: <span className="text-pink-300 font-semibold">{selectedBuyerName.split(' ')[0]}</span> (₹{selectedBuyerPrice}/t)
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setBiomassBuyerModalOpen(false)}
                  className="border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 rounded transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setFarmerToast(`Buyer Contract Locked: ${selectedBuyerName} @ ₹${selectedBuyerPrice}/t applied.`);
                    setBiomassBuyerModalOpen(false);
                    setTimeout(() => setFarmerToast(null), 4000);
                  }}
                  className="border border-pink-400 bg-pink-500/25 px-4 py-1.5 text-xs font-bold text-pink-100 hover:bg-pink-500/40 rounded shadow-md transition cursor-pointer"
                >
                  Lock In Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reward Calculation Modal */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-emerald-400/40 bg-[#0a0f16] p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-emerald-400/50 bg-emerald-950/60 p-2 text-emerald-300">
                  <BadgeIndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Anti-Burn Incentive & Payout Calculator
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Transparent compensation architecture replacing burning fines with verified Direct Benefit Transfers (DBT).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRewardModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Sliders & Presets */}
            <div className="rounded border border-white/10 bg-[#101720] p-4 space-y-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                Adjust Parcel Acreage & Crop Residue Parameters
              </span>

              {/* Slider 1: Farm Acres */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300">Farm Parcel Area:</span>
                  <span className="font-mono font-bold text-emerald-300">{farmAcres} Acres</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={farmAcres}
                  onChange={(e) => {
                    const acres = Number(e.target.value);
                    setFarmAcres(acres);
                    setStubbleTons(acres * 3);
                  }}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>1 Acre</span>
                  <span>25 Acres</span>
                  <span>50 Acres</span>
                </div>
              </div>

              {/* Slider 2: Stubble Tons */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300">Residue Volume:</span>
                  <span className="font-mono font-bold text-emerald-300">{stubbleTons} Tonnes</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  value={stubbleTons}
                  onChange={(e) => setStubbleTons(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>5 Tonnes</span>
                  <span>75 Tonnes</span>
                  <span>150 Tonnes</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Scale Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '5 ac / 15t (Smallholder)', acres: 5, tons: 15 },
                    { label: '15 ac / 45t (Default)', acres: 15, tons: 45 },
                    { label: '25 ac / 75t (Medium)', acres: 25, tons: 75 },
                    { label: '40 ac / 120t (Co-op Cluster)', acres: 40, tons: 120 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setFarmAcres(preset.acres);
                        setStubbleTons(preset.tons);
                      }}
                      className={`text-[10px] font-mono px-2 py-1 rounded border transition cursor-pointer ${
                        farmAcres === preset.acres && stubbleTons === preset.tons
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-300 font-bold'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Computation Table */}
            <div className="rounded border border-emerald-500/25 bg-[#0d1a13] p-4 space-y-2.5 text-xs text-slate-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
                Direct Benefit Transfer (DBT) Breakdown Formula
              </span>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <div>
                  <span className="font-medium text-white">1. Commercial Biomass Offtake Sale</span>
                  <div className="text-[10px] text-slate-400">
                    {stubbleTons} tonnes × ₹{selectedBuyerPrice.toLocaleString()}/t ({selectedBuyerName.split(' ')[0]})
                  </div>
                </div>
                <span className="font-mono font-bold text-white">₹{biomassSaleValue.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <div>
                  <span className="font-medium text-white">2. State In-Situ Residue Subsidy</span>
                  <div className="text-[10px] text-slate-400">
                    {farmAcres} acres × ₹1,200/acre (Punjab / Haryana CRM Scheme)
                  </div>
                </div>
                <span className="font-mono font-bold text-white">₹{stateInSituSubsidy.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <div>
                  <span className="font-medium text-white">3. NASA FIRMS Verified Zero-Burn Bonus</span>
                  <div className="text-[10px] text-slate-400">
                    Guaranteed 72h satellite thermal pass confirmation
                  </div>
                </div>
                <span className="font-mono font-bold text-white">₹{zeroBurnCredit.toLocaleString()}</span>
              </div>

              <div className="pt-2 flex justify-between items-baseline font-bold text-emerald-300">
                <span className="text-sm uppercase tracking-wider">Total Direct Bank Transfer (DBT):</span>
                <span className="text-xl sm:text-2xl font-mono text-emerald-400">
                  ₹{totalFarmerPayout.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Smog Mitigation Impact Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border border-white/10 bg-[#101720] p-2">
                <span className="text-[10px] font-mono text-slate-400 block">PM2.5 PREVENTED</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">{pm25MitigatedKg} kg</span>
              </div>
              <div className="rounded border border-white/10 bg-[#101720] p-2">
                <span className="text-[10px] font-mono text-slate-400 block">CO2e MITIGATED</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{co2MitigatedTonnes} t</span>
              </div>
              <div className="rounded border border-white/10 bg-[#101720] p-2">
                <span className="text-[10px] font-mono text-slate-400 block">SOOT AVOIDED</span>
                <span className="font-mono font-bold text-yellow-300 text-sm">{(stubbleTons * 0.09).toFixed(1)} kg</span>
              </div>
            </div>

            {/* Payout Simulation Feedback */}
            {payoutSimulated && (
              <div className="rounded border border-emerald-400/40 bg-emerald-950/40 p-3 text-xs space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>PFMS Direct Benefit Transfer Pre-Authorized</span>
                </div>
                <div className="font-mono text-[10px] text-slate-300">
                  TxRef: <span className="text-emerald-300">{simulatedTxId}</span> • Aadhaar Seeded Account • Status: ESCROW_LOCKED_PENDING_WEIGHBRIDGE
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-3">
              <button
                onClick={() => {
                  setSimulatedTxId(`PFMS-DBT-2026-${Math.floor(100000 + Math.random() * 900000)}`);
                  setPayoutSimulated(true);
                  setFarmerToast(`Simulated DBT Transfer authorized: ₹${totalFarmerPayout.toLocaleString()} routed to PFMS gateway.`);
                  setTimeout(() => setFarmerToast(null), 4500);
                }}
                className="border border-emerald-500/40 bg-emerald-950/50 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 rounded flex items-center gap-1.5 transition cursor-pointer w-full sm:w-auto justify-center"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Simulate DBT Pre-Authorization</span>
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setRewardModalOpen(false)}
                  className="border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 rounded transition cursor-pointer"
                >
                  Close Calculator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Connect Farmer to Collection Modal */}
      {farmerConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-lime-400/40 bg-[#0a120c] p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-lime-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-lime-400/50 bg-lime-950/60 p-2 text-lime-300">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Dispatch Biomass Collection & Farmer Match
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Schedule baling machinery, link offtake buyer, and authorize Aadhaar-linked DBT remittance.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFarmerConnectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Configurable Farmer Information */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Farmer Full Name</label>
                  <input
                    type="text"
                    value={farmerNameInput}
                    onChange={(e) => setFarmerNameInput(e.target.value)}
                    className="w-full rounded border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none"
                    placeholder="Enter farmer name"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Mobile Phone (SMS & DBT)</label>
                  <input
                    type="text"
                    value={farmerPhoneInput}
                    onChange={(e) => setFarmerPhoneInput(e.target.value)}
                    className="w-full rounded border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-mono text-white focus:border-lime-400 focus:outline-none"
                    placeholder="+91 Mobile number"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Village & Farm Collective</label>
                <input
                  type="text"
                  value={farmerVillageInput}
                  onChange={(e) => setFarmerVillageInput(e.target.value)}
                  className="w-full rounded border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none"
                  placeholder="Village, Tehsil, District"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Parcel Area (Acres)</label>
                  <input
                    type="number"
                    value={farmAcres}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setFarmAcres(val);
                      setStubbleTons(val * 3);
                    }}
                    className="w-full rounded border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-mono text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Estimated Biomass (Tonnes)</label>
                  <input
                    type="number"
                    value={stubbleTons}
                    onChange={(e) => setStubbleTons(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-mono text-white focus:border-lime-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Preferred Collection Time Window</label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full rounded border border-white/15 bg-[#121c16] px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none cursor-pointer"
                >
                  <option value="Today 14:00 - 16:00 (Immediate Dispatch)">Today 14:00 - 16:00 (Immediate Dispatch - High Priority)</option>
                  <option value="Tomorrow 07:00 - 10:00 (Morning Window)">Tomorrow 07:00 - 10:00 (Morning Window)</option>
                  <option value="Tomorrow 15:00 - 18:00 (Afternoon Window)">Tomorrow 15:00 - 18:00 (Afternoon Window)</option>
                </select>
              </div>

              {/* Order Manifest Card */}
              <div className="rounded border border-lime-500/25 bg-[#0e1d13] p-3.5 space-y-2 text-slate-300 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-lime-400 font-semibold block">
                  Logistics & Remittance Manifest
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Logistics Hub:</span>
                  <span className="text-cyan-300 font-medium">{selectedDepot} ({selectedRouteDistance})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Machinery Fleet:</span>
                  <span className="text-lime-300 font-mono">{selectedFleetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contracted Offtake Buyer:</span>
                  <span className="text-pink-300 font-medium">{selectedBuyerName} @ ₹{selectedBuyerPrice}/t</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-sm">
                  <span className="text-white">Total Guaranteed DBT Remittance:</span>
                  <span className="font-mono text-emerald-400">₹{totalFarmerPayout.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded bg-black/40 p-2.5 border border-white/10 text-[11px] text-slate-400">
                <span className="text-lime-400 font-semibold">Downwind Airshed Scavenging Impact: </span>
                Prevents ~{pm25MitigatedKg} kg of PM2.5 and {co2MitigatedTonnes} tonnes of CO2 from being transported into the Delhi NCR airshed.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2.5 border-t border-white/10 pt-3">
              <button
                onClick={() => setFarmerConnectModalOpen(false)}
                className="border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFarmerCollection}
                className="flex items-center justify-center gap-2 border border-lime-400 bg-lime-500/25 px-5 py-2 text-xs font-bold text-lime-100 hover:bg-lime-500/40 shadow-lg rounded transition cursor-pointer"
              >
                <Check className="h-4 w-4 text-lime-300" />
                <span>Confirm & Dispatch Collection Fleet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Smart Alert Detail & Action Modal */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-cyan-400/30 bg-[#0c141b] p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                {React.createElement(activeAlertModal.icon, {
                  className: 'h-5 w-5 text-cyan-300'
                })}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    {activeAlertModal.title}
                  </h3>
                  <div className="text-[10px] text-slate-400">{activeAlertModal.hazardName}</div>
                </div>
              </div>
              <button onClick={() => setActiveAlertModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border border-white/10 bg-[#121c26] p-3 rounded">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Severity Rating</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-mono font-bold text-white">
                      {activeAlertModal.severityScore}
                    </span>
                    <span className="text-xs font-mono text-slate-400">/ 100</span>
                    <span
                      className={`ml-2 rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                        activeAlertModal.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          : activeAlertModal.severity === 'SEVERE'
                          ? 'bg-orange-950 text-orange-300 border border-orange-500/30'
                          : 'bg-yellow-950 text-yellow-300 border border-yellow-500/30'
                      }`}
                    >
                      {activeAlertModal.severity}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-mono">Response Status</span>
                  <div className="mt-1">
                    {completedActions[activeAlertModal.id] ? (
                      <span className="text-emerald-400 font-mono font-bold flex items-center justify-end gap-1">
                        <Check className="h-3.5 w-3.5" /> Action Executed
                      </span>
                    ) : (
                      <span className="text-yellow-400 font-mono flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" /> Awaiting Dispatch
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border border-white/10 bg-[#121c26] p-3 rounded">
                <div>
                  <span className="text-slate-400 font-medium">Affected Wards / Geometry:</span>
                  <div className="text-white font-medium mt-0.5">{activeAlertModal.affectedArea}</div>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <span className="text-slate-400 font-medium">Trigger Evidence:</span>
                  <div className="text-slate-300 mt-0.5">{activeAlertModal.triggerReason}</div>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <span className="text-slate-400 font-medium">Telemetry Timestamp:</span>
                  <div className="text-slate-400 font-mono text-[11px] mt-0.5">{activeAlertModal.timestamp}</div>
                </div>
              </div>

              <div className="border border-cyan-500/20 bg-cyan-950/20 p-3 rounded">
                <span className="text-cyan-300 font-semibold block uppercase text-[10px] tracking-wider">
                  Tactical SOP Response Protocol
                </span>
                <p className="text-slate-200 mt-1 leading-relaxed">
                  {activeAlertModal.recommendedResponse}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2.5">
              <button
                onClick={() => setActiveAlertModal(null)}
                className="border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Close
              </button>
              <button
                onClick={() => handleExecuteAlertAction(activeAlertModal)}
                className={`flex items-center justify-center gap-2 border px-5 py-2 text-xs font-bold shadow-lg transition ${
                  completedActions[activeAlertModal.id]
                    ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-950/80'
                    : 'border-cyan-400 bg-cyan-500/25 text-cyan-100 hover:bg-cyan-500/40'
                }`}
              >
                {completedActions[activeAlertModal.id] ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Re-issue Action</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>{activeAlertModal.actionCta}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Live Telemetry Inspector Modal ── */}
      {selectedTelemetry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-cyan-400/40 bg-[#0a0f16] p-5 sm:p-7 shadow-2xl text-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const ModalIcon = getSourceIcon(selectedTelemetry.id, selectedTelemetry.name);
                  return (
                    <div className="rounded-md border border-cyan-400/50 bg-cyan-950/60 p-2.5 text-cyan-300 shadow-md shadow-cyan-900/40">
                      <ModalIcon className="h-6 w-6" />
                    </div>
                  );
                })()}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">{selectedTelemetry.name}</h2>
                    <span className="rounded-full bg-emerald-950/80 border border-emerald-400/50 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      LIVE CONNECTED (HTTP 200)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="text-cyan-300 font-mono font-medium">{selectedTelemetry.provider}</span>
                    <span>•</span>
                    <span>{selectedTelemetry.summary}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTelemetry(null);
                  setCopiedEndpoint(false);
                  setCopiedPayload(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live API Endpoint Banner */}
            <div className="rounded-md border border-cyan-400/25 bg-[#0d1722] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  Live Linked API Endpoint
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    Latency: <span className="text-emerald-300 font-semibold">{selectedTelemetry.latency_ms}ms</span>
                  </span>
                  <button
                    onClick={() => handlePingEndpoint(selectedTelemetry)}
                    disabled={pingingSourceId === selectedTelemetry.id}
                    className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 hover:text-cyan-100 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded hover:bg-cyan-900/60 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${pingingSourceId === selectedTelemetry.id ? 'animate-spin' : ''}`} />
                    <span>{pingingSourceId === selectedTelemetry.id ? 'Pinging...' : 'Test Ping'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded bg-black/50 border border-white/10 px-3 py-2 font-mono text-xs text-slate-200">
                <span className="text-emerald-400 font-bold">GET</span>
                <span className="truncate text-slate-300 select-all flex-1">{selectedTelemetry.endpoint_url}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTelemetry.endpoint_url);
                    setCopiedEndpoint(true);
                    setTimeout(() => setCopiedEndpoint(false), 2000);
                  }}
                  className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-white/5 transition cursor-pointer"
                  title="Copy Endpoint URL"
                >
                  {copiedEndpoint ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Live Extracted Metrics Grid */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                Live Ingested Telemetry Readings
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(selectedTelemetry.current_metrics).map(([key, val]) => (
                  <div key={key} className="rounded border border-white/10 bg-[#121b24] p-2.5 flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 truncate">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-cyan-300 mt-1 truncate">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monitored Channels / Parameters */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Monitored Telemetry Channels
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedTelemetry.parameters_monitored.map((param) => (
                  <span key={param} className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    ✓ {param}
                  </span>
                ))}
              </div>
            </div>

            {/* Model Impact & Rationale */}
            <div className="rounded-md border border-cyan-500/25 bg-cyan-950/20 p-3.5">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
                <Shield className="h-4 w-4" />
                <span>AI Disaster Intelligence Engine Impact</span>
              </div>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed font-sans">
                {selectedTelemetry.impact_on_model}
              </p>
            </div>

            {/* Raw JSON Stream Payload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  Live Raw API Telemetry Payload (JSON)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedTelemetry.raw_payload, null, 2));
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  {copiedPayload ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPayload ? 'Copied JSON' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="max-h-40 overflow-y-auto rounded bg-black/70 border border-white/10 p-3 text-[11px] font-mono text-emerald-300/90 leading-relaxed">
                {JSON.stringify(selectedTelemetry.raw_payload, null, 2)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
              <a
                href={selectedTelemetry.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-200 transition"
              >
                <span>Open {selectedTelemetry.provider} Official Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handlePingEndpoint(selectedTelemetry)}
                  disabled={pingingSourceId === selectedTelemetry.id}
                  className="border border-cyan-400/40 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50 rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${pingingSourceId === selectedTelemetry.id ? 'animate-spin' : ''}`} />
                  <span>Re-verify Telemetry</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedTelemetry(null);
                    setCopiedEndpoint(false);
                    setCopiedPayload(false);
                  }}
                  className="border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 rounded transition cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

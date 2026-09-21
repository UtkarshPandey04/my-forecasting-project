export interface Station {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  operating_agency: string;
  zone_type: string;
  is_active: boolean;
}

export interface PollutantData {
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  nh3: number | null;
}

export interface MeteoData {
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
}

export interface Observation {
  station_id: string;
  station_name: string;
  timestamp: string;
  pollutants: PollutantData;
  meteorology: MeteoData;
  aqi: number | null;
  aqi_category: string | null;
  aqi_color: string | null;
  prominent_pollutant: string | null;
  source: string;
  mode: string;
  epa_aqi?: number | null;
  epa_category?: string | null;
  epa_color?: string | null;
}


export interface ForecastPoint {
  hour_offset: number;
  timestamp: string;
  pm25_predicted: number;
  aqi_predicted: number | null;
  aqi_category: string | null;
}

export interface ForecastResponse {
  station_id: string;
  station_name: string;
  created_at: string;
  model_version: string;
  mode: string;
  horizon_hours: number;
  points: ForecastPoint[];
}

export interface ProviderStatus {
  name: string;
  status: 'connected' | 'error' | 'not_configured';
  last_check: string | null;
  message: string | null;
}

export interface HealthResponse {
  status: string;
  mode: string;
  version: string;
  uptime_seconds: number;
  providers: ProviderStatus[];
}

export interface DataFreshness {
  mode: string;
  last_observation_time: string | null;
  last_forecast_time: string | null;
  observation_count: number;
  station_count: number;
}

// ── Phase 2 Atmospheric Intelligence Types ──

export interface AtmosphericRegime {
  regime: string;
  confidence: number;
  explanation: string;
  severity_level: 'low' | 'moderate' | 'high' | 'severe';
  timestamp: string;
  mode: string;
}

export interface DerivedIndices {
  ventilation_index: number;
  ventilation_category: string;
  stagnation_index: number;
  inversion_risk_score: number;
  wind_transport_indicator: number;
  timestamp: string;
  mode: string;
}

export interface ActiveFirePoint {
  id: string;
  latitude: number;
  longitude: number;
  frp: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  source: string;
}

export interface ActiveFiresResponse {
  fires: ActiveFirePoint[];
  count: number;
  total_frp: number;
  mode: string;
  last_updated: string;
}

export interface TransportCorridor {
  id: string;
  origin_cluster: string;
  destination: string;
  bearing_degrees: number;
  wind_speed_kmh: number;
  estimated_transit_hours: number;
  transport_risk: 'low' | 'moderate' | 'elevated' | 'severe';
  coordinates: [number, number][];
}

export interface TransportResponse {
  corridors: TransportCorridor[];
  dominant_wind_direction: number;
  wind_speed_ms: number;
  disclaimer: string;
  mode: string;
}

export interface DriverAttribution {
  factor: string;
  impact: 'trapping' | 'clearing' | 'advection' | 'emission';
  contribution_pct: number;
  description: string;
}

export interface ForecastExplanation {
  station_id: string;
  station_name: string;
  summary: string;
  regime: string;
  primary_driver: string;
  secondary_driver: string;
  dispersion_rating: string;
  drivers: DriverAttribution[];
  mode: string;
}

// ── Phase 3 Model Evaluation & Benchmark Types ──

export interface MetricValues {
  mae: number;
  rmse: number;
  r2: number;
  mape: number;
}

export interface HorizonMetric {
  horizon_hours: number;
  mae: number;
  rmse: number;
  r2: number;
  mape?: number;
}

export interface PeakEventMetric {
  threshold_pm25: number;
  true_events: number;
  detected_events: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface ModelEvaluationSummary {
  model_id: string;
  model_name: string;
  architecture: string;
  version: string;
  parameters: string;
  metrics_overall: MetricValues;
  metrics_by_target: Record<string, MetricValues>;
  horizon_metrics: HorizonMetric[];
  peak_event_detection: PeakEventMetric;
}

export interface DatasetSplitInfo {
  total_hours: number;
  start_time: string;
  end_time: string;
  train_ratio: number;
  val_ratio: number;
  test_ratio: number;
  split_type: string;
  lookahead_bias: string;
}

export interface EvaluationBenchmarkResponse {
  experiment_id: string;
  experiment_name: string;
  created_at: string;
  selected_model_id: string;
  dataset_split: DatasetSplitInfo;
  horizons_evaluated: number[];
  targets_evaluated: string[];
  models: ModelEvaluationSummary[];
}

export interface SelectModelResponse {
  success: boolean;
  selected_model_id: string;
  model_name: string;
  message: string;
  timestamp: string;
}

// ── Phase 4 What-If Scenarios & WRF-Chem Types ──

export interface ScenarioPoint {
  hour_offset: number;
  timestamp: string;
  baseline_pm25: number;
  scenario_pm25: number;
  delta_pm25: number;
  uncertainty_lower: number;
  uncertainty_upper: number;
  baseline_aqi: number | null;
  scenario_aqi: number | null;
  scenario_aqi_category: string | null;
  scenario_aqi_color: string | null;
}

export interface ScenarioSummaryDelta {
  mean_baseline_pm25: number;
  mean_scenario_pm25: number;
  net_change_pm25: number;
  net_change_pct: number;
  air_quality_impact: string;
}

export interface ScenarioExplanation {
  headline: string;
  primary_mechanisms: string[];
  physical_rationale: string;
}

export interface ScenarioResponse {
  scenario_name: string;
  station_id: string;
  station_name: string;
  parameters: {
    wind_speed_delta_pct: number;
    rainfall_mm: number;
    fire_activity_delta_pct: number;
  };
  summary_delta: ScenarioSummaryDelta;
  explanation: ScenarioExplanation;
  assumptions: string[];
  disclaimer: string;
  points: ScenarioPoint[];
  live_context?: {
    source?: string;
    mode?: string;
    timestamp?: string;
    aqi?: number | null;
    pm25?: number | null;
    temperature?: number | null;
    humidity?: number | null;
    wind_speed?: number | null;
    wind_direction?: number | null;
  };
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  wind_speed_delta_pct: number;
  rainfall_mm: number;
  fire_activity_delta_pct: number;
}

export interface BlendedPoint {
  hour_offset: number;
  timestamp: string;
  physics_pm25: number;
  ai_residual_pm25: number;
  blended_pm25: number;
  uncertainty_lower_pm25: number;
  uncertainty_upper_pm25: number;
  physics_o3: number;
  physics_no2: number;
  temperature: number;
  wind_speed: number;
  pblh: number;
  aqi: number | null;
  aqi_category: string | null;
  aqi_color: string | null;
}

export interface ForecastProvenance {
  forecast_type: string;
  physics_provider: string;
  physics_model: string;
  chemistry_mechanism: string;
  source_file: string;
  ai_residual_corrector: string;
  blending_formulation: string;
  blending_weights: {
    physics_weight: number;
    ai_residual_weight: number;
  };
  mean_bias_correction_pm25: number;
  generated_at: string;
}

export interface BlendedForecastResponse {
  station_id: string;
  station_name: string;
  horizon_hours: number;
  provenance: ForecastProvenance;
  points: BlendedPoint[];
}

export interface WRFChemStatus {
  netcdf_support: boolean;
  directory: string;
  available_files: string[];
  default_file: string;
  status: string;
}

export interface DisasterHazard {
  id: string;
  name: string;
  score: number;
  level: 'low' | 'moderate' | 'high' | 'very_high';
  evidence: string[];
  recommendation: string;
  action_id: string;
}

export interface DisasterZone {
  id: string;
  name: string;
  hazard: string;
  score: number;
  level: string;
  x_pct: number;
  y_pct: number;
}

export interface DisasterFirePoint {
  id: string;
  latitude: number;
  longitude: number;
  frp: number;
  confidence: string;
}

export interface DisasterRiskResponse {
  generated_at: string;
  mode: string;
  overall_score: number;
  overall_level: string;
  primary_hazard: string;
  headline: string;
  meteorology: {
    temperature: number | null;
    humidity: number | null;
    wind_speed: number | null;
    wind_direction: number | null;
    precipitation: number | null;
    precip_24h: number | null;
    boundary_layer_height: number | null;
  };
  air_quality: {
    max_aqi: number | null;
    pm25: number | null;
    station_id: string | null;
    station_name: string | null;
  };
  fires: { count: number; total_frp: number; points?: DisasterFirePoint[] };
  hazards: DisasterHazard[];
  zones: DisasterZone[];
  outlook: { hour_offset: number; flood: number; heat: number | null; label: string }[];
  telemetry_mesh?: TelemetryMeshResponse;
  ai_insights?: DisasterAIInsight;
}

export interface VulnerableWardItem {
  ward_name: string;
  vulnerability_rank: number;
  dvm_score: number;
  primary_threat: string;
  affected_est: string;
  evacuation_priority: string;
}

export interface DisasterAIInsight {
  compound_coupling_index: number;
  compound_risk_level: string;
  synergy_narrative: string;
  ai_confidence_pct: number;
  telemetry_health_score: number;
  risk_trajectory_trend: 'ESCALATING' | 'STABLE' | 'DE-ESCALATING';
  trajectory_forecast: { horizon: string; score: number; level: string }[];
  vulnerable_ward_hotspots: VulnerableWardItem[];
}

export interface TelemetrySourceItem {
  id: string;
  name: string;
  provider: string;
  href: string;
  endpoint_url: string;
  live: boolean;
  status: string;
  latency_ms: number;
  last_sync: string;
  parameters_monitored: string[];
  current_metrics: Record<string, string | number>;
  summary: string;
  impact_on_model: string;
  raw_payload: Record<string, any>;
}

export interface TelemetryMeshResponse {
  generated_at: string;
  total_sources: number;
  live_sources_count: number;
  sources: TelemetrySourceItem[];
}

// ── AeroSense Intelligence & LLM Reasoning Types ──

export interface AtmosphericQueryRequest {
  query: string;
  station_id?: string;
  horizon_hours?: number;
}

export interface AtmosphericQueryResponse {
  query: string;
  assessment: string;
  forecast_trajectory: string;
  confidence: number; // 0.0 - 1.0
  confidence_level: 'HIGH' | 'MODERATE' | 'CAUTIONARY';
  confidence_drivers: string[];
  primary_driver: string;
  secondary_driver?: string | null;
  ventilation_status: string;
  ventilation_index: number;
  regime: string;
  inversion_risk: number;
  evidence_sources: string[];
  model_name: string;
  suggested_actions: string[];
  predicted_pm25?: number | null;
  predicted_aqi?: number | null;
  predicted_category?: string | null;
  station_id?: string | null;
  station_name?: string | null;
  timestamp: string;
}

// ── AeroSense Circular & Incident Lifecycle Types ──

export type WasteCategory =
  | 'agricultural_residue'
  | 'organic_waste'
  | 'construction_waste'
  | 'used_cooking_oil'
  | 'e_waste'
  | 'industrial_waste';

export type ConversionPathway =
  | 'cbg_biogas'
  | 'biochar'
  | 'biomass_fuel'
  | 'packaging_material'
  | 'paper_pulp'
  | 'mushroom_substrate';

export type TransportStatus =
  | 'LISTED'
  | 'MATCHED'
  | 'PICKUP_SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'PROCESSED';

export interface ResidueListing {
  id: string;
  farmer_name: string;
  farmer_id?: string;
  location: string;
  district: string;
  state: string;
  crop_type: string;
  residue_type: string;
  quantity_tons: number;
  harvest_date: string;
  availability_date: string;
  moisture_pct?: number;
  preferred_collection_date?: string;
  expected_price_per_ton: number;
  category: WasteCategory;
  recommended_pathways: ConversionPathway[];
  created_at: string;
  status: TransportStatus;
  active_matches_count: number;
  is_demo?: boolean;
}

export interface BuyerRequirement {
  id: string;
  company_name: string;
  buyer_id?: string;
  buyer_type: string;
  location: string;
  required_material: string;
  required_quantity_tons: number;
  max_distance_km: number;
  min_price_per_ton: number;
  max_price_per_ton: number;
  pickup_available: boolean;
  required_moisture_max_pct: number;
  availability_period: string;
  conversion_pathway: ConversionPathway;
  created_at: string;
  status: string;
  fulfilled_tons: number;
  is_demo?: boolean;
}

export interface MarketplaceMatch {
  id: string;
  listing_id: string;
  requirement_id: string;
  farmer_name: string;
  farmer_location: string;
  buyer_name: string;
  buyer_location: string;
  material: string;
  matched_quantity_tons: number;
  distance_km: number;
  compatibility_score: number;
  estimated_transport_cost_inr: number;
  estimated_farmer_revenue_inr: number;
  estimated_processor_value_inr: number;
  platform_fee_inr: number;
  avoided_burning_tons: number;
  estimated_pm25_avoided_kg: number;
  estimated_co2e_avoided_tons: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'CONTRACTED';
  created_at: string;
  is_demo?: boolean;
}

export interface TransportOrder {
  id: string;
  match_id: string;
  listing_id: string;
  buyer_id: string;
  pickup_location: string;
  delivery_location: string;
  quantity_tons: number;
  vehicle_type: string;
  transporter_name: string;
  scheduled_pickup_date: string;
  status: TransportStatus;
  distance_km: number;
  transport_cost_inr: number;
  current_location: string;
  eta: string;
  timeline: { time: string; stage: string; description: string }[];
  created_at: string;
  is_demo?: boolean;
}

export interface CircularImpactMetrics {
  residue_diverted_tons: number;
  farmers_onboarded: number;
  active_buyers: number;
  successful_matches: number;
  material_processed_tons: number;
  estimated_burning_avoided_tons: number;
  estimated_pm25_avoided_kg: number;
  estimated_co2e_avoided_tons: number;
  revenue_generated_for_farmers_inr: number;
  platform_gmv_inr: number;
  platform_revenue_inr: number;
  average_transaction_value_inr: number;
  emission_factors_used?: Record<string, string>;
  methodology_disclaimer?: string;
}

export type IncidentStatus =
  | 'DETECTED'
  | 'ASSESSED'
  | 'RESPONSE_REQUIRED'
  | 'TEAM_ASSIGNED'
  | 'IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED';

export type IncidentSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface AssignedResource {
  id: string;
  resource_type: string;
  unit_code: string;
  dispatched_at: string;
  contact: string;
  status: string;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  notes?: string;
}

export interface IncidentRecord {
  id: string;
  station_id: string;
  station_name: string;
  severity: IncidentSeverity;
  risk_score: number;
  aqi: number;
  pm25: number;
  trigger_reason: string;
  weather_summary?: Record<string, any>;
  contributing_sources?: { source: string; share_pct: number; confidence: string }[];
  recommended_actions?: string[];
  circular_opportunity?: {
    nearby_residue_listings_count: number;
    nearby_processors_count: number;
    available_straw_tonnage: number;
    priority_districts: string[];
    action_cta: string;
  } | null;
  status: IncidentStatus;
  assigned_resources: AssignedResource[];
  timeline: IncidentTimelineEntry[];
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
}



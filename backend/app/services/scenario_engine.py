"""What-If Decision-Support Scenario Simulation Engine.

Enables controlled perturbations of:
1. Wind Speed (advective flushing vs stagnation)
2. Rainfall (wet deposition and particulate scavenging)
3. Regional Fire Activity (upstream biomass burning abatement/surge)

Computes baseline vs scenario forecasts, counterfactual differences,
10th-90th percentile uncertainty bounds, explicit physical assumptions,
and scientific 'What Changed and Why?' attribution.
"""

import math
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from app.services.residual_blending import ResidualCorrectionService
from app.services.aqi import calculate_naqi


class ScenarioEngine:
    """Simulates counterfactual atmospheric scenarios for decision support."""

    PRESETS = {
        "zero_stubble_burning": {
            "name": "Zero Stubble Burning Policy",
            "description": "Complete cessation (-100%) of agricultural residue burning across Punjab and Haryana.",
            "wind_speed_delta_pct": 0.0,
            "rainfall_mm": 0.0,
            "fire_activity_delta_pct": -100.0
        },
        "severe_winter_stagnation": {
            "name": "Severe Winter Stagnation Episode",
            "description": "Surface wind speed reduction (-60%) combined with enhanced inversion trapping.",
            "wind_speed_delta_pct": -60.0,
            "rainfall_mm": 0.0,
            "fire_activity_delta_pct": 0.0
        },
        "monsoon_washout": {
            "name": "Monsoon / Western Disturbance Washout",
            "description": "Moderate to heavy precipitation (25 mm) triggering particulate wet deposition.",
            "wind_speed_delta_pct": 20.0,
            "rainfall_mm": 25.0,
            "fire_activity_delta_pct": -80.0
        },
        "ventilation_corridor_flushing": {
            "name": "Brisk North-Westerly Flushing",
            "description": "Fresh brisk winds (+75%) flushing out the stagnant metropolitan airshed.",
            "wind_speed_delta_pct": 75.0,
            "rainfall_mm": 0.0,
            "fire_activity_delta_pct": 0.0
        }
    }

    def __init__(self, blending_service: Optional[ResidualCorrectionService] = None):
        self.blending_service = blending_service or ResidualCorrectionService()

    def simulate_scenario(
        self,
        station_id: str,
        station_name: str,
        lat: float,
        lon: float,
        wind_speed_delta_pct: float = 0.0,
        rainfall_mm: float = 0.0,
        fire_activity_delta_pct: float = 0.0,
        scenario_name: Optional[str] = None,
        live_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Runs counterfactual perturbation on 72-hour forecast baseline.
        
        Args:
            station_id: CAAQMS station ID
            station_name: Human-readable station name
            lat, lon: Station coordinates
            wind_speed_delta_pct: Percentage change in wind speed (-80% to +150%)
            rainfall_mm: Simulated rainfall in mm (0 to 100mm)
            fire_activity_delta_pct: Percentage change in upstream fires (-100% to +200%)
            scenario_name: Optional label for scenario
        """
        # 1. Fetch baseline forecast from Physics-AI Blending engine
        blended_res = self.blending_service.generate_blended_forecast(
            station_id=station_id,
            station_name=station_name,
            lat=lat,
            lon=lon
        )
        base_points = blended_res.get("points", [])

        # Anchor the synthetic/WRF trajectory to the latest CPCB + weather reading
        # so counterfactuals start from observed reality instead of a disconnected baseline.
        live_context = live_context or {}
        live_pm25 = live_context.get("pm25")
        baseline_pm25 = base_points[0].get("blended_pm25") if base_points else None
        live_offset = float(live_pm25 - baseline_pm25) if live_pm25 is not None and baseline_pm25 is not None else 0.0

        # Clamp perturbation bounds for physical plausibility
        clamped_ws_pct = max(-80.0, min(150.0, float(wind_speed_delta_pct)))
        clamped_rain = max(0.0, min(100.0, float(rainfall_mm)))
        clamped_fire_pct = max(-100.0, min(200.0, float(fire_activity_delta_pct)))

        # Physical constants for counterfactual responses
        # Box Model dilution coefficient
        alpha_wind = 0.42
        # Wet scavenging fraction: 1 - exp(-0.065 * R^0.7)
        scavenging_fraction = 1.0 - math.exp(-0.065 * (clamped_rain ** 0.70)) if clamped_rain > 0 else 0.0
        # Biomass burning regional baseline fraction in post-monsoon (typically 25-35%)
        regional_biomass_fraction = 0.28

        scenario_points = []
        total_baseline_pm25 = 0.0
        total_scenario_pm25 = 0.0

        for pt in base_points:
            decay = math.exp(-max(0, pt["hour_offset"]) / 24.0)
            pm25_base = max(8.0, pt["blended_pm25"] + live_offset * decay)
            total_baseline_pm25 += pm25_base

            # A. Regional Fire Source Abatement / Surge
            # Split into local baseline vs upstream transport component
            smoke_component = pm25_base * regional_biomass_fraction
            local_component = pm25_base - smoke_component
            perturbed_smoke = smoke_component * (1.0 + clamped_fire_pct / 100.0)

            pm25_after_fire = local_component + perturbed_smoke

            # B. Wind Speed Dilution / Stagnation
            # Positive WS increase dilutes pollutant; negative WS causes stagnation surge
            if clamped_ws_pct >= 0:
                dilution_factor = 1.0 / (1.0 + alpha_wind * (clamped_ws_pct / 100.0))
            else:
                # Stagnation trapping
                stagnation_surge = 1.0 + abs(clamped_ws_pct / 100.0) * 0.65
                dilution_factor = stagnation_surge

            pm25_after_wind = pm25_after_fire * dilution_factor

            # C. Wet Scavenging Precipitation Washout
            pm25_scenario = max(8.0, pm25_after_wind * (1.0 - scavenging_fraction))
            total_scenario_pm25 += pm25_scenario

            delta_pm25 = round(pm25_scenario - pm25_base, 1)

            # Uncertainty bounds based on residual variance and perturbation magnitude
            sigma_base = (pt["uncertainty_upper_pm25"] - pt["uncertainty_lower_pm25"]) / 3.29
            scenario_sigma = sigma_base * (1.0 + 0.15 * abs(clamped_ws_pct) / 100.0 + 0.1 * (clamped_rain / 20.0))
            lower_bound = round(max(5.0, pm25_scenario - 1.645 * scenario_sigma), 1)
            upper_bound = round(pm25_scenario + 1.645 * scenario_sigma, 1)

            # Compute scenario AQI
            naqi_base = pt.get("aqi", 150)
            naqi_scen_dict = calculate_naqi({
                "pm25": pm25_scenario,
                "pm10": pm25_scenario * 1.5,
                "o3": pt["physics_o3"],
                "no2": pt["physics_no2"]
            })
            aqi_scenario = naqi_scen_dict.get("aqi")

            scenario_points.append({
                "hour_offset": pt["hour_offset"],
                "timestamp": pt["timestamp"],
                "baseline_pm25": pm25_base,
                "scenario_pm25": round(pm25_scenario, 1),
                "delta_pm25": delta_pm25,
                "uncertainty_lower": lower_bound,
                "uncertainty_upper": upper_bound,
                "baseline_aqi": naqi_base,
                "scenario_aqi": aqi_scenario,
                "scenario_aqi_category": naqi_scen_dict.get("category"),
                "scenario_aqi_color": naqi_scen_dict.get("color")
            })

        n_pts = max(1, len(base_points))
        avg_base = total_baseline_pm25 / n_pts
        avg_scen = total_scenario_pm25 / n_pts
        net_delta = avg_scen - avg_base
        net_delta_pct = (net_delta / avg_base) * 100.0 if avg_base > 0 else 0.0

        # Build Explanation & Assumptions
        explanation, assumptions = self._generate_scientific_explanation(
            clamped_ws_pct, clamped_rain, clamped_fire_pct, net_delta, net_delta_pct, scavenging_fraction
        )

        return {
            "scenario_name": scenario_name or "Custom What-If Perturbation",
            "station_id": station_id,
            "station_name": station_name,
            "parameters": {
                "wind_speed_delta_pct": clamped_ws_pct,
                "rainfall_mm": clamped_rain,
                "fire_activity_delta_pct": clamped_fire_pct
            },
            "summary_delta": {
                "mean_baseline_pm25": round(avg_base, 1),
                "mean_scenario_pm25": round(avg_scen, 1),
                "net_change_pm25": round(net_delta, 1),
                "net_change_pct": round(net_delta_pct, 1),
                "air_quality_impact": "Substantial Improvement" if net_delta < -25 else (
                    "Moderate Improvement" if net_delta < -10 else (
                        "Near Baseline" if abs(net_delta) <= 10 else (
                            "Moderate Deterioration" if net_delta <= 25 else "Severe Deterioration"
                        )
                    )
                )
            },
            "explanation": explanation,
            "assumptions": assumptions,
            "disclaimer": (
                "Simulation for decision support and policy sensitivity analysis only. "
                "Represents counterfactual physics response to isolated meteorological/source perturbations; "
                "does not constitute a guaranteed causal outcome."
            ),
            "live_context": live_context,
            "points": scenario_points
        }

    def _generate_scientific_explanation(
        self,
        ws_pct: float,
        rain_mm: float,
        fire_pct: float,
        net_delta: float,
        net_delta_pct: float,
        scavenging_fraction: float
    ) -> Tuple[Dict[str, Any], List[str]]:
        """Generates physics-grounded explanation and explicit assumption list."""
        drivers = []
        assumptions = []

        if abs(ws_pct) > 5:
            if ws_pct > 0:
                drivers.append(
                    f"Wind speed enhancement (+{ws_pct:.0f}%) expanded effective airshed ventilation volume, "
                    f"diluting surface concentrations through enhanced horizontal advective flux."
                )
            else:
                drivers.append(
                    f"Surface wind calm ({ws_pct:.0f}%) suppressed atmospheric ventilation, trapping co-located "
                    f"vehicular and industrial emissions in a stagnant surface boundary layer."
                )
            assumptions.append(
                "Advective pollutant dilution scales inversely with boundary layer horizontal wind flux (Eulerian Box formulation)."
            )

        if rain_mm > 0:
            pct_scav = scavenging_fraction * 100.0
            drivers.append(
                f"Precipitation ({rain_mm:.1f} mm) induced below-cloud wet scavenging, washing out an estimated "
                f"{pct_scav:.1f}% of suspendable fine particulate mass through droplet collision."
            )
            assumptions.append(
                f"Wet deposition scavenging rate follows semi-empirical formulation Lambda = 1.2e-4 * R^0.7 s^-1."
            )

        if abs(fire_pct) > 5:
            if fire_pct < 0:
                drivers.append(
                    f"Upstream agricultural biomass burning abatement ({fire_pct:.0f}%) eliminated a substantial "
                    f"portion of the transboundary North-Westerly smoke plume entering Delhi NCR."
                )
            else:
                drivers.append(
                    f"Increased regional agricultural fire activity (+{fire_pct:.0f}%) intensified the upstream "
                    f"particulate plume, accelerating transboundary smoke advection into the airshed."
                )
            assumptions.append(
                "Baseline regional stubble burning contribution is estimated at 28% of ambient PM2.5 under aligned NW advection."
            )

        if not drivers:
            drivers.append("Perturbation parameters are at baseline levels; forecast reflects coupled operational model.")

        explanation = {
            "headline": f"Net forecast PM2.5 change of {net_delta:+.1f} µg/m³ ({net_delta_pct:+.1f}%)",
            "primary_mechanisms": drivers,
            "physical_rationale": (
                "Atmospheric particulate concentrations are dictated by the mass balance between source emission rates, "
                "advective ventilation volume, and precipitation deposition sinks."
            )
        }

        assumptions.append("Non-linear atmospheric chemical feedback loops (such as secondary aerosol nucleation) are linearized.")
        assumptions.append("Background urban emissions remain invariant across the simulated perturbation window.")

        return explanation, assumptions

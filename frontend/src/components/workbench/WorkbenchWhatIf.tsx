'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { Station, ScenarioResponse, PresetScenario } from '@/lib/types';
import { calculateAqiFromPm25, calculateEpaAqiFromPm25 } from '@/lib/naqi';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  FlaskConical,
  Wind,
  CloudRain,
  Flame,
  RotateCcw,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,

  CheckCircle2,
  Recycle,
  Leaf,
  Truck,
  Factory,
  Coins,
  ShieldAlert
} from 'lucide-react';

interface WorkbenchWhatIfProps {
  stations: Station[];
  selectedStationId: string;
  aqiStandard?: 'epa' | 'cpcb';
}

export default function WorkbenchWhatIf({
  stations,
  selectedStationId,
  aqiStandard = 'epa'
}: WorkbenchWhatIfProps) {
  const [simulatorMode, setSimulatorMode] = useState<'atmospheric' | 'circular'>('circular');
  const [circularTons, setCircularTons] = useState<number>(100);
  const [circularDistanceKm, setCircularDistanceKm] = useState<number>(50);
  const [circularPathway, setCircularPathway] = useState<string>('cbg_biogas');
  const [circularCrop, setCircularCrop] = useState<string>('Paddy Straw');
  const [circularPricePerTon, setCircularPricePerTon] = useState<number>(2250);

  const [stationId, setStationId] = useState(selectedStationId);
  const [presets, setPresets] = useState<PresetScenario[]>([]);
  const [windPct, setWindPct] = useState<number>(0);
  const [rainMm, setRainMm] = useState<number>(0);
  const [firePct, setFirePct] = useState<number>(0);
  const [scenarioName, setScenarioName] = useState<string>('Custom Scenario');
  const [scenarioData, setScenarioData] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const simulationRequestRef = useRef(0);


  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await api.getScenarioPresets();
        setPresets(res.presets || []);
      } catch (err) {
        console.error('Failed to load presets:', err);
      }
    }
    loadPresets();
  }, []);

  useEffect(() => {
    async function runSim() {
      const requestId = ++simulationRequestRef.current;
      try {
        setLoading(true);
        const res = await api.simulateScenario({
          station_id: stationId,
          wind_speed_delta_pct: windPct,
          rainfall_mm: rainMm,
          fire_activity_delta_pct: firePct,
          scenario_name: scenarioName
        });
        if (requestId === simulationRequestRef.current) {
          setScenarioData(res);
        }
      } catch (err) {
        if (requestId === simulationRequestRef.current) {
          console.error('Failed to simulate:', err);
        }
      } finally {
        if (requestId === simulationRequestRef.current) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(runSim, 150);
    return () => clearTimeout(timer);
  }, [stationId, windPct, rainMm, firePct, scenarioName]);

  const applyPreset = (p: PresetScenario) => {
    setScenarioName(p.name);
    setWindPct(p.wind_speed_delta_pct);
    setRainMm(p.rainfall_mm);
    setFirePct(p.fire_activity_delta_pct);
  };

  const resetBaseline = () => {
    setScenarioName('Baseline Forecast');
    setWindPct(0);
    setRainMm(0);
    setFirePct(0);
  };

  const delta = scenarioData?.summary_delta;
  const isImproved = (delta?.net_change_pm25 ?? 0) < 0;

  const [chartMetric, setChartMetric] = useState<'pm25' | 'aqi'>('pm25');

  const calcAqi = (pm: number) =>
    aqiStandard === 'epa' ? calculateEpaAqiFromPm25(pm) : calculateAqiFromPm25(pm);

  const baselineAqi = delta ? calcAqi(delta.mean_baseline_pm25) : null;
  const scenarioAqi = delta ? calcAqi(delta.mean_scenario_pm25) : null;

  const chartPoints = useMemo(() => {
    return (scenarioData?.points || []).map((p) => {
      const bAqi = calcAqi(p.baseline_pm25).aqi;
      const sAqi = calcAqi(p.scenario_pm25).aqi;
      return {
        ...p,
        baseline_aqi: bAqi,
        scenario_aqi: sAqi
      };
    });
  }, [scenarioData?.points, aqiStandard]);

  const PATHWAY_MULTIPLIERS: Record<string, { label: string; multiplier: number; outputUnit: string }> = {
    cbg_biogas: { label: 'CBG / Biogas Generation', multiplier: 1.85, outputUnit: 'Nm³ Clean Bio-CNG' },
    biochar: { label: 'Agri-Biochar Pyrolysis', multiplier: 2.10, outputUnit: 't Permanent Biochar' },
    biomass_fuel: { label: 'Thermal Pellet Co-Firing', multiplier: 1.45, outputUnit: 't Dense Fuel Pellets' },
    packaging_material: { label: 'Molded Pulp Packaging', multiplier: 2.40, outputUnit: 'Biodegradable Molded Cartons' },
    paper_pulp: { label: 'Eco-Kraft Paper Pulp', multiplier: 1.60, outputUnit: 't High-Tensile Paper' },
    mushroom_substrate: { label: 'Mushroom Bed Substrate', multiplier: 1.75, outputUnit: 'Sterilized Growing Beds' },
  };

  const currentPathwayMeta = PATHWAY_MULTIPLIERS[circularPathway] || PATHWAY_MULTIPLIERS.cbg_biogas;
  const simFarmerRevenue = circularTons * circularPricePerTon;
  const simTransportTrips = Math.ceil(circularTons / 10);
  const simLogisticsCost = circularDistanceKm * 4.2 * circularTons;
  const simProcessorValue = simFarmerRevenue * currentPathwayMeta.multiplier;
  const simPlatformFee = simFarmerRevenue * 0.035;
  const simAvoidedBurningTons = circularTons * 0.98;
  const simPm25AvoidedKg = Math.round(simAvoidedBurningTons * 3.85 * 10) / 10;
  const simCo2eAvoidedTons = Math.round(simAvoidedBurningTons * 1.46 * 10) / 10;
  const simParticipatingFarmers = Math.max(1, Math.round(circularTons / 7.5));

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#06090e] select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              What-If Counterfactual Decision Lab
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
              SIMULATION
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Simulate physical atmospheric perturbations and model circular waste-to-value pollution prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Target Station:</span>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="bg-[#0c111a] border border-white/[0.1] text-xs rounded-md px-3 py-1.5 text-white focus:outline-none focus:border-sky-400"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Simulator Mode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl">
        <button
          onClick={() => setSimulatorMode('circular')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            simulatorMode === 'circular'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Recycle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Pollution Prevention Scenario Simulator (AeroSense Circular)</span>
          <span className="sm:hidden">Circular Prevention Simulator</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">NEW</span>
        </button>

        <button
          onClick={() => setSimulatorMode('atmospheric')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            simulatorMode === 'atmospheric'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="hidden sm:inline">Atmospheric Physics Counterfactual Lab</span>
          <span className="sm:hidden">Atmospheric Physics Lab</span>
        </button>
      </div>

      {/* CIRCULAR SIMULATOR MODE */}
      {simulatorMode === 'circular' ? (
        <div className="space-y-6">
          {/* Controls Grid */}
          <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Scenario Parameters: Agricultural Residue Diversion
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Slider 1: Residue Quantity */}
              <div className="space-y-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Residue Diverted from Burning:</span>
                  <span className="text-emerald-400 font-bold text-sm">{circularTons} Tonnes</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={circularTons}
                  onChange={(e) => setCircularTons(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10t (Small FPO)</span>
                  <span>500t</span>
                  <span>1,000t (Cluster)</span>
                </div>
              </div>

              {/* Slider 2: Transport Distance */}
              <div className="space-y-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Transport Haul Distance:</span>
                  <span className="text-sky-400 font-bold text-sm">{circularDistanceKm} km</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={circularDistanceKm}
                  onChange={(e) => setCircularDistanceKm(parseInt(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10 km (Local)</span>
                  <span>75 km</span>
                  <span>150 km (Regional)</span>
                </div>
              </div>

              {/* Dropdown: Pathway */}
              <div className="space-y-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg">
                <span className="text-slate-400 text-xs font-mono block">Downstream Conversion Pathway:</span>
                <select
                  value={circularPathway}
                  onChange={(e) => setCircularPathway(e.target.value)}
                  className="w-full bg-[#070c14] border border-white/[0.1] rounded-lg text-xs font-mono text-white p-2 focus:border-emerald-400 focus:outline-none"
                >
                  {Object.entries(PATHWAY_MULTIPLIERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} (×{v.multiplier} margin)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Output: {currentPathwayMeta.outputUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Impact Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WITHOUT INTERVENTION (Status Quo Burning) */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wide font-mono">
                    WITHOUT INTERVENTION (Status Quo)
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  Field Burning
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Crop Residue Fate:</span>
                  <span className="text-rose-400 font-bold">{circularTons} tonnes open-field burned</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Direct PM2.5 Released:</span>
                  <span className="text-rose-300 font-bold text-sm">+{simPm25AvoidedKg.toLocaleString()} kg PM2.5</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Greenhouse Gases Emitted:</span>
                  <span className="text-rose-300 font-bold">+{simCo2eAvoidedTons.toLocaleString()} tCO₂e</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Farmer Economic Return:</span>
                  <span className="text-slate-400 font-bold">₹0 (Zero direct earnings)</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Regulatory Impact:</span>
                  <span className="text-amber-400">Air Act fines & police FIR risk</span>
                </div>
              </div>

              <div className="text-[11px] text-rose-300/80 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 leading-relaxed">
                Open-field burning of {circularTons}t of paddy straw releases acute toxic plumes into the nocturnal Delhi boundary layer, exacerbating GRAP Stage-IV emergency air quality conditions.
              </div>
            </div>

            {/* WITH AEROSENSE CIRCULAR (Closed-Loop Solution) */}
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide font-mono">
                    WITH AEROSENSE CIRCULAR
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  Biomass Monetized
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Residue Collected & Baled:</span>
                  <span className="text-emerald-400 font-bold">{circularTons} tonnes processed</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Avoided PM2.5 Emissions:</span>
                  <span className="text-emerald-300 font-bold text-sm">-{simPm25AvoidedKg.toLocaleString()} kg PM2.5 avoided</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Avoided Greenhouse Impact:</span>
                  <span className="text-emerald-300 font-bold">-{simCo2eAvoidedTons.toLocaleString()} tCO₂e</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Farmer Revenue Created:</span>
                  <span className="text-amber-400 font-bold text-sm">₹{simFarmerRevenue.toLocaleString()} ({simParticipatingFarmers} farmers)</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-slate-400">Processor Clean Value:</span>
                  <span className="text-sky-300 font-bold">₹{simProcessorValue.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-white/[0.02] border border-white/[0.05] p-2 rounded">
                  <span className="text-slate-500 block">Logistics Trips</span>
                  <span className="text-white font-bold">{simTransportTrips} truck dispatches (₹{simLogisticsCost.toLocaleString()})</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] p-2 rounded">
                  <span className="text-slate-500 block">Platform Commission</span>
                  <span className="text-purple-300 font-bold">₹{simPlatformFee.toLocaleString()} (3.5%)</span>
                </div>
              </div>

              <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 leading-relaxed">
                By mobilizing {simTransportTrips} trucks to transport residue to a {currentPathwayMeta.label} plant, the airshed avoids hazardous smog while generating real rural income.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EXISTING ATMOSPHERIC LAB MODE */
        <div className="space-y-6">
          {/* Policy Presets */}
          <div className="flex items-center gap-2 flex-wrap bg-[#0c111a] border border-white/[0.08] p-3 rounded-xl">
            <span className="text-[11px] font-semibold uppercase font-mono text-slate-400 flex items-center gap-1.5 mr-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Policy Presets:
            </span>
            {presets.map((p) => {
              const isActive =
                windPct === p.wind_speed_delta_pct &&
                rainMm === p.rainfall_mm &&
                firePct === p.fire_activity_delta_pct;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 border-white/[0.08]'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
            <button
              onClick={resetBaseline}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] ml-auto flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          </div>


      {/* Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sliders */}
        <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Perturbation Inputs
              </h3>
              {loading && <span className="text-[10px] text-sky-400 animate-pulse font-mono">Running...</span>}
            </div>

            {/* Wind Speed */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  Wind Speed
                </span>
                <span className={`font-mono font-bold ${windPct > 0 ? 'text-sky-400' : windPct < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {windPct > 0 ? `+${windPct}%` : `${windPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-80"
                max="150"
                step="5"
                value={windPct}
                onChange={(e) => {
                  setScenarioName('Custom Scenario');
                  setWindPct(Number(e.target.value));
                }}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-80% (Stagnation)</span>
                <span>0%</span>
                <span>+150% (Flushing)</span>
              </div>
            </div>

            {/* Rainfall */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  Precipitation Washout
                </span>
                <span className={`font-mono font-bold ${rainMm > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                  {rainMm} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={rainMm}
                onChange={(e) => {
                  setScenarioName('Custom Scenario');
                  setRainMm(Number(e.target.value));
                }}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 mm (Dry)</span>
                <span>15 mm (Moderate)</span>
                <span>50 mm (Heavy)</span>
              </div>
            </div>

            {/* Biomass Burning */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Upwind Fires
                </span>
                <span className={`font-mono font-bold ${firePct < 0 ? 'text-emerald-400' : firePct > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {firePct > 0 ? `+${firePct}%` : `${firePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="150"
                step="5"
                value={firePct}
                onChange={(e) => {
                  setScenarioName('Custom Scenario');
                  setFirePct(Number(e.target.value));
                }}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-100% (Zero Burning)</span>
                <span>0%</span>
                <span>+150% (Smoke Surge)</span>
              </div>
            </div>
          </div>

          {/* Delta Pill */}
          {delta && (
            <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
              isImproved ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-amber-950/20 border-amber-800/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                  Net Mean Impact ({aqiStandard === 'epa' ? 'US EPA Scale' : 'CPCB NAQI'})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  isImproved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isImproved ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {delta.air_quality_impact}
                </span>
              </div>

              <div className="flex items-baseline justify-between font-mono">
                <div className="text-xs text-slate-400">
                  {delta.mean_baseline_pm25.toFixed(1)} <span className="text-[9px]">µg</span>
                  <ArrowRight className="inline w-3 h-3 mx-1 text-slate-500" />
                  <span className="text-white font-bold">{delta.mean_scenario_pm25.toFixed(1)} µg</span>
                </div>
                <div className={`text-sm font-bold ${isImproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {delta.net_change_pm25 > 0 ? `+${delta.net_change_pm25.toFixed(1)}` : delta.net_change_pm25.toFixed(1)} µg/m³
                  <span className="text-[10px] ml-1">({delta.net_change_pct > 0 ? `+${delta.net_change_pct.toFixed(0)}` : delta.net_change_pct.toFixed(0)}%)</span>
                </div>
              </div>

              {/* Dynamic AQI Shift */}
              {baselineAqi && scenarioAqi && (
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] font-mono">
                  <span className="text-slate-400">AQI Impact:</span>
                  <span className="flex items-center gap-1">
                    <span className="font-bold" style={{ color: baselineAqi.color }}>{baselineAqi.aqi}</span>
                    <span className="text-[9px] text-slate-500">({baselineAqi.category})</span>
                    <ArrowRight className="inline w-3 h-3 text-slate-500" />
                    <span className="font-bold" style={{ color: scenarioAqi.color }}>{scenarioAqi.aqi}</span>
                    <span className="text-[9px] font-semibold" style={{ color: scenarioAqi.color }}>({scenarioAqi.category})</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {scenarioData?.live_context && (
            <div className="border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-[10px] font-mono text-cyan-200">
              Baseline anchored to {scenarioData.live_context.source || 'provider'} telemetry
              {scenarioData.live_context.timestamp ? ` · ${new Date(scenarioData.live_context.timestamp).toLocaleTimeString()}` : ''}
              {scenarioData.live_context.wind_speed !== null && scenarioData.live_context.wind_speed !== undefined
                ? ` · wind ${scenarioData.live_context.wind_speed.toFixed(1)} m/s`
                : ''}
            </div>
          )}
        </div>

        {/* Right Chart */}
        <div className="lg:col-span-2 bg-[#0c111a] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Baseline vs Counterfactual Simulation Trajectory
              </h3>
              <p className="text-xs text-slate-400">
                Coupled baseline trajectory vs perturbed scenario with uncertainty ribbon
              </p>
            </div>

            {/* Metric Switcher Tab for What-If */}
            <div className="flex items-center gap-1 bg-[#06090e] border border-white/[0.08] p-0.5 rounded-md text-[11px] font-mono self-start sm:self-auto">
              <button
                onClick={() => setChartMetric('pm25')}
                className={`px-2.5 py-0.5 rounded transition-colors ${
                  chartMetric === 'pm25'
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PM2.5 (µg/m³)
              </button>
              <button
                onClick={() => setChartMetric('aqi')}
                className={`px-2.5 py-0.5 rounded transition-colors ${
                  chartMetric === 'aqi'
                    ? 'bg-sky-500/20 text-sky-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {aqiStandard === 'epa' ? 'US EPA AQI' : 'CPCB NAQI'}
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="hour_offset" stroke="#64748b" fontSize={11} tickFormatter={(v) => `+${v}h`} />
                <YAxis stroke="#64748b" fontSize={11} unit={chartMetric === 'aqi' ? '' : ' µg'} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [
                    `${typeof value === 'number' ? Math.round(value) : value} ${chartMetric === 'aqi' ? (aqiStandard === 'epa' ? 'EPA' : 'NAQI') : 'µg/m³'}`,
                    ''
                  ]}
                  labelFormatter={(l) => `Horizon: +${l}h`}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                {chartMetric === 'pm25' && (
                  <>
                    <ReferenceLine y={60} stroke="#eab308" strokeDasharray="3 3" />
                    <ReferenceLine y={120} stroke="#f97316" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="uncertainty_upper" stroke="none" fill="#38bdf8" fillOpacity={0.12} name="Uncertainty Range (10-90%)" />
                    <Area type="monotone" dataKey="uncertainty_lower" stroke="none" fill="#0c111a" fillOpacity={1.0} />
                    <Line type="monotone" dataKey="baseline_pm25" name="Baseline Forecast" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="scenario_pm25" name="Scenario Counterfactual" stroke={isImproved ? '#10b981' : '#f97316'} strokeWidth={2.5} dot={false} />
                  </>
                )}

                {chartMetric === 'aqi' && aqiStandard === 'epa' && (
                  <>
                    <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 9 }} />
                    <ReferenceLine y={100} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Mod', fill: '#eab308', fontSize: 9 }} />
                    <ReferenceLine y={150} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Sensitive', fill: '#f97316', fontSize: 9 }} />
                    <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Unhealthy', fill: '#ef4444', fontSize: 9 }} />
                    <Line type="monotone" dataKey="baseline_aqi" name="Baseline EPA AQI" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="scenario_aqi" name="Scenario EPA AQI" stroke={isImproved ? '#10b981' : '#f97316'} strokeWidth={2.5} dot={false} />
                  </>
                )}

                {chartMetric === 'aqi' && aqiStandard === 'cpcb' && (
                  <>
                    <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 9 }} />
                    <ReferenceLine y={100} stroke="#84cc16" strokeDasharray="3 3" label={{ value: 'Satisfactory', fill: '#84cc16', fontSize: 9 }} />
                    <ReferenceLine y={200} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#eab308', fontSize: 9 }} />
                    <ReferenceLine y={300} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Poor', fill: '#f97316', fontSize: 9 }} />
                    <Line type="monotone" dataKey="baseline_aqi" name="Baseline CPCB NAQI" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="scenario_aqi" name="Scenario CPCB NAQI" stroke={isImproved ? '#10b981' : '#f97316'} strokeWidth={2.5} dot={false} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span>Scenario: {scenarioData?.scenario_name}</span>
            <span>Horizon: 72 Hours</span>
            <span className="italic">*Model simulation for decision support</span>
          </div>
        </div>
      </div>

      {/* Explanation Card */}
      {scenarioData && (
        <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">What Changed and Why?</h3>
          </div>

          <div className="p-3 bg-[#06090e] border border-white/[0.06] rounded-lg">
            <span className="text-xs font-mono font-bold text-sky-300 block mb-1">
              {scenarioData.explanation.headline}
            </span>
            <ul className="space-y-1 text-xs text-slate-300">
              {scenarioData.explanation.primary_mechanisms.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-slate-400">
            <strong>Physical Rationale:</strong> {scenarioData.explanation.physical_rationale}
          </p>

          <div className="pt-3 border-t border-white/[0.06] text-[10px] text-slate-500">
            <strong>Scientific Disclaimer:</strong> {scenarioData.disclaimer}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}


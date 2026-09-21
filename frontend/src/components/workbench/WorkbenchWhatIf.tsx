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
  CheckCircle2
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

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#06090e]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              What-If Counterfactual Decision Lab
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              SIMULATION
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Controlled physical perturbations of wind speed, rainfall scavenging, and biomass burning abatement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Station:</span>
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
  );
}

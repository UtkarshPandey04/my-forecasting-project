'use client';

import React from 'react';
import { X, Wind, Thermometer, Droplets, Compass, Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { Station, Observation, ForecastResponse } from '@/lib/types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { calculateAqiFromPm25, calculateEpaAqiFromPm25 } from '@/lib/naqi';

interface StationDetailDrawerProps {
  station: Station | null;
  observation: Observation | null;
  forecast: ForecastResponse | null;
  onClose: () => void;
  aqiStandard?: 'epa' | 'cpcb';
}

const getAqiColor = (aqi: number | null): string => {
  if (aqi === null) return '#64748b';
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#eab308';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#7c3aed';
};

export default function StationDetailDrawer({
  station,
  observation,
  forecast,
  onClose,
  aqiStandard = 'epa'
}: StationDetailDrawerProps) {
  if (!station) return null;

  const pm25 = observation?.pollutants?.pm25 ?? 60.0;
  const epaResult = calculateEpaAqiFromPm25(pm25);
  const cpcbResult = calculateAqiFromPm25(pm25);

  const activeAqi = aqiStandard === 'epa'
    ? (observation?.epa_aqi ?? epaResult.aqi)
    : (observation?.aqi ?? cpcbResult.aqi);

  const activeCategory = aqiStandard === 'epa'
    ? (observation?.epa_category ?? epaResult.category)
    : (observation?.aqi_category ?? cpcbResult.category);

  const activeColor = aqiStandard === 'epa'
    ? (observation?.epa_color ?? epaResult.color)
    : getAqiColor(activeAqi);

  const standardLabel = aqiStandard === 'epa' ? 'Current US EPA AQI (aqicn)' : 'Current Indian NAQI (CPCB)';
  const pollutants = observation?.pollutants;
  const meteo = observation?.meteorology;

  return (
    <div className="w-88 md:w-96 bg-[#0c111a] border-l border-white/[0.08] h-full flex flex-col justify-between shrink-0 shadow-2xl z-20 overflow-y-auto">
      {/* Top Header */}
      <div>
        <div className="p-4 border-b border-white/[0.08] flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider block">
              {station.city}, {station.state} • {station.zone_type}
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">{station.name}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Agency: {station.operating_agency} • {station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°E
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current AQI Hero Pill */}
        <div className="p-4 border-b border-white/[0.06] bg-[#070b12] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              {standardLabel}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold font-mono" style={{ color: activeColor }}>
                {activeAqi ?? '--'}
              </span>
              {activeCategory && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-semibold border"
                  style={{
                    backgroundColor: `${activeColor}20`,
                    borderColor: `${activeColor}50`,
                    color: activeColor
                  }}
                >
                  {activeCategory}
                </span>
              )}
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
            <div>Prominent: <strong className="text-slate-200">{observation?.prominent_pollutant || 'PM2.5'}</strong></div>
            <div>Scale: <span className="text-sky-400 font-bold">{aqiStandard === 'epa' ? 'US EPA' : 'CPCB'}</span></div>
          </div>
        </div>

        {/* Pollutant Matrix */}
        <div className="p-4 border-b border-white/[0.06]">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Real-Time Pollutant Concentrations
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'PM2.5', val: pollutants?.pm25, unit: 'µg/m³', bold: true },
              { label: 'PM10', val: pollutants?.pm10, unit: 'µg/m³' },
              { label: 'NO2', val: pollutants?.no2, unit: 'µg/m³' },
              { label: 'SO2', val: pollutants?.so2, unit: 'µg/m³' },
              { label: 'CO', val: pollutants?.co, unit: 'mg/m³' },
              { label: 'O3', val: pollutants?.o3, unit: 'µg/m³' },
            ].map((p, i) => (
              <div key={i} className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 font-mono block">{p.label}</span>
                <span className={`text-xs font-mono ${p.bold ? 'font-bold text-sky-300 text-sm' : 'text-slate-200'}`}>
                  {p.val !== null && p.val !== undefined ? p.val.toFixed(1) : '--'}
                </span>
                <span className="text-[9px] text-slate-500 block">{p.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meteorology Strip */}
        <div className="p-4 border-b border-white/[0.06]">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Surface Meteorology (IMD)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Temperature</span>
                <span className="font-mono text-slate-200">{meteo?.temperature ? `${meteo.temperature.toFixed(1)}°C` : '--'}</span>
              </div>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Humidity</span>
                <span className="font-mono text-slate-200">{meteo?.humidity ? `${meteo.humidity.toFixed(0)}%` : '--'}</span>
              </div>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Wind Velocity</span>
                <span className="font-mono text-slate-200">{meteo?.wind_speed ? `${meteo.wind_speed.toFixed(1)} m/s` : '--'}</span>
              </div>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">Bearing</span>
                <span className="font-mono text-slate-200">{meteo?.wind_direction ? `${meteo.wind_direction.toFixed(0)}°` : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini 72-Hour Forecast Trend */}
        {forecast && forecast.points && forecast.points.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                72h Forecast Trend (PM2.5)
              </h4>
              <span className="text-[10px] font-mono text-sky-400">
                {forecast.model_version}
              </span>
            </div>
            <div className="h-28 w-full bg-[#070b12] rounded-lg p-2 border border-white/[0.04]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.points.filter((_, i) => i % 2 === 0)}>
                  <XAxis dataKey="hour_offset" stroke="#64748b" fontSize={9} tickFormatter={(val) => `+${val}h`} />
                  <YAxis stroke="#64748b" fontSize={9} domain={['auto', 'auto']} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c111a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} µg/m³`, 'PM2.5']}
                    labelFormatter={(label) => `Horizon: +${label}h`}
                  />
                  <Line type="monotone" dataKey="pm25_predicted" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Footer telemetry */}
      <div className="p-3 border-t border-white/[0.06] text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>ID: {station.id}</span>
        <span>Confidence: 88%</span>
      </div>
    </div>
  );
}

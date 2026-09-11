'use client';

import React from 'react';
import { Observation } from '@/lib/types';
import { Wind, Thermometer, Activity, Droplets } from 'lucide-react';

interface OverviewScreenProps {
  observation: Observation | null;
  stationName: string;
}

const getAqiColor = (aqi: number | null): string => {
  if (aqi === null) return '#64748b';
  if (aqi <= 50) return '#10b981';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#eab308';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#7c3aed';
};

export default function OverviewScreen({ observation, stationName }: OverviewScreenProps) {
  const aqi = observation?.aqi ?? null;
  const aqiColor = getAqiColor(aqi);
  const pm25 = observation?.pollutants?.pm25 ?? null;
  const o3 = observation?.pollutants?.o3 ?? null;
  const temp = observation?.meteorology?.temperature ?? null;
  const ws = observation?.meteorology?.wind_speed ?? null;
  const wd = observation?.meteorology?.wind_direction ?? null;

  return (
    <div className="bg-[#070b12] border-b border-white/[0.08] px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto text-xs shrink-0 select-none">
      {/* Station Context */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="font-bold text-white tracking-tight truncate">{stationName}</span>
        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
          {observation?.aqi_category || 'Active Station'}
        </span>
      </div>

      {/* Connected KPI Strip */}
      <div className="flex items-center gap-5 shrink-0 font-mono text-xs">
        {/* AQI */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">AQI</span>
          <span className="font-extrabold text-sm" style={{ color: aqiColor }}>
            {aqi ?? '--'}
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* PM2.5 */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">PM2.5</span>
          <span className="font-bold text-white">
            {pm25 !== null ? `${pm25.toFixed(1)}` : '--'}
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">µg</span>
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* O3 */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px]">O₃</span>
          <span className="font-bold text-slate-200">
            {o3 !== null ? `${o3.toFixed(1)}` : '--'}
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">µg</span>
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Wind */}
        <div className="flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold text-slate-200">
            {ws !== null ? `${ws.toFixed(1)} m/s` : '--'}
            <span className="text-[10px] font-normal text-slate-500 ml-1">
              ({wd !== null ? `${wd.toFixed(0)}°` : '--'})
            </span>
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Temperature */}
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-slate-200">
            {temp !== null ? `${temp.toFixed(1)}°C` : '--'}
          </span>
        </div>
      </div>
    </div>
  );
}

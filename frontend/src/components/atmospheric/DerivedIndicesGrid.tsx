'use client';

import React from 'react';
import { DerivedIndices } from '@/lib/types';
import { Wind, Layers, Compass, ThermometerSnowflake } from 'lucide-react';

interface Props {
  indices: DerivedIndices | null;
  loading?: boolean;
  aqiStandard?: 'epa' | 'cpcb';
}

export default function DerivedIndicesGrid({ indices, loading, aqiStandard = 'epa' }: Props) {
  if (loading || !indices) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const isEpa = aqiStandard === 'epa';

  // Dynamic Ventilation
  const viValue = isEpa
    ? Math.round(indices.ventilation_index * 10.7639)
    : indices.ventilation_index;
  const viUnit = isEpa ? 'ft²/s' : 'm²/s';
  const viCategory = isEpa
    ? (indices.ventilation_index < 3800 ? 'Advisory' : indices.ventilation_index < 6200 ? 'Marginal' : 'Favorable')
    : indices.ventilation_category;

  const viBadgeClass =
    viCategory === 'Critical' || viCategory === 'Advisory'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : viCategory === 'Moderate' || viCategory === 'Marginal'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  // Dynamic Stagnation styling
  const siVal = isEpa
    ? Math.min(100, Math.round(indices.stagnation_index * 1.35 + 10))
    : indices.stagnation_index;
  const siColor = siVal > 65 ? 'text-rose-400' : siVal > 40 ? 'text-amber-400' : 'text-emerald-400';

  // Dynamic Inversion styling
  const invVal = isEpa
    ? Math.min(100, Math.round(indices.inversion_risk_score * 1.55 + 6))
    : indices.inversion_risk_score;
  const invColor = invVal > 65 ? 'text-rose-400' : invVal > 35 ? 'text-amber-400' : 'text-emerald-400';

  // Dynamic Transport styling
  const transVal = isEpa
    ? Math.min(100, Math.round(indices.wind_transport_indicator * 1.12 + 5))
    : indices.wind_transport_indicator;
  const transColor = transVal > 60 ? 'text-orange-400' : transVal > 30 ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Ventilation Index */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Ventilation Index
          </span>
          <Wind className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="my-1.5 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-100 font-mono">
            {viValue.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">{viUnit}</span>
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${viBadgeClass}`}>
            {viCategory}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 truncate">
          Dispersion volume ({isEpa ? 'US EPA Standard' : 'WS × PBLH'})
        </span>
      </div>

      {/* 2. Stagnation Index */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Stagnation Index
          </span>
          <Layers className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="my-1.5 flex items-baseline justify-between">
          <span className={`text-xl font-bold font-mono ${siColor}`}>
            {siVal.toFixed(0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {siVal > 65 ? 'Severe Calm' : siVal > 40 ? 'Moderate' : 'Low'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full ${siVal > 65 ? 'bg-rose-500' : siVal > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(5, siVal))}%` }}
          />
        </div>
      </div>

      {/* 3. Inversion Risk Score */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Inversion Risk
          </span>
          <ThermometerSnowflake className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="my-1.5 flex items-baseline justify-between">
          <span className={`text-xl font-bold font-mono ${invColor}`}>
            {invVal.toFixed(0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {invVal > 65 ? 'Critical Cap' : invVal > 35 ? 'Elevated' : 'Minimal'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full ${invVal > 65 ? 'bg-rose-500' : invVal > 35 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(5, invVal))}%` }}
          />
        </div>
      </div>

      {/* 4. Wind Transport Indicator */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Transport Indicator
          </span>
          <Compass className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="my-1.5 flex items-baseline justify-between">
          <span className={`text-xl font-bold font-mono ${transColor}`}>
            {transVal.toFixed(0)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {transVal > 60 ? 'Active NW Advection' : transVal > 30 ? 'Partial' : 'Faint'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full ${transVal > 60 ? 'bg-orange-500' : transVal > 30 ? 'bg-amber-500' : 'bg-slate-600'}`}
            style={{ width: `${Math.min(100, Math.max(5, transVal))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

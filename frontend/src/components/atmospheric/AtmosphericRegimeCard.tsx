'use client';

import React from 'react';
import { AtmosphericRegime, Station, Observation } from '@/lib/types';
import { Wind, AlertTriangle, ShieldCheck, CloudRain, Flame, Activity } from 'lucide-react';

interface Props {
  regime: AtmosphericRegime | null;
  loading?: boolean;
  selectedStation?: Station | null;
  selectedObservation?: Observation | null;
  aqiStandard?: 'epa' | 'cpcb';
}

const getRegimeStyle = (regimeName: string) => {
  switch (regimeName) {
    case 'STRONG_INVERSION':
      return {
        label: 'Strong Thermal Inversion',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: AlertTriangle,
        iconColor: 'text-rose-400',
        borderColor: 'border-rose-900/40'
      };
    case 'REGIONAL_TRANSPORT':
      return {
        label: 'Regional Smoke Transport',
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        icon: Flame,
        iconColor: 'text-orange-400',
        borderColor: 'border-orange-900/40'
      };
    case 'STAGNATION':
      return {
        label: 'Atmospheric Stagnation',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: Activity,
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-900/40'
      };
    case 'HIGH_VENTILATION':
      return {
        label: 'High Dispersion / Ventilation',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: Wind,
        iconColor: 'text-emerald-400',
        borderColor: 'border-emerald-900/40'
      };
    case 'RAIN_WASHOUT':
      return {
        label: 'Precipitation Scavenging / Washout',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: CloudRain,
        iconColor: 'text-sky-400',
        borderColor: 'border-sky-900/40'
      };
    default:
      return {
        label: 'Normal Diurnal Dispersion',
        badgeColor: 'bg-slate-700/30 text-slate-300 border-slate-700/50',
        icon: ShieldCheck,
        iconColor: 'text-slate-400',
        borderColor: 'border-slate-800'
      };
  }
};

export default function AtmosphericRegimeCard({
  regime,
  loading,
  selectedStation,
  selectedObservation,
  aqiStandard = 'epa'
}: Props) {
  if (loading || !regime) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
      </div>
    );
  }

  const style = getRegimeStyle(regime.regime);
  const IconComponent = style.icon;
  const confPct = Math.round(regime.confidence * 100);

  const stationName = selectedStation?.name || 'Central Delhi';
  const meteo = selectedObservation?.meteorology;
  const ws = meteo?.wind_speed ?? 2.8;
  const wd = meteo?.wind_direction ?? 300;

  const windStr = aqiStandard === 'epa'
    ? `${ws.toFixed(1)} m/s (${(ws * 2.237).toFixed(1)} mph)`
    : `${ws.toFixed(1)} m/s`;

  const getCompassDir = (deg: number) => {
    const val = Math.floor((deg / 45) + 0.5);
    const arr = ['Northerly', 'North-Easterly', 'Easterly', 'South-Easterly', 'Southerly', 'South-Westerly', 'Westerly', 'North-Westerly'];
    return arr[val % 8];
  };

  const dirName = getCompassDir(wd);

  const dynamicExplanation = `${dirName} surface winds (${Math.round(wd)}°, ${windStr}) over ${stationName} are driving regional plume advection and localized dispersion dynamics under the ${aqiStandard === 'epa' ? 'US EPA NowCast' : 'CPCB NAQI'} reference frame.`;

  return (
    <div className={`bg-slate-900/90 border ${style.borderColor} rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
          <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Atmospheric Regime
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${style.badgeColor}`}>
              {style.label}
            </span>
            <span className="text-[11px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              Confidence: {confPct}%
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/30">
              {stationName}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            {dynamicExplanation}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Physics-Guided Engine</span>
      </div>
    </div>
  );
}

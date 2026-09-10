'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, Database, Satellite, Wind, ShieldCheck } from 'lucide-react';
import { HealthResponse } from '@/lib/types';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  stationCount: number;
}

export default function DataSourcesModal({
  isOpen,
  onClose,
  health,
  stationCount
}: DataSourcesModalProps) {
  if (!isOpen) return null;

  const mode = health?.mode || 'DEMO';
  const providerStatus = new Map((health?.providers || []).map((provider) => [provider.name, provider]));

  const SOURCES = [
    {
      name: 'CPCB CAAQMS Network',
      description: 'Continuous Ambient Air Quality Monitoring Stations across NCT Delhi & NCR boundaries.',
      pollutants: 'PM2.5, PM10, NO2, SO2, CO, O3, NH3',
      coverage: `${stationCount || 40} Active Stations`,
      refresh: 'Hourly ground-level ingestion',
      status: providerStatus.get('CPCB')?.status || (mode === 'LIVE' ? 'error' : 'not_configured'),
      icon: Database,
      accent: '#38bdf8'
    },
    {
      name: 'IMD / Open-Meteo NWP',
      description: 'Numerical boundary-layer meteorology, 10m wind velocity vectors, temperature, and planetary boundary layer height.',
      pollutants: 'Wind Speed, Wind Direction, Temp, Humidity, PBLH, Pressure',
      coverage: 'Continuous spatial grid over Delhi NCR',
      refresh: 'Hourly synoptic update',
      status: providerStatus.get('IMD')?.status || (mode === 'LIVE' ? 'error' : 'not_configured'),
      icon: Wind,
      accent: '#60a5fa'
    },
    {
      name: 'NASA FIRMS Satellites',
      description: 'Visible Infrared Imaging Radiometer Suite (VIIRS) and MODIS active fire hotspots and Fire Radiative Power (FRP).',
      pollutants: 'Active Thermal Anomalies, FRP (MW), Brightness Temp',
      coverage: 'Northern India Agricultural Belt (Punjab, Haryana, NCR)',
      refresh: 'Daily orbital overpass & NRT stream',
      status: providerStatus.get('NASA FIRMS')?.status || (mode === 'LIVE' ? 'error' : 'not_configured'),
      icon: Satellite,
      accent: '#f97316'
    },
    {
      name: 'WRF-Chem Numerical Chemistry',
      description: 'Coupled Eulerian Weather Research and Forecasting Chemistry transport model with RADM2-MADE/SORGAM mechanism.',
      pollutants: 'PM2.5 Dry Mass, Tropospheric Ozone, Nitrogen Oxides',
      coverage: 'Regional NetCDF Grid (28.2°N–28.9°N, 76.8°E–77.6°E)',
      refresh: '72-Hour Numerical Run Cycle',
      status: providerStatus.get('WRF-Chem')?.status || 'error',
      icon: ShieldCheck,
      accent: '#10b981'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#0c111a] border border-white/[0.12] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Integrated Atmospheric Data Feeds</h3>
              <p className="text-[11px] text-slate-400">
                Operational ingestion pipelines and scientific provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[480px] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs">
            <span className="text-slate-300">
              System Pipeline State: <strong className="text-white">{mode} MODE</strong>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Ingestion Adapters Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOURCES.map((s, idx) => {
              const Icon = s.icon;
              const statusLabel = s.status === 'connected' ? 'Connected' : s.status === 'not_configured' ? 'Not configured' : 'Error';
              const statusClasses = s.status === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : s.status === 'not_configured'
                  ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#06090e] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: s.accent }} />
                        <h4 className="text-xs font-bold text-white">{s.name}</h4>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${statusClasses}`}>
                        {s.status === 'connected' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {s.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] space-y-1 text-[10px] font-mono text-slate-400">
                    <div>Coverage: <span className="text-slate-200">{s.coverage}</span></div>
                    <div>Cadence: <span className="text-slate-200">{s.refresh}</span></div>
                    <div className="truncate">Parameters: <span className="text-slate-200">{s.pollutants}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

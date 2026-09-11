'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  ShieldCheck,
  Cpu,
  Loader2,
  AlertTriangle,
  Flame,
  Wind,
  Layers,
  CheckCircle2,
  Activity,
  History,
  Info
} from 'lucide-react';
import { AtmosphericRegime, DerivedIndices, ForecastExplanation, AtmosphericQueryResponse } from '@/lib/types';
import { api } from '@/lib/api';

interface AskAeroSenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId?: string;
  regime?: AtmosphericRegime | null;
  indices?: DerivedIndices | null;
  explanation?: ForecastExplanation | null;
}

export default function AskAeroSenseModal({
  isOpen,
  onClose,
  stationId,
  regime,
  indices,
  explanation,
}: AskAeroSenseModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<AtmosphericQueryResponse | null>(null);
  const [history, setHistory] = useState<AtmosphericQueryResponse[]>([]);
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(true);

  if (!isOpen) return null;

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.askAtmosphericIntelligence(queryText.trim(), stationId);
      setCurrentResponse(res);
      setHistory((prev) => [res, ...prev.filter((h) => h.query !== res.query).slice(0, 5)]);
    } catch (err: any) {
      console.error('Failed to query atmospheric intelligence:', err);
      setError('Unable to reach AeroSense forecasting engine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleAsk(query);
  };

  const handlePresetClick = (presetQuery: string) => {
    setQuery(presetQuery);
    handleAsk(presetQuery);
  };

  const getConfidenceColor = (conf: number, level: string) => {
    if (conf >= 0.85 || level === 'HIGH') {
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      };
    }
    if (conf >= 0.72 || level === 'MODERATE') {
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      };
    }
    return {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      bar: 'bg-gradient-to-r from-rose-500 to-orange-400',
    };
  };

  const confColors = currentResponse
    ? getConfidenceColor(currentResponse.confidence, currentResponse.confidence_level)
    : getConfidenceColor(0.88, 'HIGH');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#0c111a] border border-white/[0.14] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner border border-sky-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Ask AeroSense Intelligence</h3>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 border border-sky-500/20 px-1.5 py-0.2 rounded font-medium">
                  Coupled Reasoning
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Multimodal Spatio-Temporal Forecasting & Physics Grounding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Query Input Section */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-white/[0.08] bg-[#090d14]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any forecast question: e.g. Why will pollution rise tonight?"
              className="w-full bg-[#05080c] border border-white/[0.12] focus:border-sky-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none pr-12 transition-all shadow-inner"
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Send className="w-3.5 h-3.5 text-sky-400" />
              )}
            </button>
          </div>

          {/* Quick Preset Questions */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              Suggested:
            </span>
            {[
              'Why is pollution expected to worsen tomorrow?',
              'How strong is the current thermal inversion?',
              'Are stubble fires impacting Delhi right now?',
              'What is the 24h PM2.5 forecast for Anand Vihar?',
            ].map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePresetClick(preset)}
                disabled={loading}
                className="text-[11px] text-slate-300 hover:text-sky-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-2 py-0.8 rounded-md transition-colors disabled:opacity-50 text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Content & Response Scroll Area */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs max-h-[500px]">
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-sky-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  Synthesizing Coupled Atmospheric Telemetry...
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Grounding IMD Weather • 40 CAAQMS Stations • NASA FIRMS • GNN-Transformer
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-rose-300 font-medium">{error}</p>
                <button
                  onClick={() => handleAsk(query)}
                  className="text-[11px] text-sky-400 hover:underline font-mono"
                >
                  Retry query
                </button>
              </div>
            </div>
          )}

          {!loading && currentResponse && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Query Pill */}
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
                    User Query
                  </span>
                  <p className="text-slate-100 font-medium text-xs">{currentResponse.query}</p>
                </div>
                {currentResponse.station_name && (
                  <span className="text-[10px] font-mono bg-white/[0.06] text-slate-300 px-2 py-0.5 rounded border border-white/[0.08]">
                    {currentResponse.station_name.split(',')[0]}
                  </span>
                )}
              </div>

              {/* Operational Assessment Card */}
              <div className="p-4 bg-gradient-to-b from-sky-500/[0.06] to-transparent border border-sky-500/20 rounded-xl space-y-3.5 shadow-lg">
                {/* Confidence Bar Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-sky-300 text-xs tracking-wide">
                      Operational Atmospheric Assessment
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${confColors.badge}`}
                    >
                      {Math.round(currentResponse.confidence * 100)}% Confidence • {currentResponse.confidence_level}
                    </span>
                  </div>
                </div>

                {/* Progress bar visual for confidence */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${confColors.bar} transition-all duration-700`}
                      style={{ width: `${Math.round(currentResponse.confidence * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Uncertain (50%)</span>
                    <span>Expected Range</span>
                    <span>High Fidelity (98%)</span>
                  </div>
                </div>

                {/* Assessment Body */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Coupled Physical Dynamics:
                  </span>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {currentResponse.assessment}
                  </p>
                </div>

                {/* Trajectory Box */}
                <div className="p-3 bg-black/40 border border-white/[0.06] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-sky-300 font-semibold tracking-wider">
                      Forecast Trajectory & Progression:
                    </span>
                    {currentResponse.predicted_pm25 && (
                      <span className="text-[11px] font-mono font-bold text-amber-300">
                        PM2.5: ~{Math.round(currentResponse.predicted_pm25)} µg/m³
                        {currentResponse.predicted_category && ` (${currentResponse.predicted_category})`}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {currentResponse.forecast_trajectory}
                  </p>
                </div>

                {/* Physical Drivers Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                  <div className="p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-sky-400" />
                      Primary Physical Driver
                    </span>
                    <span className="text-slate-100 font-medium text-xs">
                      {currentResponse.primary_driver}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-teal-400" />
                      Ventilation & Inversion
                    </span>
                    <span className="text-slate-100 font-medium text-xs">
                      {currentResponse.ventilation_status} ({Math.round(currentResponse.ventilation_index).toLocaleString()} m²/s) • Inv: {Math.round(currentResponse.inversion_risk)}/100
                    </span>
                  </div>
                </div>

                {/* Confidence Drivers Details */}
                {currentResponse.confidence_drivers?.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                    <div
                      onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
                      className="flex items-center justify-between cursor-pointer text-[10px] font-mono text-slate-400 hover:text-slate-200"
                    >
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-sky-400" />
                        Confidence Calibration Evidence ({currentResponse.confidence_drivers.length} factors)
                      </span>
                      <span>{showConfidenceDetails ? '▲ Hide' : '▼ View'}</span>
                    </div>

                    {showConfidenceDetails && (
                      <ul className="space-y-1 pl-1">
                        {currentResponse.confidence_drivers.map((driver, idx) => (
                          <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                            <span>{driver}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Suggested Actions */}
                {currentResponse.suggested_actions?.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 block font-semibold">
                      Recommended Mitigations & Advisories:
                    </span>
                    <div className="space-y-1">
                      {currentResponse.suggested_actions.map((act, i) => (
                        <div key={i} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence & Active Model Footer */}
                <div className="pt-3 border-t border-white/[0.08] text-[10px] font-mono text-slate-400 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-slate-500">Evidence:</span>
                    <span>{currentResponse.evidence_sources?.join(' • ') || 'CPCB • IMD • NASA FIRMS'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    <Cpu className="w-3 h-3" />
                    <span>Model: {currentResponse.model_name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !currentResponse && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] mx-auto flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6 text-sky-400/70" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <p className="text-xs text-slate-300 font-medium">
                  Ask any atmospheric or air quality forecast question
                </p>
                <p className="text-[11px] text-slate-500">
                  Type custom questions or click suggested topics above to receive grounded physical reasoning, diurnal trajectories, and calibrated confidence scores.
                </p>
              </div>
            </div>
          )}

          {/* Previous Questions in session */}
          {history.length > 1 && !loading && (
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                <History className="w-3 h-3" /> Recent Queries in Session
              </span>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(h.query);
                      setCurrentResponse(h);
                    }}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                      currentResponse?.query === h.query
                        ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                        : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    {h.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

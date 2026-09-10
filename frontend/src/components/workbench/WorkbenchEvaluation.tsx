'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { EvaluationBenchmarkResponse } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BarChart3, Award, AlertTriangle } from 'lucide-react';

export default function WorkbenchEvaluation() {
  const [data, setData] = useState<EvaluationBenchmarkResponse | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('gnn_transformer_proposed');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBenchmark() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await api.getModelComparison();
        setData(res);
        setSelectedModelId(res.selected_model_id || 'proposed_gnn_transformer');
      } catch (err) {
        console.error('Failed to load benchmark:', err);
        setErrorMsg('Evaluation API unavailable. Check the backend and benchmark file.');
      } finally {
        setLoading(false);
      }
    }
    loadBenchmark();
  }, []);

  const handleSelectModel = async (modelId: string) => {
    try {
      setActivating(true);
      const res = await api.selectActiveModel(modelId);
      setSelectedModelId(res.selected_model_id);
      setStatusMsg(`Active operational model switched to: ${res.model_name}`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      console.error('Failed to select model:', err);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-xs font-mono text-slate-500 animate-pulse">
        Loading research benchmark metrics from model registry...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-[#06090e]">
        <div className="border border-rose-500/30 bg-rose-950/20 p-5 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-rose-300" />
          <p className="mt-3 text-sm text-rose-200">{errorMsg || 'No evaluation benchmark data available.'}</p>
          <button onClick={() => window.location.reload()} className="mt-4 border border-rose-300/30 px-3 py-2 text-xs text-rose-100">Retry evaluation</button>
        </div>
      </div>
    );
  }

  // Transform horizon metrics for comparison chart
  const horizonChartData = [6, 12, 24, 48, 72].map((h) => {
    const row: Record<string, string | number | null> = { horizon: `+${h}h` };
    data.models.forEach((m) => {
      const metric = m.horizon_metrics.find((hm) => hm.horizon_hours === h);
      row[m.model_id] = metric ? metric.mae : null;
    });
    return row;
  });

  const overallChartData = data.models.map((m) => ({
    name: m.model_name,
    mae: m.metrics_overall.mae,
    rmse: m.metrics_overall.rmse,
    r2: m.metrics_overall.r2,
  }));

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#06090e]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Scientific Model Evaluation & Benchmark
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Strict Chronological Split (Train/Val/Test)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Comparative performance of Baseline A (XGBoost), Baseline B (LSTM/GRU), and Proposed Spatio-Temporal GNN-Transformer
          </p>
        </div>

        {statusMsg && (
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded">
            {statusMsg}
          </span>
        )}
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {data.models.map((m) => {
          const isSelected = m.model_id === selectedModelId;
          const isProposed = m.model_id === 'proposed_gnn_transformer';

          return (
            <div
              key={m.model_id}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-sky-500/[0.04] border-sky-500/40 shadow-[0_0_25px_rgba(56,189,248,0.1)]'
                  : 'bg-[#0c111a] border-white/[0.08] hover:border-white/[0.14]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                    {m.version}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Active Production
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                  {m.model_name}
                  {isProposed && <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">Research Model</span>}
                </h3>
                <p className="text-[11px] text-slate-400 leading-snug">{m.parameters}</p>

                {/* Score Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/[0.06] text-center font-mono">
                  <div className="p-2 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-500 block">MAE</span>
                    <span className="text-sm font-bold text-white">{m.metrics_overall.mae.toFixed(1)}</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-500 block">RMSE</span>
                    <span className="text-sm font-bold text-slate-300">{m.metrics_overall.rmse.toFixed(1)}</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02]">
                    <span className="text-[10px] text-slate-500 block">R²</span>
                    <span className="text-sm font-bold text-sky-400">{m.metrics_overall.r2.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              <button
                disabled={isSelected || activating}
                onClick={() => handleSelectModel(m.model_id)}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 cursor-default'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08]'
                }`}
              >
                {isSelected ? '✓ Selected Operational Model' : 'Select for Production'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizon Degradation Chart */}
        <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1">
            Horizon-Wise Error Degradation (MAE vs Horizon)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Shows how forecast error compounds over 6h, 12h, 24h, 48h, and 72h horizons
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horizonChartData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="horizon" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" µg" />
                <Tooltip contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                <Line type="monotone" dataKey="baseline_xgboost" name="XGBoost (A)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="baseline_lstm_gru" name="LSTM/GRU (B)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="proposed_gnn_transformer" name="GNN-Transformer" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Error Comparison Bar Chart */}
        <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1">
            Aggregate Error Comparison (MAE & RMSE)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Lower is better. Proposed GNN-Transformer achieves superior accuracy through wind-aware advection
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallChartData} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} unit=" µg" />
                <Tooltip contentStyle={{ backgroundColor: '#070b12', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                <Bar dataKey="mae" name="MAE (µg/m³)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rmse" name="RMSE (µg/m³)" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Provenance */}
      <div className="p-4 rounded-xl bg-[#0c111a] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-4">
        <div>
          Validation Protocol: <span className="text-white">Strict Chronological (No Lookahead Bias)</span>
        </div>
        <div>
          Split: <span className="text-sky-400">{data.dataset_split.train_ratio * 100}% Train / {data.dataset_split.val_ratio * 100}% Val / {data.dataset_split.test_ratio * 100}% Test</span>
        </div>
        <div>
          Evaluation Samples: <span className="text-white">{data.dataset_split.total_hours.toLocaleString()} Hourly Frames</span>
        </div>
      </div>
    </div>
  );
}

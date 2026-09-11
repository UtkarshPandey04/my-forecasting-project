'use client';

import React from 'react';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import AtmosphericCanvas from '@/components/landing/AtmosphericCanvas';
import PipelineFlow from '@/components/landing/PipelineFlow';
import WhatIfInteractivePreview from '@/components/landing/WhatIfInteractivePreview';
import IllustrativeForecastChart from '@/components/landing/IllustrativeForecastChart';
import {
  ArrowRight,
  ArrowUpRight,
  Wind,
  Layers,
  Flame,
  CloudRain,
  Share2,
  Cpu,
  ShieldCheck,
  Compass,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-200">
      <LandingNav />

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-grid-pattern bg-radial-fade">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>SIH26082 • Delhi NCR Coupled Atmospheric Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Forecast the air. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-300">
                Understand the atmosphere.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              AeroSense couples air-quality observations, meteorology, regional transport, and physics-guided AI to forecast Delhi NCR air quality up to 72 hours ahead.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/workbench"
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-all shadow-[0_0_25px_rgba(56,189,248,0.3)] hover:shadow-[0_0_35px_rgba(56,189,248,0.45)]"
              >
                <span>Open Live Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="https://github.com/UtkarshPandey04/my-forecasting-project"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all bg-white/[0.02] hover:bg-white/[0.05]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>View on GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>

            {/* Micro Story Flow */}
            <div className="pt-6 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-400 flex-wrap">
              <span className="text-slate-300">CPCB + IMD + FIRMS</span>
              <span>→</span>
              <span className="text-sky-400">Data Fusion</span>
              <span>→</span>
              <span className="text-amber-400">Atmospheric Regime</span>
              <span>→</span>
              <span className="text-purple-400">AI + Physics</span>
              <span>→</span>
              <span className="text-emerald-400">72h Forecast</span>
            </div>
          </div>

          {/* Hero Atmospheric Visual */}
          <div className="lg:col-span-6">
            <AtmosphericCanvas />
          </div>
        </div>
      </section>

      {/* ── SECTION 1: THE PROBLEM ── */}
      <section id="product" className="py-24 border-t border-white/[0.06] bg-[#080d16]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              The Atmospheric Problem
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Delhi’s air is not driven by pollution alone.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-4">
              A pure statistical model reading historical PM2.5 fails whenever cold winter air traps smoke near the ground or strong breezes sweep it away. Delhi NCR’s air quality is governed by coupled meteorological forcing.
            </p>
          </div>

          {/* Atmospheric Split Diagram */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Surface Emissions', desc: 'Vehicular, industrial, dust', icon: Activity, accent: '#ef4444' },
              { label: 'Wind Advection', desc: 'Direction & speed dilution', icon: Wind, accent: '#38bdf8' },
              { label: 'Thermal Profile', desc: 'Diurnal cooling & heating', icon: Flame, accent: '#f59e0b' },
              { label: 'Relative Humidity', desc: 'Aerosol hygroscopic growth', icon: CloudRain, accent: '#60a5fa' },
              { label: 'Boundary Inversion', desc: 'PBLH compression trapping', icon: Layers, accent: '#a855f7' },
              { label: 'Regional Transport', desc: 'Upstream biomass plume', icon: Compass, accent: '#f97316' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#0c111a] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between h-36 hover:border-white/[0.14] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${item.accent}15`, color: item.accent }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white leading-snug">{item.label}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-sky-500/[0.04] border border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-sky-200">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Six coupled physical processes integrated into one unified mathematical forecasting state.
            </span>
            <span className="text-slate-400">dC/dt = -u·∇C + ∇·(K∇C) + S - D + R</span>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: THE DIFFERENCE ── */}
      <section className="py-24 border-t border-white/[0.06] bg-[#06090e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              The Architecture Difference
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Most systems forecast the number. <br />
              AeroSense explains the conditions behind it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Traditional Systems */}
            <div className="bg-[#0c111a] border border-white/[0.06] rounded-xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-400 uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Traditional Statistical / Generic AI</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Black-Box Time-Series Extrapolation
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Treats Delhi air as isolated autoregressive values without meteorology.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Cannot predict sudden inversions or unexpected rain washout episodes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Provides no physical reasoning — authorities cannot explain the forecast to citizens.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Zero counterfactual capability — cannot evaluate "What if stubble fires drop by 50%?"</span>
                </li>
              </ul>
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg text-xs font-mono text-slate-500">
                Past PM2.5 → Generic Model → Next PM2.5 (No explainability)
              </div>
            </div>

            {/* AeroSense Approach */}
            <div className="bg-[#0c111a] border border-sky-500/30 rounded-xl p-6 md:p-8 space-y-6 shadow-[0_0_40px_rgba(56,189,248,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>AeroSense Physics-Guided Architecture</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Coupled Atmospheric & Transport Intelligence
              </h3>
              <ul className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>Station graph modulated by real-time wind vectors for genuine physical advection.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>Atmospheric Regime Engine explicitly identifies thermal inversion & stagnation risks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>Eulerian WRF-Chem numerical chemistry blended with AI residual bias correction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>Interactive What-If Decision Lab for policy sensitivity and emergency contingency.</span>
                </li>
              </ul>
              <div className="p-3 bg-sky-500/[0.06] border border-sky-500/20 rounded-lg text-xs font-mono text-sky-300">
                CAAQMS + IMD + FIRMS → Regime + GNN-Transformer + WRF-Chem → 72h Blended + Explainability
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.06] bg-[#080d16]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              End-to-End Operational Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Seven stages from ground telemetry to decision support.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
              Scroll through the scientific pipeline that powers AeroSense’s 72-hour operational forecasts.
            </p>
          </div>

          <PipelineFlow />
        </div>
      </section>

      {/* ── SECTION 4: WHY THE FORECAST CHANGES ── */}
      <section className="py-24 border-t border-white/[0.06] bg-[#06090e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Atmospheric Dynamics
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Why the forecast changes: three physical drivers.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
              Pollution surges in Delhi NCR are not random. They stem from predictable transitions between physical atmospheric regimes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Story 1 */}
            <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  1. Strong Thermal Inversion
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  During clear winter nights, rapid radiative ground cooling creates a warmer layer of air aloft. This acts as a lid, compressing the planetary boundary layer below 300 meters and trapping pollutants near ground level.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-rose-400">
                PBLH &lt; 350m • Inversion Risk &gt; 70/100
              </div>
            </div>

            {/* Story 2 */}
            <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                  <Wind className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  2. Weak Winds & Stagnation
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When surface wind speeds drop below 1.5 m/s, atmospheric ventilation collapses. Local emissions from traffic, generators, and industries pool inside city sectors without horizontal dispersion.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-amber-400">
                Ventilation &lt; 2,500 m²/s • Stagnation Index &gt; 65
              </div>
            </div>

            {/* Story 3 */}
            <div className="bg-[#0c111a] border border-white/[0.08] rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mb-4">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  3. Regional Fire Transport
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When North-Westerly winds align with intensive post-monsoon agricultural residue burning in Punjab and Haryana, a massive transboundary smoke plume travels downwind directly into the Delhi NCR basin.
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-[11px] font-mono text-orange-400">
                Bearing: 300°–320° • Transit Time: 12–18 Hours
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: 72-HOUR FORECAST ── */}
      <section className="py-24 border-t border-white/[0.06] bg-[#080d16]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Trajectory Forecasting
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Multi-horizon projections with boundary-layer uncertainty.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
              AeroSense outputs continuous 6h, 12h, 24h, 48h, and 72h forecasts with physical confidence bounds instead of deceptive single-number precision.
            </p>
          </div>

          <IllustrativeForecastChart />
        </div>
      </section>

      {/* ── SECTION 6: WHAT-IF LAB PREVIEW ── */}
      <section className="py-24 border-t border-white/[0.06] bg-[#06090e]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Decision Support
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              What-If Lab: test policy and weather counterfactuals.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
              Simulate the atmospheric response to controlled perturbations in wind speed, rain washout, and agricultural burning abatement.
            </p>
          </div>

          <WhatIfInteractivePreview />
        </div>
      </section>

      {/* ── SECTION 7: RESEARCH & TECHNOLOGY ── */}
      <section id="technology" className="py-24 border-t border-white/[0.06] bg-[#080d16]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Technology & Research
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
              Under the hood: six foundational research pillars.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3">
              Bridging modern deep learning with atmospheric physics and numerical weather prediction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Wind-Aware Spatial GNN',
                desc: 'Modulates graph edge weights using wind direction dot products. Upwind neighbors exert stronger physical advective influence.',
                tag: 'Graph Neural Networks',
                icon: Share2,
              },
              {
                title: 'Temporal Attention Transformer',
                desc: 'Multi-head temporal self-attention captures non-linear diurnal dependencies and multi-day synoptic weather wave patterns.',
                tag: 'Deep Sequence Modeling',
                icon: Cpu,
              },
              {
                title: 'Atmospheric Regime Engine',
                desc: 'Rule-based atmospheric physics classifier diagnosing Stagnation, Inversion, High Ventilation, or Regional Transport in real time.',
                tag: 'Physical Meteorology',
                icon: Layers,
              },
              {
                title: 'WRF-Chem NetCDF Integration',
                desc: 'Ingests numerical chemistry transport simulation grids (RADM2-MADE/SORGAM) directly from standard NetCDF outputs.',
                tag: 'Numerical Chemistry',
                icon: ShieldCheck,
              },
              {
                title: 'Physics-AI Residual Correction',
                desc: 'Learns systematic boundary layer nocturnal under-predictions and blends numerical chemistry with empirical correction.',
                tag: 'Residual Learning',
                icon: Activity,
              },
              {
                title: 'Fire Transport Intelligence',
                desc: 'Extracts real-time thermal fire radiative power from NASA FIRMS and projects estimated smoke transit corridors into NCR.',
                tag: 'Satellite Remote Sensing',
                icon: Flame,
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#0c111a] border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-6 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                        {card.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ── */}
      <section className="py-28 border-t border-white/[0.06] bg-[#06090e] relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-6">
          <span className="text-xs font-mono uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-full">
            Ready for Operation
          </span>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            From prediction to preparedness.
          </h2>

          <p className="text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Access the live forecasting console, inspect real-time Delhi NCR CAAQMS observations, evaluate research models, and simulate What-If atmospheric scenarios.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/workbench"
              className="flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-all shadow-[0_0_30px_rgba(56,189,248,0.35)]"
            >
              <span>Open Live Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="https://github.com/UtkarshPandey04/my-forecasting-project"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all bg-white/[0.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub Repository</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/[0.06] bg-[#04060a] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white tracking-tight text-sm">AeroSense</span>
            </div>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span>Delhi NCR Air Intelligence & Coupled Weather Forecasting</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 font-mono text-[11px]">
            <span>SIH26082</span>
            <span>Ministry of Earth Sciences</span>
            <a
              href="https://github.com/UtkarshPandey04/my-forecasting-project"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white flex items-center gap-1"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

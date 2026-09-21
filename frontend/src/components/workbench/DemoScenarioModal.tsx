'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Leaf,
  Sparkles,
  Truck,
  Recycle,
  FileCheck,
  ChevronRight,
  ShieldAlert,
  Compass,
  Coins,
  Factory
} from 'lucide-react';
import { WorkbenchView } from './WorkbenchSidebar';


export interface DemoStep {
  key: string;
  scenario: string;
  title: string;
  description: string;
  targetView: WorkbenchView;
  icon: React.ElementType;
  color: string;
  actionLabel: string;
  narrative: string;
  simulatedState: {
    stationId: string;
    aqi: number;
    pm25: number;
    riskScore: number;
    incidentStatus: string;
    circularStatus: string;
  };
}

export const DEMO_SCENARIOS: DemoStep[] = [
  {
    key: 'A',
    scenario: 'SCENARIO A',
    title: 'Normal Air Quality Baseline',
    description: 'Delhi airshed within acceptable seasonal baseline under brisk westerly ventilation.',
    targetView: 'overview',
    icon: Leaf,
    color: 'text-emerald-400',
    actionLabel: 'Load Baseline State',
    narrative: 'AeroSense monitors 40+ Delhi-NCR stations. Wind speed is 4.5 m/s, boundary layer height is 1,200m. Compound risk is LOW (18/100).',
    simulatedState: { stationId: 'anand_vihar', aqi: 88, pm25: 36.2, riskScore: 18, incidentStatus: 'NONE', circularStatus: 'MONITORING' }
  },
  {
    key: 'B',
    scenario: 'SCENARIO B',
    title: 'Pollution Increasing & Stagnation',
    description: 'Evening temperature inversion sets in with decreasing surface wind speeds.',
    targetView: 'forecast',
    icon: Compass,
    color: 'text-amber-400',
    actionLabel: 'Simulate Inversion Trend',
    narrative: 'Ventilation coefficient drops below 1,600 m²/s. WRF-Chem atmospheric model forecasts nocturnal particulate trapping.',
    simulatedState: { stationId: 'anand_vihar', aqi: 195, pm25: 84.0, riskScore: 62, incidentStatus: 'ADVISORY_ISSUED', circularStatus: 'STANDBY' }
  },
  {
    key: 'C',
    scenario: 'SCENARIO C',
    title: 'Critical Pollution Episode Detected',
    description: 'Severe PM2.5 spike at Anand Vihar airshed combined with transboundary stubble smoke advection.',
    targetView: 'incident-command',
    icon: AlertTriangle,
    color: 'text-red-400',
    actionLabel: 'Trigger Critical Anomaly',
    narrative: 'PM2.5 reaches 198.5 µg/m³, AQI rises to 312. Multi-hazard risk engine calculates compound risk at 94.2/100 (CRITICAL).',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'DETECTED', circularStatus: 'ALERT_TRIGGERED' }
  },
  {
    key: 'D',
    scenario: 'SCENARIO D',
    title: 'Automated Incident Creation',
    description: 'System automatically spawns incident INC-DL-2026-081 in Incident Command Center.',
    targetView: 'incident-command',
    icon: ShieldAlert,
    color: 'text-rose-400',
    actionLabel: 'Inspect Incident Docket',
    narrative: 'Incident command docket generated with timestamp, CPCB telemetry, meteorological trapping evidence, and required response workflows.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'RESPONSE_REQUIRED', circularStatus: 'ALERT_TRIGGERED' }
  },
  {
    key: 'E',
    scenario: 'SCENARIO E',
    title: 'AI Physics & Source Explanation',
    description: 'AeroSense explains the root cause: 42% Stubble Smoke Advection + 28% Traffic Congestion + Nocturnal Inversion.',
    targetView: 'drivers',
    icon: Sparkles,
    color: 'text-purple-400',
    actionLabel: 'Review Source Attribution',
    narrative: 'Explainable AI layer verifies transboundary smoke advection along Sangrur corridor while distinguishing potential contributing sources with scientific honesty.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'RESPONSE_REQUIRED', circularStatus: 'ALERT_TRIGGERED' }
  },
  {
    key: 'F',
    scenario: 'SCENARIO F',
    title: 'Circular Prevention Opportunity Detected',
    description: 'Instead of passive alerts, system detects 2,840 tons of ready crop residue in upwind districts.',
    targetView: 'incident-command',
    icon: Recycle,
    color: 'text-emerald-400',
    actionLabel: 'Unlock Circular Opportunity',
    narrative: 'Circular response recommendation links critical air quality emergency directly to nearby agricultural biomass off-takers in Meerut & Bulandshahr.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'RESPONSE_REQUIRED', circularStatus: 'OPPORTUNITY_OPEN' }
  },
  {
    key: 'G',
    scenario: 'SCENARIO G',
    title: 'Farmer Residue Listing Published',
    description: 'Farmer Gurpreet Singh in Meerut lists 8.5 tonnes of Paddy Straw for ₹2,200/tonne.',
    targetView: 'circular',
    icon: Leaf,
    color: 'text-emerald-300',
    actionLabel: 'Open Farmer Portal',
    narrative: 'Listing LST-MEERUT-01 is published with moisture (11.5%) and harvest date. Status: Available for Processing.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'IN_PROGRESS', circularStatus: 'LISTED' }
  },
  {
    key: 'H',
    scenario: 'SCENARIO H',
    title: 'Smart Processor Match Generated',
    description: 'Matching engine connects Meerut farmer with GreenBio Energy CBG Corp (92.4% Compatibility).',
    targetView: 'circular',
    icon: Sparkles,
    color: 'text-sky-400',
    actionLabel: 'View Smart Match',
    narrative: 'Economic breakdown: Farmer earns ₹18,700, transport costs ₹2,650, processor creates ₹30,855 in green gas value, platform earns ₹655 fee.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'IN_PROGRESS', circularStatus: 'MATCHED' }
  },
  {
    key: 'I',
    scenario: 'SCENARIO I',
    title: 'Transport Collection Scheduled',
    description: 'Logistics fleet assigned: 12-tonne baling truck dispatched via Eastern Peripheral Expressway.',
    targetView: 'circular',
    icon: Truck,
    color: 'text-amber-400',
    actionLabel: 'Track Collection Truck',
    narrative: 'Transport order TRP-NCR-991 locked in status: IN_TRANSIT with live GPS waypoint tracking and verified weighbridge ETA.',
    simulatedState: { stationId: 'anand_vihar', aqi: 312, pm25: 198.5, riskScore: 94.2, incidentStatus: 'IN_PROGRESS', circularStatus: 'IN_TRANSIT' }
  },
  {
    key: 'J',
    scenario: 'SCENARIO J',
    title: 'Residue Delivered & Processed',
    description: '8.5 tonnes unloaded into CBG bio-digester instead of open-field burning.',
    targetView: 'circular',
    icon: Factory,
    color: 'text-purple-400',
    actionLabel: 'Confirm Processing',
    narrative: 'Order marked PROCESSED. Clean bio-CNG output replaces fossil fuel; bio-slurry returned to soil as organic fertilizer.',
    simulatedState: { stationId: 'anand_vihar', aqi: 245, pm25: 122.0, riskScore: 68, incidentStatus: 'MONITORING', circularStatus: 'PROCESSED' }
  },
  {
    key: 'K',
    scenario: 'SCENARIO K',
    title: 'Pollution-Prevention Impact Recorded',
    description: 'Audited environmental balance: 32.7 kg PM2.5 prevented + 12.4 tonnes CO₂e avoided.',
    targetView: 'circular',
    icon: Coins,
    color: 'text-emerald-400',
    actionLabel: 'Inspect Impact Dossier',
    narrative: 'Cumulative platform impact reaches 1,284 tonnes diverted, ₹29.2 Lakhs in farmer earnings, and ₹1.63 Lakhs in platform revenue.',
    simulatedState: { stationId: 'anand_vihar', aqi: 185, pm25: 78.0, riskScore: 46, incidentStatus: 'MONITORING', circularStatus: 'IMPACT_RECORDED' }
  },
  {
    key: 'L',
    scenario: 'SCENARIO L',
    title: 'Air Quality Restored & Incident Resolved',
    description: 'Airshed returns to safe thresholds. Incident INC-DL-2026-081 formally marked RESOLVED.',
    targetView: 'incident-command',
    icon: FileCheck,
    color: 'text-cyan-400',
    actionLabel: 'Review Resolved Incident',
    narrative: 'Full end-to-end incident lifecycle successfully completed. Audit timeline preserves all emergency deployments and circular interventions.',
    simulatedState: { stationId: 'anand_vihar', aqi: 110, pm25: 44.0, riskScore: 28, incidentStatus: 'RESOLVED', circularStatus: 'RESOLVED' }
  },
];

interface DemoScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onApplyScenario: (step: DemoStep) => void;
}

export default function DemoScenarioModal({
  isOpen,
  onClose,
  currentStepIndex,
  onSelectStep,
  onApplyScenario
}: DemoScenarioModalProps) {
  if (!isOpen) return null;

  const currentStep = DEMO_SCENARIOS[currentStepIndex] || DEMO_SCENARIOS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b121c] border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="border-b border-white/[0.1] bg-gradient-to-r from-[#091522] via-[#0d1f30] to-[#091522] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Play className="w-4 h-4 fill-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  AEROSENSE GUIDED DEMO CONTROLLER
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
                  DEMO / SIMULATION DATA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                12-Step interactive narrative from pollution crisis to circular monetization and emission prevention.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg"
          >
            ✕ Close
          </button>
        </div>

        {/* Mobile Horizontal Step Bar (md:hidden) */}
        <div className="md:hidden border-b border-white/[0.08] bg-[#070c14] px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold shrink-0 mr-1">Steps:</span>
          {DEMO_SCENARIOS.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.key}
                onClick={() => {
                  onSelectStep(idx);
                  onApplyScenario(step);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-cyan-500/25 border border-cyan-400 text-white shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                  isCurrent ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-white/[0.08] text-slate-300'
                }`}>
                  {step.key}
                </span>
                <span className="truncate max-w-[80px] text-[11px]">{step.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Body: Split View (Step Selector Left Desktop + Deep Dive Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] overflow-hidden min-h-0">
          {/* Step Timeline Navigation Rail (Desktop Only) */}
          <div className="hidden md:block border-r border-white/[0.08] bg-[#070c14] overflow-y-auto p-3 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block px-2 py-1">
              Select Demo Scenario (A – L)
            </span>
            {DEMO_SCENARIOS.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = idx === currentStepIndex;
              return (
                <button
                  key={step.key}
                  onClick={() => {
                    onSelectStep(idx);
                    onApplyScenario(step);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                    isCurrent
                      ? 'bg-cyan-500/20 border border-cyan-400/40 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-cyan-400 text-slate-950' : 'bg-white/[0.06] text-slate-400'
                  }`}>
                    <span className="font-mono text-[10px] font-bold">{step.key}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[11px] font-semibold">{step.title}</div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">{step.scenario}</div>
                  </div>
                  {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Scenario Details & Execution Panel */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-[#09101a] flex flex-col justify-between space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                    {currentStep.scenario} • Step {currentStepIndex + 1} of 12
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
                    {React.createElement(currentStep.icon, { className: `w-5 h-5 ${currentStep.color} shrink-0` })}
                    <span>{currentStep.title}</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Narrative Story Block */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 sm:p-4 text-xs">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                  Product Narrative & Business Story:
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">
                  {currentStep.narrative}
                </p>
              </div>

              {/* Simulated System Telemetry Badge Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center font-mono">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">Target Station</span>
                  <span className="text-xs font-bold text-white uppercase truncate block">{currentStep.simulatedState.stationId}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">Simulated AQI</span>
                  <span className="text-xs font-bold text-amber-400">{currentStep.simulatedState.aqi}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">PM2.5 (µg/m³)</span>
                  <span className="text-xs font-bold text-red-400">{currentStep.simulatedState.pm25}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">Compound Risk</span>
                  <span className="text-xs font-bold text-cyan-400">{currentStep.simulatedState.riskScore}/100</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">Incident Stage</span>
                  <span className="text-[10px] font-bold text-slate-300 truncate block">{currentStep.simulatedState.incidentStatus}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
                  <span className="text-[9px] text-slate-400 block">Circular State</span>
                  <span className="text-[10px] font-bold text-emerald-400 truncate block">{currentStep.simulatedState.circularStatus}</span>
                </div>
              </div>
            </div>

            {/* Stepper Controls */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  disabled={currentStepIndex === 0}
                  onClick={() => {
                    const nextIdx = Math.max(0, currentStepIndex - 1);
                    onSelectStep(nextIdx);
                    onApplyScenario(DEMO_SCENARIOS[nextIdx]);
                  }}
                  className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-medium text-slate-300"
                >
                  ← Previous
                </button>
                <button
                  disabled={currentStepIndex === DEMO_SCENARIOS.length - 1}
                  onClick={() => {
                    const nextIdx = Math.min(DEMO_SCENARIOS.length - 1, currentStepIndex + 1);
                    onSelectStep(nextIdx);
                    onApplyScenario(DEMO_SCENARIOS[nextIdx]);
                  }}
                  className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-medium text-slate-300 flex items-center gap-1"
                >
                  Next →
                </button>
              </div>

              <button
                onClick={() => {
                  onApplyScenario(currentStep);
                  onClose();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                <span>{currentStep.actionLabel} & Jump to {currentStep.targetView.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

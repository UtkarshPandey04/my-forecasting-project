'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Radio,
  RotateCcw
} from 'lucide-react';
import { DemoStep, DEMO_SCENARIOS } from './DemoScenarioModal';

interface DemoFloatingDockProps {
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onApplyScenario: (step: DemoStep) => void;
  onOpenModal: () => void;
  onExitDemo: () => void;
}

export default function DemoFloatingDock({
  currentStepIndex,
  onSelectStep,
  onApplyScenario,
  onOpenModal,
  onExitDemo
}: DemoFloatingDockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const STEP_DURATION_SEC = 8;
  const currentStep = DEMO_SCENARIOS[currentStepIndex] || DEMO_SCENARIOS[0];

  // Auto-Play Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      const stepIntervalMs = 100;
      const totalTicks = (STEP_DURATION_SEC * 1000) / stepIntervalMs;
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Advance to next step
            const nextIdx = (currentStepIndex + 1) % DEMO_SCENARIOS.length;
            onSelectStep(nextIdx);
            onApplyScenario(DEMO_SCENARIOS[nextIdx]);
            return 0;
          }
          return prev + (100 / totalTicks);
        });
      }, stepIntervalMs);
    } else {
      setProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStepIndex, onSelectStep, onApplyScenario]);

  const handlePrev = () => {
    setProgress(0);
    const prevIdx = currentStepIndex === 0 ? DEMO_SCENARIOS.length - 1 : currentStepIndex - 1;
    onSelectStep(prevIdx);
    onApplyScenario(DEMO_SCENARIOS[prevIdx]);
  };

  const handleNext = () => {
    setProgress(0);
    const nextIdx = (currentStepIndex + 1) % DEMO_SCENARIOS.length;
    onSelectStep(nextIdx);
    onApplyScenario(DEMO_SCENARIOS[nextIdx]);
  };

  return (
    <aside
      aria-label="Demo Controller Floating Dock"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-2xl"
    >
      <div className="bg-[#0b1320]/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300">
        {/* Progress bar for auto-tour */}
        {isPlaying && (
          <div className="w-full h-1 bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Scenario info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <span className="flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                  {currentStep.scenario} ({currentStepIndex + 1}/{DEMO_SCENARIOS.length})
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-slate-300 uppercase">
                  {currentStep.targetView.replace(/-/g, ' ')}
                </span>
              </div>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {currentStep.title}
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Prev */}
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
              title="Previous Scenario"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play / Pause Auto-Tour */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
              }`}
              title={isPlaying ? 'Pause Auto-Tour' : 'Start Auto-Tour'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto-Tour</span>
                </>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
              title="Next Scenario"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/[0.15] mx-1" />

            {/* Expand Modal */}
            <button
              onClick={onOpenModal}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
              title="Expand Scenario Dossier"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Exit Demo */}
            <button
              onClick={onExitDemo}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Exit Interactive Demo Mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

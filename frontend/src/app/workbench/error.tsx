'use client';

import React, { useEffect } from 'react';
import { RotateCw, ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AeroSense Workbench Error Boundary Caught]:', error);
  }, [error]);

  const handleFullReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/workbench?view=overview';
    } else {
      reset();
    }
  };

  return (
    <div className="h-screen w-screen bg-[#06090e] text-slate-100 flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-md w-full rounded-2xl border border-sky-500/25 bg-[#0b111a] p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-5 shadow-inner">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 font-semibold mb-1">
          AeroSense Telemetry Recovery
        </span>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Telemetry Synchronization Interruption
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          A client telemetry update or network transition encountered an interruption. Calibrated physics baselines remain intact. Click below to resynchronize live telemetry.
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reset Telemetry</span>
          </button>
          <button
            onClick={handleFullReload}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Airshed Overview</span>
          </button>
        </div>

        {error?.message && (
          <div className="mt-6 pt-4 border-t border-white/[0.06] w-full text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Diagnostic Details</span>
            <div className="text-[11px] font-mono text-rose-400 bg-black/40 p-2 rounded border border-rose-500/20 truncate">
              {error.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

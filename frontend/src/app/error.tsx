'use client';

import React, { useEffect } from 'react';
import { RotateCw, ShieldAlert, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AeroSense Root Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col items-center justify-center p-6 select-none">
      <div className="max-w-md w-full rounded-2xl border border-sky-500/25 bg-[#0b111a] p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-5 shadow-inner">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 font-semibold mb-1">
          AeroSense Intelligence
        </span>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Application Reconnection Required
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          An atmospheric feed or client state required a session reset. You can reconnect to the platform immediately.
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reconnect</span>
          </button>
          <a
            href="/workbench"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Workbench</span>
          </a>
        </div>
      </div>
    </div>
  );
}

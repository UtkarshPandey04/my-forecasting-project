'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  Search,
  Sparkles,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Database
} from 'lucide-react';
import ModeIndicator from '@/components/status/ModeIndicator';

interface WorkbenchHeaderProps {
  mode?: string;
  lastUpdated?: string | null;
  onOpenAskAgent?: () => void;
  onOpenDataSources?: () => void;
}

export default function WorkbenchHeader({
  mode = 'DEMO',
  lastUpdated,
  onOpenAskAgent,
  onOpenDataSources
}: WorkbenchHeaderProps) {
  const [syncTime, setSyncTime] = useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSyncTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-[#070b12] border-b border-white/[0.08] px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group" title="Return to AeroSense Landing">
          <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center p-0.5 group-hover:border-sky-400/50 transition-all">
            <Image
              src="/logo.png"
              alt="AeroSense Logo"
              width={22}
              height={22}
              className="object-contain"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            AeroSense
          </span>
        </Link>

        <span className="text-slate-600">/</span>

        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="font-semibold text-slate-200">Delhi NCR Airshed</span>
          <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            72h Coupled Forecast
          </span>
        </div>
      </div>

      {/* Center: Subtle "Ask AeroSense" Command Bar */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenAskAgent}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#0c111a] hover:bg-[#121824] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-400 hover:text-slate-200 transition-all w-80 justify-between shadow-xs"
        >
          <span className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Ask AeroSense: "Why will pollution rise?"</span>
          </span>
          <kbd className="text-[10px] font-mono bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry Status & External Controls */}
      <div className="flex items-center gap-4 text-xs">
        {/* Data Sources Status Button */}
        <button
          onClick={onOpenDataSources}
          className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title="Inspect CPCB, IMD, FIRMS & WRF-Chem sources"
        >
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>Data Sources</span>
        </button>

        {/* Timestamp */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400" title="Synchronized with current time">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{syncTime ? `Sync: ${syncTime}` : 'Sync: Live'}</span>
        </div>

        {/* Mode Indicator */}
        <ModeIndicator mode={mode} />
      </div>
    </header>
  );
}

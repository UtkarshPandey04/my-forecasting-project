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
  Database,
  Menu,
  X
} from 'lucide-react';
import ModeIndicator from '@/components/status/ModeIndicator';

interface WorkbenchHeaderProps {
  mode?: string;
  lastUpdated?: string | null;
  onOpenAskAgent?: () => void;
  onOpenDataSources?: () => void;
  onOpenDemo?: () => void;
  aqiStandard?: 'epa' | 'cpcb';
  onToggleAqiStandard?: (std: 'epa' | 'cpcb') => void;
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
}

export default function WorkbenchHeader({
  mode = 'DEMO',
  lastUpdated,
  onOpenAskAgent,
  onOpenDataSources,
  onOpenDemo,
  aqiStandard = 'epa',
  onToggleAqiStandard,
  onToggleMobileMenu,
  mobileMenuOpen = false
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
    <header className="h-14 bg-[#070b12] border-b border-white/[0.08] px-2.5 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Hamburger (Mobile) & Brand & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] active:scale-95 transition-all"
          title={mobileMenuOpen ? 'Close Navigation' : 'Open Navigation'}
        >
          {mobileMenuOpen ? <X className="w-4 h-4 text-sky-400" /> : <Menu className="w-4 h-4" />}
        </button>

        <Link href="/" className="flex items-center gap-2 group" title="Return to AeroSense Landing">
          <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center p-0.5 group-hover:border-sky-400/50 transition-all shrink-0">
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

        <span className="text-slate-600 hidden sm:inline">/</span>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
          <span className="font-semibold text-slate-200 truncate max-w-[120px] md:max-w-none">Delhi NCR Airshed</span>
          <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] hidden md:inline">
            72h Coupled Forecast
          </span>
        </div>
      </div>

      {/* Global AQI Standard Toggle Switcher */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#0c111a] p-0.5 sm:p-1 rounded-lg border border-white/[0.12] shadow-xs">
        <span className="text-[10px] uppercase font-mono text-slate-400 font-bold px-1.5 hidden md:inline">
          Standard:
        </span>
        <button
          onClick={() => onToggleAqiStandard?.('epa')}
          className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-mono font-bold tracking-wide transition-all ${
            aqiStandard === 'epa'
              ? 'bg-rose-500/30 text-rose-200 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="US EPA Standard (AirNow / aqicn.org scale)"
        >
          <span className="hidden sm:inline">US EPA (aqicn)</span>
          <span className="sm:hidden">EPA</span>
        </button>
        <button
          onClick={() => onToggleAqiStandard?.('cpcb')}
          className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-mono font-bold tracking-wide transition-all ${
            aqiStandard === 'cpcb'
              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Indian National Air Quality Index (CPCB NAQI scale)"
        >
          <span className="hidden sm:inline">CPCB NAQI</span>
          <span className="sm:hidden">NAQI</span>
        </button>
      </div>

      {/* Center: Subtle "Ask AeroSense" Command Bar */}
      <div className="hidden xl:flex items-center">
        <button
          onClick={onOpenAskAgent}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#0c111a] hover:bg-[#121824] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-400 hover:text-slate-200 transition-all w-72 justify-between shadow-xs"
        >
          <span className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Ask AeroSense: &quot;Why will pollution rise?&quot;</span>
          </span>
          <kbd className="text-[10px] font-mono bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry Status & External Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
        {/* Guided Demo Button */}
        {onOpenDemo && (
          <button
            onClick={onOpenDemo}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 border border-amber-400/50 text-amber-200 text-[11px] sm:text-xs font-bold font-mono rounded-lg transition-all shadow-xs active:scale-95"
            title="Launch 12-Step Interactive Demo (Scenarios A through L)"
          >
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">🎬 Run Guided Demo (A–L)</span>
            <span className="sm:hidden">🎬 Demo</span>
          </button>
        )}

        {/* Data Sources Status Button */}
        <button
          onClick={onOpenDataSources}
          className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title="Inspect CPCB, IMD, FIRMS & WRF-Chem sources"
        >
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Data Sources</span>
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


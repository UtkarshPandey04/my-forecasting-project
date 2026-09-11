'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import ModeIndicator from '../status/ModeIndicator';
import DataFreshnessStatus from '../status/DataFreshness';
import { LayoutDashboard, BarChart3, FlaskConical } from 'lucide-react';

export default function Header({
  mode = 'DEMO',
  lastUpdated
}: {
  mode?: string;
  lastUpdated?: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center p-1 group-hover:border-sky-400/50 transition-all">
            <Image
              src="/logo.png"
              alt="AeroSense Logo"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight text-slate-100 group-hover:text-sky-400 transition-colors">
              AeroSense
            </h1>
            <span className="text-[11px] text-slate-400">
              Delhi NCR Coupled Air Quality & Weather Forecasting
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              pathname === '/'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Live Console
          </Link>
          <Link
            href="/evaluation"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              pathname === '/evaluation'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Model Evaluation
          </Link>
          <Link
            href="/scenarios"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              pathname === '/scenarios'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            What-If Lab
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4 self-end sm:self-center">
        <ModeIndicator mode={mode} />
        <DataFreshnessStatus lastUpdated={lastUpdated || null} />
      </div>
    </header>
  );
}

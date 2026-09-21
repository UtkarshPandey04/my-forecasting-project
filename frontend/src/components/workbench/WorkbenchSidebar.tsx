'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Compass,
  FlaskConical,
  BarChart3,
  Database,
  FileText,
  Siren,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Recycle
} from 'lucide-react';

export type WorkbenchView =
  | 'overview'
  | 'forecast'
  | 'map'
  | 'drivers'
  | 'what-if'
  | 'circular'
  | 'incident-command'
  | 'response-console'
  | 'evaluation'
  | 'datasources'
  | 'research';

interface WorkbenchSidebarProps {
  currentView: WorkbenchView;
  onSelectView: (view: WorkbenchView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const NAV_ITEMS: { id: WorkbenchView; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Airshed Map', icon: MapPin },
  { id: 'forecast', label: '72h Forecast', icon: TrendingUp },
  { id: 'drivers', label: 'Attribution Drivers', icon: Compass },
  { id: 'what-if', label: 'What-If Lab', icon: FlaskConical },
  { id: 'circular', label: 'AeroSense Circular', icon: Recycle },
  { id: 'incident-command', label: 'Incident Command', icon: Siren },
  { id: 'response-console', label: 'Response Console', icon: Megaphone },
  { id: 'evaluation', label: 'Model Evaluation', icon: BarChart3 },
  { id: 'datasources', label: 'Data Sources', icon: Database },
  { id: 'research', label: 'Research Docs', icon: FileText },
];


export default function WorkbenchSidebar({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  className = ''
}: WorkbenchSidebarProps) {
  return (
    <aside
      className={`bg-[#070b12] border-r border-white/[0.08] flex flex-col justify-between transition-all duration-300 z-20 shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-[230px]'
      } ${className}`}
    >
      {/* Top Nav Items */}
      <div className="p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Toggle Rail Button */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

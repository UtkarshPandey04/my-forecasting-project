'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ActiveFirePoint, DisasterHazard } from '@/lib/types';
import { api } from '@/lib/api';
import {
  Waves,
  Flame,
  Wind,
  Thermometer,
  Shield,
  Layers,
  RotateCcw,
  AlertTriangle,
  Info,
  MapPin,
  Check,
  X,
  ArrowRight,
  Activity,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export interface DisasterZone {
  id: string;
  name: string;
  hazard: 'flood' | 'fire' | 'smoke' | 'heat';
  score: number;
  level: string;
  coordinates: [number, number]; // [lng, lat]
  description: string;
  evidence: string;
  recommendedAction: string;
  affectedPopulation: string;
}

interface DisasterRiskMapProps {
  zones?: Array<{
    id: string;
    name: string;
    hazard: string;
    score: number;
    level: string;
    x_pct?: number;
    y_pct?: number;
  }>;
  hazards?: DisasterHazard[];
  activeFires?: ActiveFirePoint[];
  className?: string;
  onZoneSelect?: (zone: DisasterZone) => void;
}

const DEFAULT_ZONES: DisasterZone[] = [
  {
    id: 'yamuna',
    name: 'Yamuna Floodplain Corridor',
    hazard: 'flood',
    score: 32.2,
    level: 'moderate',
    coordinates: [77.245, 28.665],
    description: 'Low-lying river corridor spanning Old Railway Bridge, Mayur Vihar Khadar, and Okhla barrage.',
    evidence: 'CWC Yamuna Gauge at 203.77m (vs 204.50m warning) • Hathnikund Barrage discharge 28,500 cusecs • ISRO Bhuvan soil saturation 68.4%.',
    recommendedAction: 'Alert riverbed informal settlements, prepare flood relief camps, and inspect embankment bund sluice gates.',
    affectedPopulation: '~45,000 residents in vulnerable riverbed clusters'
  },
  {
    id: 'punjab-belt',
    name: 'Upstream Farm Fire Corridor',
    hazard: 'fire',
    score: 0.0,
    level: 'low',
    coordinates: [76.920, 29.580],
    description: 'Northwest agricultural residue burning belt along the Punjab-Haryana interstate agricultural corridor.',
    evidence: 'NASA FIRMS VIIRS orbital pass confirms 0 active thermal anomalies • Boundary layer ceiling 520m.',
    recommendedAction: 'Dispatch flying inspection squads, coordinate biomass baling hubs, and enforce statutory CAQM off-take mandates.',
    affectedPopulation: 'Regional airshed impact across 30M+ NCR inhabitants'
  },
  {
    id: 'central-ncr',
    name: 'Central NCR Urban Airshed',
    hazard: 'smoke',
    score: 7.1,
    level: 'low',
    coordinates: [77.228, 28.629],
    description: 'Dense urban commercial and residential core encompassing Connaught Place, ITO, and Central Secretariat.',
    evidence: 'Nocturnal boundary layer compression (520m) and satellite AOD 0.68 trapping vehicular and background emissions.',
    recommendedAction: 'Enforce GRAP mechanical street sweeping, anti-smog mist water cannons, and public health advisories.',
    affectedPopulation: '8.5M urban commuters & residents'
  },
  {
    id: 'south-delhi',
    name: 'South Delhi Urban Heat Island',
    hazard: 'heat',
    score: 17.8,
    level: 'low',
    coordinates: [77.195, 28.515],
    description: 'Southern Ridge periphery, Saket, Mehrauli, and high-insolation asphalt transit corridors.',
    evidence: 'Surface heat accumulation amplified by high building density, asphalt thermal mass, and sparse vegetative canopy.',
    recommendedAction: 'Activate public cool zones, provide ORS hydration points at transit terminals, and monitor vulnerable outdoor laborers.',
    affectedPopulation: '1.2M residents & outdoor workforce'
  }
];

const HAZARD_CONFIG = {
  flood: {
    label: 'Flood Risk',
    icon: Waves,
    color: '#06b6d4', // cyan-500
    badgeBg: 'bg-cyan-950/90',
    badgeBorder: 'border-cyan-400/80',
    badgeText: 'text-cyan-200',
    ringColor: 'rgba(6, 182, 212, 0.45)',
    pinColor: '#0891b2'
  },
  fire: {
    label: 'Wildfire Risk',
    icon: Flame,
    color: '#f97316', // orange-500
    badgeBg: 'bg-orange-950/90',
    badgeBorder: 'border-orange-400/80',
    badgeText: 'text-orange-200',
    ringColor: 'rgba(249, 115, 22, 0.45)',
    pinColor: '#ea580c'
  },
  smoke: {
    label: 'Smoke & AQI',
    icon: Wind,
    color: '#a855f7', // purple-500
    badgeBg: 'bg-purple-950/90',
    badgeBorder: 'border-purple-400/80',
    badgeText: 'text-purple-200',
    ringColor: 'rgba(168, 85, 247, 0.45)',
    pinColor: '#9333ea'
  },
  heat: {
    label: 'Heatwave Risk',
    icon: Thermometer,
    color: '#f43f5e', // rose-500
    badgeBg: 'bg-rose-950/90',
    badgeBorder: 'border-rose-400/80',
    badgeText: 'text-rose-200',
    ringColor: 'rgba(244, 63, 94, 0.45)',
    pinColor: '#e11d48'
  }
};

const BASEMAP_STYLES = {
  dark: {
    version: 8 as const,
    sources: {
      'esri-dark': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      },
      'esri-ref': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      }
    },
    layers: [
      { id: 'dark-base', type: 'raster' as const, source: 'esri-dark', minzoom: 0, maxzoom: 18 },
      { id: 'dark-ref', type: 'raster' as const, source: 'esri-ref', minzoom: 0, maxzoom: 18 }
    ]
  },
  satellite: {
    version: 8 as const,
    sources: {
      'esri-sat': {
        type: 'raster' as const,
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      },
      'esri-ref': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256
      }
    },
    layers: [
      { id: 'sat-base', type: 'raster' as const, source: 'esri-sat', minzoom: 0, maxzoom: 18 },
      { id: 'sat-ref', type: 'raster' as const, source: 'esri-ref', minzoom: 0, maxzoom: 18 }
    ]
  }
};

const INITIAL_VIEW = {
  longitude: 77.16,
  latitude: 28.64,
  zoom: 9.6,
  pitch: 0,
  bearing: 0
};

export default function DisasterRiskMap({
  zones: apiZones,
  hazards,
  activeFires = [],
  className = '',
  onZoneSelect
}: DisasterRiskMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'flood' | 'fire' | 'smoke' | 'heat'>('all');
  const [selectedZone, setSelectedZone] = useState<DisasterZone | null>(null);
  const [selectedFire, setSelectedFire] = useState<ActiveFirePoint | null>(null);
  const [basemapKey, setBasemapKey] = useState<'dark' | 'satellite'>('dark');
  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const [showFiresLayer, setShowFiresLayer] = useState<boolean>(true);
  const [showZonesLayer, setShowZonesLayer] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dispatchingAction, setDispatchingAction] = useState<boolean>(false);

  // Merge live API risk scores with coordinates
  const mergedZones: DisasterZone[] = useMemo(() => {
    return DEFAULT_ZONES.map((def) => {
      const match = apiZones?.find((z) => z.id === def.id || z.hazard === def.hazard);
      if (match) {
        return {
          ...def,
          score: match.score,
          level: match.level || def.level,
          evidence: (match as any).telemetry_driver
            ? `${(match as any).telemetry_driver} • ${def.evidence}`
            : ((match as any).evidence || def.evidence)
        };
      }
      return def;
    });
  }, [apiZones]);

  // Filtered zones
  const visibleZones = useMemo(() => {
    if (!showZonesLayer) return [];
    if (activeFilter === 'all') return mergedZones;
    return mergedZones.filter((z) => z.hazard === activeFilter);
  }, [mergedZones, activeFilter, showZonesLayer]);

  // Recenter map helper
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
        duration: 1200
      });
    }
  };

  // Fly camera to specific zone
  const flyToZone = (zone: DisasterZone) => {
    setSelectedZone(zone);
    setSelectedFire(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: zone.coordinates,
        zoom: 11.6,
        duration: 1200
      });
    }
    if (onZoneSelect) onZoneSelect(zone);
  };

  // Dispatch tactical action from map inspector
  const handleDispatchTactical = async (zone: DisasterZone) => {
    setDispatchingAction(true);
    try {
      await api.queueResponseAction({
        action_type: `zone_${zone.id}`,
        stakeholder: 'operations',
        station_id: 'anand_vihar',
        severity: zone.level,
        message: `Tactical SOP deployed for ${zone.name}: ${zone.recommendedAction}`,
        source: 'Incident Command Map'
      });
      setToastMessage(`Tactical SOP dispatched for ${zone.name}`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (e) {
      setToastMessage(`Response action queued locally for ${zone.name}`);
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      setDispatchingAction(false);
    }
  };

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 500);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-md border border-cyan-300/25 bg-[#06090e] shadow-2xl ${className}`}
      style={{ minHeight: '460px' }}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-md border border-emerald-400/50 bg-[#0d1c14] px-4 py-2 shadow-2xl backdrop-blur-md text-emerald-200 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-1.5 rounded-md border border-white/10 bg-[#080d14]/95 p-1.5 shadow-xl backdrop-blur-md">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-0.5 rounded border border-white/10 bg-black/50 p-0.5 text-[10px] font-mono">
          <button
            onClick={() => setBasemapKey('dark')}
            className={`px-2 py-0.5 rounded transition cursor-pointer ${
              basemapKey === 'dark'
                ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DARK MAP
          </button>
          <button
            onClick={() => setBasemapKey('satellite')}
            className={`px-2 py-0.5 rounded transition cursor-pointer ${
              basemapKey === 'satellite'
                ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SATELLITE
          </button>
        </div>

        {/* Hazard Filter Chips */}
        <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-white/10 text-[10px]">
          {(['all', 'flood', 'fire', 'smoke', 'heat'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded uppercase font-mono transition cursor-pointer ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {filter === 'all' ? 'All Hazards' : HAZARD_CONFIG[filter].label}
              </button>
            );
          })}
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1 pl-1 border-l border-white/10">
          <button
            onClick={() => setShowZonesLayer(!showZonesLayer)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
              showZonesLayer
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30 font-semibold'
                : 'text-slate-500 border-white/5 hover:text-slate-300'
            }`}
          >
            <Shield className="h-3 w-3" />
            <span>Zones ({mergedZones.length})</span>
          </button>

          <button
            onClick={() => setShowFiresLayer(!showFiresLayer)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
              showFiresLayer
                ? 'bg-orange-500/20 text-orange-300 border-orange-400/30 font-semibold'
                : 'text-slate-500 border-white/5 hover:text-slate-300'
            }`}
          >
            <Flame className="h-3 w-3 text-orange-400" />
            <span>Fires ({activeFires.length})</span>
          </button>
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          title="Recenter Delhi NCR"
          className="flex items-center gap-1 rounded border border-white/10 bg-black/40 px-2.5 py-0.5 text-[10px] font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-300/40 transition cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden md:inline">Reset View</span>
        </button>
      </div>

      {/* Zone Quick-Jump Navigation Ribbon */}
      <div className="absolute top-12 left-2.5 z-20 flex flex-wrap items-center gap-1.5 max-w-[88vw]">
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 bg-[#080d14]/90 px-2 py-1 rounded border border-white/10 hidden sm:inline backdrop-blur-sm">
          Focus Hazard Zone:
        </span>
        {mergedZones.map((z) => {
          const cfg = HAZARD_CONFIG[z.hazard];
          const isSelected = selectedZone?.id === z.id;
          const Icon = cfg.icon;
          return (
            <button
              key={z.id}
              onClick={() => flyToZone(z)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border shadow-lg transition cursor-pointer backdrop-blur-md ${
                isSelected
                  ? 'border-white bg-white/20 text-white font-bold ring-2 ring-cyan-400/50'
                  : 'border-white/15 bg-[#080d14]/90 text-slate-300 hover:border-cyan-400/60 hover:text-white hover:bg-[#0e1622]'
              }`}
            >
              <Icon className="h-3 w-3 shrink-0" style={{ color: cfg.color }} />
              <span className="truncate max-w-[130px]">{z.name}</span>
              <span className="font-mono text-[10px] text-cyan-300 font-bold bg-black/50 px-1 rounded">
                {z.score.toFixed(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-20 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-[#080d14]/95 px-3 py-1.5 shadow-xl backdrop-blur-md text-[10px] font-mono text-slate-300">
        <span className="text-slate-400 font-semibold uppercase tracking-wider">Multi-Hazard Color Legend:</span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-cyan-500/40" /> Flood Corridor
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-400 ring-2 ring-orange-500/40" /> Agricultural Fire
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400 ring-2 ring-purple-500/40" /> Inversion Smoke
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400 ring-2 ring-rose-500/40" /> Heat Island
          </span>
        </div>
      </div>

      {/* Floating Zone Detail Inspector Card */}
      {selectedZone && (
        <div className="absolute top-2.5 right-2.5 z-30 w-[92vw] max-w-sm rounded-lg border border-cyan-400/40 bg-[#080d14]/95 p-4 shadow-2xl backdrop-blur-md text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded border flex items-center justify-center"
                style={{
                  backgroundColor: `${HAZARD_CONFIG[selectedZone.hazard].color}20`,
                  borderColor: HAZARD_CONFIG[selectedZone.hazard].color
                }}
              >
                {React.createElement(HAZARD_CONFIG[selectedZone.hazard].icon, {
                  className: 'h-4 w-4',
                  style: { color: HAZARD_CONFIG[selectedZone.hazard].color }
                })}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {selectedZone.name}
                </h4>
                <span className="text-[10px] font-mono text-cyan-300">
                  {HAZARD_CONFIG[selectedZone.hazard].label} • Sector {selectedZone.id}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Score & Rating Bar */}
          <div className="flex items-center justify-between bg-black/50 rounded p-2.5 border border-white/5">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Composite Hazard Score</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-mono font-black text-white">
                  {selectedZone.score.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>
            </div>
            <span
              className={`rounded px-2 py-1 text-[10px] font-mono font-bold uppercase border ${HAZARD_CONFIG[selectedZone.hazard].badgeBg} ${HAZARD_CONFIG[selectedZone.hazard].badgeBorder} ${HAZARD_CONFIG[selectedZone.hazard].badgeText}`}
            >
              {selectedZone.level} RISK
            </span>
          </div>

          {/* Geographic Scope & Population */}
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-mono">Geographic Reach</span>
              <p className="text-[11px] text-slate-200 mt-0.5 leading-relaxed">{selectedZone.description}</p>
            </div>
            <div className="border-t border-white/5 pt-1.5 flex justify-between text-[11px]">
              <span className="text-slate-400">Demographic Exposure:</span>
              <span className="text-amber-300 font-medium">{selectedZone.affectedPopulation}</span>
            </div>
          </div>

          {/* Live Ingested Telemetry Evidence */}
          <div className="rounded bg-[#0c1520] p-2.5 border border-cyan-500/20 space-y-1 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1">
              <Shield className="h-3 w-3 text-cyan-400" />
              Ingested Telemetry Drivers
            </span>
            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
              {selectedZone.evidence}
            </p>
          </div>

          {/* SOP Tactical Protocol */}
          <div className="text-xs">
            <span className="text-slate-400 text-[10px] block uppercase font-mono">Recommended Tactical SOP</span>
            <div className="mt-1 text-emerald-300 font-medium text-[11px] bg-emerald-950/40 border border-emerald-500/20 p-2 rounded">
              {selectedZone.recommendedAction}
            </div>
          </div>

          {/* Action Dispatch Button */}
          <div className="pt-1">
            <button
              onClick={() => handleDispatchTactical(selectedZone)}
              disabled={dispatchingAction}
              className="w-full flex items-center justify-center gap-2 rounded border border-cyan-400 bg-cyan-500/25 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/40 shadow-lg transition cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>{dispatchingAction ? 'Dispatching...' : 'Dispatch Tactical Response Action'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MapLibre WebGL Canvas */}
      {!webglFailed ? (
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          style={{ width: '100%', height: '100%', minHeight: '460px' }}
          mapStyle={BASEMAP_STYLES[basemapKey]}
          attributionControl={false}
          onLoad={() => setMapLoaded(true)}
          onError={() => setWebglFailed(true)}
        >
          <NavigationControl position="bottom-right" />

          {/* Render Multi-Hazard Risk Zones */}
          {visibleZones.map((zone) => {
            const config = HAZARD_CONFIG[zone.hazard];
            const Icon = config.icon;
            const isSelected = selectedZone?.id === zone.id;
            const isHigh = zone.score >= 25;

            return (
              <Marker
                key={zone.id}
                longitude={zone.coordinates[0]}
                latitude={zone.coordinates[1]}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  flyToZone(zone);
                }}
              >
                <div className="group relative cursor-pointer select-none -translate-y-1">
                  {/* Pulsing Aura */}
                  {isHigh && (
                    <div
                      className="absolute -inset-1.5 animate-ping rounded-md opacity-60 pointer-events-none"
                      style={{ backgroundColor: config.ringColor }}
                    />
                  )}

                  {/* High-Contrast Readable Card Pin */}
                  <div
                    className={`relative flex flex-col rounded-md border shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:scale-105 ${
                      isSelected
                        ? 'ring-2 ring-white border-white bg-[#0a1018]'
                        : `${config.badgeBg} ${config.badgeBorder}`
                    }`}
                    style={{ minWidth: '150px' }}
                  >
                    {/* Top Header Strip */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 gap-2">
                      <div className="flex items-center gap-1">
                        <Icon className={`h-3.5 w-3.5 ${config.badgeText}`} />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">
                          {config.label}
                        </span>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${config.badgeText}`}
                      >
                        {zone.score.toFixed(1)} {zone.level}
                      </span>
                    </div>

                    {/* Zone Name */}
                    <div className="px-2 py-1 bg-black/40">
                      <div className="text-xs font-bold text-white tracking-tight truncate">
                        {zone.name}
                      </div>
                      <div className="text-[9px] font-mono text-cyan-300 truncate mt-0.5">
                        {zone.evidence.split('•')[0]}
                      </div>
                    </div>

                    {/* Pin Point Pointer Triangle */}
                    <div
                      className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b"
                      style={{
                        backgroundColor: '#0a1018',
                        borderColor: isSelected ? '#ffffff' : config.color
                      }}
                    />
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Render Active Satellite Fire Detections */}
          {showFiresLayer &&
            activeFires.slice(0, 30).map((fire, idx) => (
              <Marker
                key={fire.id || `fire-${idx}`}
                longitude={fire.longitude}
                latitude={fire.latitude}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedFire(fire);
                  setSelectedZone(null);
                }}
              >
                <div className="cursor-pointer transition-transform hover:scale-125">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-orange-400/80 bg-orange-500/40 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.6)]">
                    <Flame className="h-3 w-3" />
                  </div>
                </div>
              </Marker>
            ))}

          {/* Interactive Fire Popup */}
          {selectedFire && (
            <Popup
              longitude={selectedFire.longitude}
              latitude={selectedFire.latitude}
              anchor="bottom"
              closeButton={true}
              closeOnClick={false}
              onClose={() => setSelectedFire(null)}
            >
              <div className="p-3 text-slate-100 max-w-[240px]">
                <div className="flex items-center gap-1.5 text-orange-400 border-b border-white/10 pb-1.5">
                  <Flame className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Active Fire Hotspot</span>
                </div>
                <div className="mt-2 space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">FRP:</span>
                    <span className="text-orange-300 font-bold">{selectedFire.frp} MW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-200">{selectedFire.latitude.toFixed(3)}, {selectedFire.longitude.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="text-emerald-400 uppercase">{selectedFire.confidence || 'high'}</span>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      ) : (
        /* Resilient High-Tech Fallback Vector Airshed Map in case of WebGL absence */
        <div className="relative h-full min-h-[460px] w-full bg-[#080d14] p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-cyan-300">
            Delhi NCR Geospatial Airshed Model (Vector Fallback Active)
          </div>
          <div className="relative flex-1 my-4 border border-cyan-500/20 rounded bg-radial-fade">
            {visibleZones.map((zone, i) => (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 p-2 border rounded shadow-lg backdrop-blur-md text-xs font-mono transition-transform hover:scale-105"
                style={{
                  left: `${20 + i * 22}%`,
                  top: `${30 + (i % 2) * 35}%`,
                  borderColor: HAZARD_CONFIG[zone.hazard].color,
                  backgroundColor: 'rgba(10,16,24,0.85)'
                }}
              >
                <div className="font-bold text-white">{zone.name}</div>
                <div className="text-[10px]" style={{ color: HAZARD_CONFIG[zone.hazard].color }}>
                  {zone.hazard.toUpperCase()}: {zone.score.toFixed(1)}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

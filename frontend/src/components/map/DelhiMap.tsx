'use client';

import React, { useState, useMemo } from 'react';
import Map, { Marker, NavigationControl, Popup, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Station, Observation, ActiveFirePoint, TransportCorridor } from '@/lib/types';
import { clsx } from 'clsx';
import { Flame, Wind, Compass, AlertCircle, Layers, Eye, EyeOff } from 'lucide-react';

interface StationWithObs extends Station {
  observation?: Observation;
}

interface DelhiMapProps {
  stations: StationWithObs[];
  onSelectStation: (stationId: string) => void;
  selectedStationId: string | null;
  activeFires?: ActiveFirePoint[];
  transportCorridors?: TransportCorridor[];
  windDirection?: number;
  windSpeedMs?: number;
  inversionRiskScore?: number;
  className?: string;
  activeMetric?: 'aqi' | 'pm25' | 'o3';
}

const getAqiColor = (aqi: number | null): string => {
  if (aqi === null) return '#64748b'; // slate-500
  if (aqi <= 50) return '#10b981'; // emerald
  if (aqi <= 100) return '#84cc16'; // lime
  if (aqi <= 200) return '#eab308'; // yellow
  if (aqi <= 300) return '#f97316'; // orange
  if (aqi <= 400) return '#ef4444'; // red
  return '#7c3aed'; // violet
};

const BASEMAP_STYLES = {
  dark: {
    version: 8 as const,
    sources: {
      'base': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      },
      'ref': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'base-layer', type: 'raster' as const, source: 'base', minzoom: 0, maxzoom: 18 },
      { id: 'ref-layer', type: 'raster' as const, source: 'ref', minzoom: 0, maxzoom: 18 }
    ]
  },
  satellite: {
    version: 8 as const,
    sources: {
      'base': {
        type: 'raster' as const,
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      },
      'ref': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'base-layer', type: 'raster' as const, source: 'base', minzoom: 0, maxzoom: 18 },
      { id: 'ref-layer', type: 'raster' as const, source: 'ref', minzoom: 0, maxzoom: 18 }
    ]
  },
  topo: {
    version: 8 as const,
    sources: {
      'base': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'base-layer', type: 'raster' as const, source: 'base', minzoom: 0, maxzoom: 18 }
    ]
  }
};

export type MapMetric = 'aqi' | 'pm25' | 'temp' | 'wind' | 'humidity';

const getMetricValueAndColor = (station: StationWithObs, metric: MapMetric) => {
  const obs = station.observation;
  if (!obs) return { displayValue: '--', color: '#64748b' };

  if (metric === 'aqi') {
    const aqi = obs.aqi ?? null;
    return { displayValue: aqi !== null ? aqi : '--', color: getAqiColor(aqi) };
  }
  if (metric === 'pm25') {
    const pm25 = obs.pollutants?.pm25 ?? null;
    let color = '#64748b';
    if (pm25 !== null) {
      if (pm25 <= 30) color = '#10b981';
      else if (pm25 <= 60) color = '#84cc16';
      else if (pm25 <= 90) color = '#eab308';
      else if (pm25 <= 120) color = '#f97316';
      else if (pm25 <= 250) color = '#ef4444';
      else color = '#7c3aed';
    }
    return { displayValue: pm25 !== null ? Math.round(pm25) : '--', color };
  }
  if (metric === 'temp') {
    const temp = obs.meteorology?.temperature ?? null;
    let color = '#38bdf8';
    if (temp !== null) {
      if (temp >= 40) color = '#ef4444';
      else if (temp >= 35) color = '#f97316';
      else if (temp >= 28) color = '#f59e0b';
      else if (temp >= 20) color = '#22c55e';
      else color = '#38bdf8';
    }
    return { displayValue: temp !== null ? `${Math.round(temp)}°` : '--', color };
  }
  if (metric === 'wind') {
    const ws = obs.meteorology?.wind_speed ?? null;
    let color = '#94a3b8';
    if (ws !== null) {
      if (ws >= 7) color = '#ec4899';
      else if (ws >= 4) color = '#a855f7';
      else if (ws >= 2) color = '#38bdf8';
      else color = '#94a3b8';
    }
    return { displayValue: ws !== null ? `${ws.toFixed(1)}` : '--', color };
  }
  if (metric === 'humidity') {
    const rh = obs.meteorology?.humidity ?? null;
    let color = '#06b6d4';
    if (rh !== null) {
      if (rh >= 75) color = '#2563eb';
      else if (rh >= 50) color = '#06b6d4';
      else if (rh >= 30) color = '#10b981';
      else color = '#f59e0b';
    }
    return { displayValue: rh !== null ? `${Math.round(rh)}%` : '--', color };
  }
  return { displayValue: '--', color: '#64748b' };
};

export default function DelhiMap({
  stations,
  onSelectStation,
  selectedStationId,
  activeFires = [],
  transportCorridors = [],
  windDirection = 300,
  windSpeedMs = 3.2,
  inversionRiskScore = 45,
  className = '',
  activeMetric = 'aqi'
}: DelhiMapProps) {
  const [hoveredStation, setHoveredStation] = useState<StationWithObs | null>(null);
  const [firePopup, setFirePopup] = useState<ActiveFirePoint | null>(null);
  const [mapStyleKey, setMapStyleKey] = useState<'dark' | 'satellite' | 'topo'>('dark');
  const [selectedMetric, setSelectedMetric] = useState<MapMetric>((activeMetric as MapMetric) || 'aqi');

  // Layer Toggles
  const [showFires, setShowFires] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showInversion, setShowInversion] = useState(false);

  // Station Markers
  const stationMarkers = useMemo(() => stations.map((station) => {
    const { displayValue, color } = getMetricValueAndColor(station, selectedMetric);
    const aqi = station.observation?.aqi ?? null;
    const isSelected = station.id === selectedStationId;
    const isSevere = aqi !== null && aqi > 300;

    return (
      <Marker
        key={station.id}
        longitude={station.longitude}
        latitude={station.latitude}
        anchor="center"
        onClick={(e: any) => {
          e.originalEvent.stopPropagation();
          onSelectStation(station.id);
          setFirePopup(null);
        }}
      >
        <div
          onMouseEnter={() => setHoveredStation(station)}
          onMouseLeave={() => setHoveredStation(null)}
          className={clsx(
            "relative flex items-center justify-center rounded-full text-[10px] font-bold text-white cursor-pointer transition-all duration-200 shadow-md font-mono",
            isSelected
              ? "w-8 h-8 scale-115 ring-2 ring-white z-20 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              : "w-6 h-6 hover:scale-115 hover:z-10"
          )}
          style={{ backgroundColor: color }}
        >
          {isSevere && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-35" style={{ backgroundColor: color }} />
          )}
          {displayValue}
        </div>
      </Marker>
    );
  }), [stations, selectedStationId, onSelectStation, selectedMetric]);

  // Active Fire Markers
  const fireMarkers = useMemo(() => {
    if (!showFires) return null;
    return activeFires.slice(0, 40).map((fire) => (
      <Marker
        key={fire.id}
        longitude={fire.longitude}
        latitude={fire.latitude}
        anchor="center"
        onClick={(e: any) => {
          e.originalEvent.stopPropagation();
          setFirePopup(fire);
        }}
      >
        <div
          className="cursor-pointer group flex items-center justify-center p-1 rounded-full bg-orange-600/30 border border-orange-500/80 hover:scale-125 transition-transform"
          title={`Active Fire: ${fire.frp} MW`}
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute opacity-60" />
          <div className="w-2 h-2 rounded-full bg-orange-500 relative" />
        </div>
      </Marker>
    ));
  }, [activeFires, showFires]);

  // Regional Wind Streamline Vectors
  const windMarkers = useMemo(() => {
    if (!showWind) return null;
    const gridPoints = [
      { id: 'w1', lat: 28.88, lon: 76.92 },
      { id: 'w2', lat: 28.72, lon: 77.38 },
      { id: 'w3', lat: 28.45, lon: 77.02 },
      { id: 'w4', lat: 28.42, lon: 77.32 },
      { id: 'w5', lat: 28.62, lon: 77.21 },
      { id: 'w6', lat: 29.15, lon: 76.68 },
    ];

    return gridPoints.map((pt) => (
      <Marker key={pt.id} longitude={pt.lon} latitude={pt.lat} anchor="center">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full bg-[#070b12]/80 border border-white/10 text-sky-400 pointer-events-none shadow-xs backdrop-blur-xs"
          style={{ transform: `rotate(${windDirection}deg)` }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19V5m0 0l-4 4m4-4l4 4" />
          </svg>
        </div>
      </Marker>
    ));
  }, [showWind, windDirection]);

  // Transport Corridors GeoJSON
  const corridorGeoJson = useMemo(() => {
    if (!showCorridors || transportCorridors.length === 0) return null;
    return {
      type: 'FeatureCollection' as const,
      features: transportCorridors.map((c) => ({
        type: 'Feature' as const,
        properties: {
          id: c.id,
          risk: c.transport_risk,
          speed: c.wind_speed_kmh,
          hours: c.estimated_transit_hours
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: c.coordinates
        }
      }))
    };
  }, [showCorridors, transportCorridors]);

  return (
    <div className={`relative w-full h-full bg-[#06090e] overflow-hidden ${className}`}>
      {/* Top Left Floating Layer Controls Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-[#070b12]/90 border border-white/[0.1] p-1.5 rounded-lg shadow-xl backdrop-blur-md text-xs">
        {/* Metric Switcher Toolbar */}
        <div className="flex items-center gap-0.5 bg-black/50 p-0.5 rounded border border-cyan-400/30 font-mono text-[10px] mr-1">
          <span className="text-[9px] text-cyan-400 uppercase px-1 font-semibold">Metric:</span>
          {(['aqi', 'pm25', 'temp', 'wind', 'humidity'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-2 py-0.5 rounded uppercase tracking-wide transition-all ${
                selectedMetric === m
                  ? 'bg-cyan-500/30 text-cyan-200 font-bold border border-cyan-400/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {m === 'aqi' ? 'AQI' : m === 'pm25' ? 'PM2.5' : m === 'temp' ? 'Temp' : m === 'wind' ? 'Wind' : 'RH%'}
            </button>
          ))}
        </div>

        {/* Basemap Switcher */}
        <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded border border-white/[0.1] font-mono text-[10px] mr-1">
          {(['dark', 'satellite', 'topo'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setMapStyleKey(key)}
              className={`px-2 py-0.5 rounded uppercase tracking-wide transition-all ${
                mapStyleKey === key
                  ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-400/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {key === 'dark' ? 'Dark' : key === 'satellite' ? 'Satellite' : 'Terrain'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowWind(!showWind)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showWind
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-sky-400" />
          <span>Wind {windSpeedMs.toFixed(1)} m/s ({windDirection.toFixed(0)}°)</span>
        </button>

        <button
          onClick={() => setShowFires(!showFires)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showFires
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Fires ({activeFires.length})</span>
        </button>

        <button
          onClick={() => setShowCorridors(!showCorridors)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showCorridors
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Corridors</span>
        </button>

        <button
          onClick={() => setShowInversion(!showInversion)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showInversion
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Inversion {inversionRiskScore.toFixed(0)}/100</span>
        </button>
      </div>

      {/* Bottom Left Floating Dynamic Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#070b12]/95 border border-white/[0.1] px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-[10px] font-mono text-slate-300 flex items-center gap-3">
        <span className="text-cyan-400 uppercase tracking-wider font-semibold">
          {selectedMetric === 'aqi' ? 'NAQI Scale:' : selectedMetric === 'pm25' ? 'PM2.5 (µg):' : selectedMetric === 'temp' ? 'Temp (°C):' : selectedMetric === 'wind' ? 'Wind (m/s):' : 'Humidity (%):'}
        </span>
        {selectedMetric === 'aqi' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> 0-50</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#84cc16]" /> 51-100</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#eab308]" /> 101-200</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> 201-300</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> 301-400</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> 401+</span>
          </div>
        )}
        {selectedMetric === 'pm25' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> 0-30</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#84cc16]" /> 31-60</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#eab308]" /> 61-90</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> 91-120</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> 121-250</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> 250+</span>
          </div>
        )}
        {selectedMetric === 'temp' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> &lt;20°</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> 20-28°</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> 28-35°</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> 35-40°</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> 40°+</span>
          </div>
        )}
        {selectedMetric === 'wind' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#94a3b8]" /> &lt;2 m/s</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> 2-4 m/s</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a855f7]" /> 4-7 m/s</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ec4899]" /> &gt;7 m/s</span>
          </div>
        )}
        {selectedMetric === 'humidity' && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> &lt;30% (Dry)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> 30-50%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#06b6d4]" /> 50-75%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]" /> &gt;75% (Moist)</span>
          </div>
        )}
      </div>

      {/* Bottom Right Data Attribution Badge */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#070b12]/85 border border-white/[0.08] px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 backdrop-blur-sm pointer-events-none">
        Basemap: {mapStyleKey === 'satellite' ? 'Esri Satellite + Places' : mapStyleKey === 'topo' ? 'Esri World Topo' : 'Esri Dark Gray'} • CAAQMS: CPCB • Weather: IMD
      </div>

      {/* Main Map Canvas */}
      <Map
        initialViewState={{
          longitude: 77.2250,
          latitude: 28.6300,
          zoom: 10.2
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BASEMAP_STYLES[mapStyleKey]}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Transport Corridors GeoJSON */}
        {corridorGeoJson && (
          <Source id="transport-corridors-src" type="geojson" data={corridorGeoJson}>
            <Layer
              id="transport-corridors-line"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 2,
                'line-opacity': 0.75,
                'line-dasharray': [3, 2]
              }}
            />
          </Source>
        )}

        {/* Markers */}
        {windMarkers}
        {fireMarkers}
        {stationMarkers}

        {/* Hover Tooltip */}
        {hoveredStation && (
          <Popup
            anchor="bottom"
            longitude={hoveredStation.longitude}
            latitude={hoveredStation.latitude}
            closeButton={false}
            closeOnClick={false}
            offset={14}
          >
            <div className="p-3 text-xs w-64 bg-[#0a0f16]/95 border border-cyan-400/30 rounded-md shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-white text-xs truncate">{hoveredStation.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{hoveredStation.city}, {hoveredStation.state}</div>
                </div>
                {hoveredStation.observation?.aqi !== undefined && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0"
                    style={{
                      backgroundColor: `${getAqiColor(hoveredStation.observation?.aqi ?? null)}25`,
                      color: getAqiColor(hoveredStation.observation?.aqi ?? null),
                      border: `1px solid ${getAqiColor(hoveredStation.observation?.aqi ?? null)}50`
                    }}
                  >
                    AQI {hoveredStation.observation?.aqi ?? '--'}
                  </span>
                )}
              </div>

              {/* Pollutants mini grid */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono mb-2 bg-black/40 p-1.5 rounded border border-white/5">
                <div>PM2.5: <strong className="text-cyan-300">{hoveredStation.observation?.pollutants.pm25?.toFixed(1) ?? '--'} µg</strong></div>
                <div>PM10: <strong className="text-slate-200">{hoveredStation.observation?.pollutants.pm10?.toFixed(0) ?? '--'} µg</strong></div>
                <div>NO2: <strong className="text-slate-200">{hoveredStation.observation?.pollutants.no2?.toFixed(1) ?? '--'} µg</strong></div>
                <div>O3: <strong className="text-slate-200">{hoveredStation.observation?.pollutants.o3?.toFixed(1) ?? '--'} µg</strong></div>
              </div>

              {/* Regional Weather Grid */}
              <div className="border-t border-white/10 pt-1.5">
                <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                  <span>Surface Weather (IMD)</span>
                  <span className="text-emerald-300">LIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                  <div>🌡️ Temp: <strong className="text-white">{hoveredStation.observation?.meteorology?.temperature ? `${hoveredStation.observation.meteorology.temperature.toFixed(1)}°C` : '27.4°C'}</strong></div>
                  <div>💧 Humidity: <strong className="text-white">{hoveredStation.observation?.meteorology?.humidity ? `${hoveredStation.observation.meteorology.humidity.toFixed(0)}%` : '62%'}</strong></div>
                  <div>💨 Wind: <strong className="text-sky-300">{hoveredStation.observation?.meteorology?.wind_speed ? `${hoveredStation.observation.meteorology.wind_speed.toFixed(1)} m/s` : '2.8 m/s'}</strong></div>
                  <div>🧭 Bearing: <strong className="text-slate-300">{hoveredStation.observation?.meteorology?.wind_direction ? `${hoveredStation.observation.meteorology.wind_direction.toFixed(0)}°` : '305°'}</strong></div>
                </div>
              </div>
            </div>
          </Popup>
        )}

        {/* Fire Popup */}
        {firePopup && (
          <Popup
            anchor="bottom"
            longitude={firePopup.longitude}
            latitude={firePopup.latitude}
            onClose={() => setFirePopup(null)}
            closeOnClick={false}
            offset={12}
          >
            <div className="p-2 text-xs">
              <div className="font-bold text-orange-400 flex items-center gap-1 mb-1">
                <Flame className="w-3.5 h-3.5" />
                NASA FIRMS Thermal Anomaly
              </div>
              <div className="space-y-0.5 text-[11px] font-mono text-slate-300">
                <div>FRP: <strong className="text-orange-300">{firePopup.frp} MW</strong></div>
                <div>Brightness: {firePopup.brightness} K</div>
                <div>Acquired: {firePopup.acq_date} {firePopup.acq_time} UTC</div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import {
  Station,
  Observation,
  ForecastResponse,
  HealthResponse,
  AtmosphericRegime,
  DerivedIndices,
  ActiveFirePoint,
  TransportCorridor,
  ForecastExplanation,
  BlendedForecastResponse
} from '@/lib/types';

import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchSidebar, { WorkbenchView } from '@/components/workbench/WorkbenchSidebar';
import OverviewScreen from '@/components/workbench/OverviewScreen';
import StationDetailDrawer from '@/components/workbench/StationDetailDrawer';
import IntelligencePanel from '@/components/workbench/IntelligencePanel';
import ForecastTimeline from '@/components/workbench/ForecastTimeline';
import AtmosphericRegimeCard from '@/components/atmospheric/AtmosphericRegimeCard';
import DerivedIndicesGrid from '@/components/atmospheric/DerivedIndicesGrid';
import ForecastExplainer from '@/components/atmospheric/ForecastExplainer';
import WorkbenchWhatIf from '@/components/workbench/WorkbenchWhatIf';
import WorkbenchEvaluation from '@/components/workbench/WorkbenchEvaluation';
import WorkbenchResearchDocs from '@/components/workbench/WorkbenchResearchDocs';
import AskAeroSenseModal from '@/components/workbench/AskAeroSenseModal';
import DataSourcesModal from '@/components/workbench/DataSourcesModal';
import IncidentCommand from '@/components/workbench/IncidentCommand';
import ResponseConsole from '@/components/workbench/ResponseConsole';

// Dynamically import map to avoid SSR issues
const DelhiMap = dynamic(() => import('@/components/map/DelhiMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#070b12] flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse">
      Initializing Delhi NCR High-Resolution Geospatial Airshed Map...
    </div>
  ),
});

export default function WorkbenchPage() {
  const [currentView, setCurrentView] = useState<WorkbenchView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as WorkbenchView | null;
      if (v && ['overview', 'forecast', 'map', 'drivers', 'what-if', 'evaluation', 'datasources', 'research', 'incident-command', 'response-console'].includes(v)) {
        setCurrentView(v);
      }
    }
  }, []);

  // Core Data States
  const [stations, setStations] = useState<Station[]>([]);
  const [observations, setObservations] = useState<Record<string, Observation>>({});
  const [selectedStationId, setSelectedStationId] = useState<string>('anand_vihar');
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [blendedForecast, setBlendedForecast] = useState<BlendedForecastResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // Atmospheric Intelligence States
  const [regime, setRegime] = useState<AtmosphericRegime | null>(null);
  const [indices, setIndices] = useState<DerivedIndices | null>(null);
  const [activeFires, setActiveFires] = useState<ActiveFirePoint[]>([]);
  const [transportCorridors, setTransportCorridors] = useState<TransportCorridor[]>([]);
  const [dominantWindDir, setDominantWindDir] = useState<number>(300);
  const [windSpeed, setWindSpeed] = useState<number>(3.2);
  const [explanation, setExplanation] = useState<ForecastExplanation | null>(null);

  // UI State
  const [stationDrawerOpen, setStationDrawerOpen] = useState<boolean>(false);
  const [askModalOpen, setAskModalOpen] = useState<boolean>(false);
  const [dataSourcesModalOpen, setDataSourcesModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const applyObservations = (obsRes: { observations: Observation[]; last_updated: string | null }) => {
    const obsMap: Record<string, Observation> = {};
    obsRes.observations.forEach((o) => {
      obsMap[o.station_id] = o;
    });
    setObservations(obsMap);
    setLastUpdated(obsRes.last_updated);
  };

  // Initial Load
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        stationsRes,
        healthRes,
        regimeRes,
        indicesRes,
        firesRes,
        transportRes
      ] = await Promise.all([
        api.getStations(),
        api.getHealth().catch(() => null),
        api.getAtmosphericRegime().catch(() => null),
        api.getDerivedIndices().catch(() => null),
        api.getActiveFires().catch(() => null),
        api.getTransportCorridors().catch(() => null),
      ]);

      setStations(stationsRes.stations || []);
      if (healthRes) setHealth(healthRes);
      if (regimeRes) setRegime(regimeRes);
      if (indicesRes) setIndices(indicesRes);
      if (firesRes) setActiveFires(firesRes.fires || []);
      if (transportRes) {
        setTransportCorridors(transportRes.corridors || []);
        setDominantWindDir(transportRes.dominant_wind_direction || 300);
        setWindSpeed(transportRes.wind_speed_ms || 3.2);
      }

      loadStationData('anand_vihar');
      api.getObservations('anand_vihar')
        .then(applyObservations)
        .catch((err) => console.error('Failed to load selected-station observation:', err));
      api.getObservations()
        .then(applyObservations)
        .catch((err) => console.error('Failed to load observations:', err));
    } catch (err) {
      console.error('Failed to load workbench telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStationData = async (stationId: string) => {
    try {
      setLoadingForecast(true);
      const [fcRes, blendRes, expRes] = await Promise.all([
        api.getForecast(stationId).catch(() => null),
        api.getBlendedForecast(stationId).catch(() => null),
        api.getForecastExplanation(stationId).catch(() => null),
      ]);
      setForecast(fcRes);
      setBlendedForecast(blendRes);
      setExplanation(expRes);
    } catch (err) {
      console.error('Failed to fetch station forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(async () => {
      try {
        const obsRes = await api.getObservations();
        const obsMap: Record<string, Observation> = {};
        obsRes.observations.forEach((o) => {
          obsMap[o.station_id] = o;
        });
        setObservations(obsMap);
        setLastUpdated(obsRes.last_updated);
      } catch (err) {
        console.error('Background refresh failed:', err);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K for Ask AeroSense
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAskModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectStation = (stationId: string) => {
    setSelectedStationId(stationId);
    loadStationData(stationId);
    setStationDrawerOpen(true);
  };

  const stationsWithObs = useMemo(() => {
    return stations.map((s) => ({
      ...s,
      observation: observations[s.id],
    }));
  }, [stations, observations]);

  const selectedObservation = observations[selectedStationId] || null;
  const selectedStation = stations.find((s) => s.id === selectedStationId) || null;
  const mode = health?.mode || 'DEMO';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#06090e] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <WorkbenchHeader
        mode={mode}
        lastUpdated={lastUpdated}
        onOpenAskAgent={() => setAskModalOpen(true)}
        onOpenDataSources={() => setDataSourcesModalOpen(true)}
      />

      {/* Main Body Layout: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Navigation Rail */}
        <WorkbenchSidebar
          currentView={currentView}
          onSelectView={(v) => {
            if (v === 'datasources') {
              setDataSourcesModalOpen(true);
            } else {
              setCurrentView(v);
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* View Router */}
        {currentView === 'what-if' ? (
          <WorkbenchWhatIf stations={stations} selectedStationId={selectedStationId} />
        ) : currentView === 'incident-command' ? (
          <IncidentCommand activeFires={activeFires} observations={observations} />
        ) : currentView === 'response-console' ? (
          <ResponseConsole
            forecast={forecast}
            observation={selectedObservation}
            stationId={selectedStationId}
            onOpenWhatIf={() => setCurrentView('what-if')}
          />
        ) : currentView === 'evaluation' ? (
          <WorkbenchEvaluation />
        ) : currentView === 'research' ? (
          <WorkbenchResearchDocs />
        ) : currentView === 'drivers' ? (
          <div className="flex-1 p-6 overflow-y-auto bg-[#06090e] space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-base font-bold text-white">Atmospheric Attribution & Drivers</h2>
              <p className="text-xs text-slate-400">
                Detailed decomposition of physics-guided atmospheric drivers influencing Delhi NCR air quality
              </p>
            </div>
            <ForecastExplainer explanation={explanation} loading={loadingForecast} />
            <AtmosphericRegimeCard regime={regime} loading={loading} />
            <DerivedIndicesGrid indices={indices} loading={loading} />
          </div>
        ) : currentView === 'forecast' ? (
          <div className="flex-1 p-6 overflow-y-auto bg-[#06090e] space-y-6">
            <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">72-Hour Trajectory Projection</h2>
                <p className="text-xs text-slate-400">
                  Coupled physics-AI trajectory for {selectedStation?.name || 'Selected Station'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Station:</span>
                <select
                  value={selectedStationId}
                  onChange={(e) => handleSelectStation(e.target.value)}
                  className="bg-[#0c111a] border border-white/[0.1] text-xs rounded px-2.5 py-1 text-white"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ForecastTimeline forecast={forecast} blendedForecast={blendedForecast} loading={loadingForecast} />
            <ForecastExplainer explanation={explanation} loading={loadingForecast} />
          </div>
        ) : (
          /* Default: Overview & Map-First Workspace */
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden">
            {/* SCREEN 1: Map-First Initial Viewport */}
            <div className="h-full min-h-[640px] w-full flex flex-col shrink-0">
              {/* Top Connected KPI Strip */}
              <OverviewScreen
                observation={selectedObservation}
                stationName={selectedStation?.name || 'Delhi NCR Basin'}
              />

              {/* Central Workspace: Large Map + 440px Atmospheric Intelligence Panel */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] overflow-hidden relative">
                {/* Large Delhi NCR Airshed Geospatial Map */}
                <div className="relative w-full h-full min-w-0 min-h-0 overflow-hidden">
                  <DelhiMap
                    stations={stationsWithObs}
                    onSelectStation={handleSelectStation}
                    selectedStationId={selectedStationId}
                    activeFires={activeFires}
                    transportCorridors={transportCorridors}
                    windDirection={dominantWindDir}
                    windSpeedMs={windSpeed}
                    inversionRiskScore={indices?.inversion_risk_score ?? 45}
                  />
                </div>

                {/* Right 440px Atmospheric Intelligence Panel */}
                <div className="w-full h-full overflow-y-auto shrink-0 bg-[#0c111a] border-l border-white/[0.08]">
                  <IntelligencePanel
                    regime={regime}
                    indices={indices}
                    explanation={explanation}
                    selectedStation={selectedStation}
                    selectedObservation={selectedObservation}
                    forecast={forecast}
                    loading={loading}
                  />
                </div>
              </div>
            </div>

            {/* SCREEN 2 (BELOW THE FOLD): Scrollable 72-Hour Forecast & Physical Attribution */}
            <div className="w-full bg-[#070b12] border-t border-white/[0.08] p-6 lg:p-8 space-y-8 shrink-0">
              {/* 72-Hour Trajectory Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      72-Hour Atmospheric Projection & Uncertainty Ribbon
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coupled WRF-Chem atmospheric simulation with multi-horizon machine learning residual correction
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>Target Station:</span>
                    <span className="text-white font-bold px-2.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.1]">
                      {selectedStation?.name || 'Anand Vihar'}
                    </span>
                  </div>
                </div>

                <ForecastTimeline
                  forecast={forecast}
                  blendedForecast={blendedForecast}
                  loading={loadingForecast}
                  className="rounded-xl border border-white/[0.08] shadow-2xl h-[340px]"
                />
              </div>

              {/* Attribution Drivers & Trapping Mechanics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/[0.06]">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Physical Transport & Dispersion Drivers
                  </h3>
                  <ForecastExplainer explanation={explanation} loading={loadingForecast} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Boundary Layer Dynamics & Trapping Regime
                  </h3>
                  <AtmosphericRegimeCard regime={regime} loading={loading} />
                  <DerivedIndicesGrid indices={indices} loading={loading} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AskAeroSenseModal
        isOpen={askModalOpen}
        onClose={() => setAskModalOpen(false)}
        regime={regime}
        indices={indices}
        explanation={explanation}
      />

      <DataSourcesModal
        isOpen={dataSourcesModalOpen}
        onClose={() => setDataSourcesModalOpen(false)}
        health={health}
        stationCount={stations.length}
      />
    </div>
  );
}

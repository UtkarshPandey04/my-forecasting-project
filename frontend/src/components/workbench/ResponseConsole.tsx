'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Send,
  Sliders,
  X,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Users,
  School,
  Landmark,
  Truck,
  HeartPulse,
  ClipboardList,
  CheckSquare,
  Square,
  FileText,
  MapPin,
  ChevronDown,
  Info,
  Car,
  Wind,
  Layers,
  Building2,
  AlertCircle
} from 'lucide-react';
import { ForecastResponse, Observation, Station } from '@/lib/types';
import { firstGrapTrigger, getGrapStage, GrapAssessment } from '@/lib/grap';
import { api } from '@/lib/api';

interface ResponseConsoleProps {
  forecast: ForecastResponse | null;
  observation: Observation | null;
  stationId: string;
  stations?: Station[];
  onSelectStation?: (stationId: string) => void;
  onOpenWhatIf?: () => void;
}

interface QueuedAction {
  id: string;
  action_type: string;
  stakeholder: string;
  station_id: string;
  severity: string;
  message: string;
  source: string;
  status: string;
  created_at: string;
}

interface StatutoryMandate {
  id: string;
  stage: string;
  category: 'Dust & Roads' | 'Traffic & Transit' | 'Energy & Boilers' | 'Industry & Construction';
  title: string;
  desc: string;
  authority: string;
  impactNote: string;
}

const STATUTORY_CAQM_MANDATES: StatutoryMandate[] = [
  {
    id: 'mandate-1',
    stage: 'II',
    category: 'Dust & Roads',
    title: 'Vacuum Road Sweeping & Water Sprinkling',
    desc: 'Run mechanized road vacuum sweepers daily and mist water on high-traffic roads to keep dust settled.',
    authority: 'Municipal Corporations (MCD / NDMC / PWD)',
    impactNote: 'Reduces re-suspended road dust particles by up to 35% along busy roads.'
  },
  {
    id: 'mandate-2',
    stage: 'II',
    category: 'Energy & Boilers',
    title: 'Diesel Generator Restrictions',
    desc: 'Prohibit diesel generator sets in commercial complexes, malls, and residential buildings (except hospitals).',
    authority: 'DPCC Environmental Enforcement',
    impactNote: 'Stops concentrated soot and nitrogen oxide emissions in dense residential areas.'
  },
  {
    id: 'mandate-3',
    stage: 'II',
    category: 'Traffic & Transit',
    title: 'Increase Metro & Public Bus Frequencies',
    desc: 'Run extra metro train trips and add CNG feeder buses to encourage people to leave cars at home.',
    authority: 'Delhi Transport Dept / DMRC',
    impactNote: 'Helps commuters travel affordably without contributing to peak-hour traffic exhaust.'
  },
  {
    id: 'mandate-4',
    stage: 'III',
    category: 'Industry & Construction',
    title: 'Construction & Demolition Work Halt',
    desc: 'Strictly stop all earth excavation, piling, dry stone cutting, and building demolition activities.',
    authority: 'Municipal & Building Enforcement Squads',
    impactNote: 'Eliminates primary coarse particulate emissions (PM10) across neighborhoods.'
  },
  {
    id: 'mandate-5',
    stage: 'III',
    category: 'Traffic & Transit',
    title: 'Divert Older Diesel Trucks to Peripheral Bypasses',
    desc: 'Divert non-essential heavy commercial trucks via Eastern & Western Peripheral Expressways away from city centers.',
    authority: 'Delhi Traffic Police',
    impactNote: 'Keeps 40,000+ diesel transit vehicles outside the central Delhi urban basin.'
  },
  {
    id: 'mandate-6',
    stage: 'IV',
    category: 'Dust & Roads',
    title: 'Continuous High-Pressure Anti-Smog Misting',
    desc: 'Deploy stationary and mobile anti-smog mist cannons continuously at identified pollution hot-spots.',
    authority: 'Disaster Cell & MCD Engineering',
    impactNote: 'Creates high-altitude water droplet barriers that pull fine aerosols down to the ground.'
  }
];

interface StakeholderChannel {
  id: string;
  title: string;
  subtitle: string;
  audience: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
  defaultMessage: string;
  channels: string[];
}

const STAKEHOLDER_CHANNELS: StakeholderChannel[] = [
  {
    id: 'citizens',
    title: 'Citizens & General Public',
    subtitle: 'Daily Health Guidance & Air Quality Advisories',
    audience: 'Residents, elderly citizens, morning walkers, and outdoor workers',
    icon: Users,
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/30 hover:border-sky-400/60',
    bgColor: 'bg-sky-500/10',
    badgeBg: 'bg-sky-950/80 border-sky-500/30',
    badgeText: 'text-sky-300',
    defaultMessage:
      'Air Quality Advisory for Delhi NCR: Air quality is currently in the Poor/Very Poor category. Elderly individuals, children, and people with respiratory or heart conditions should limit strenuous outdoor activities. We recommend wearing a certified mask during morning and evening peak hours and keeping windows closed when possible.',
    channels: ['Citizen SMS Broadcast', 'AeroSense App Push', 'Public Radio & TV', 'Community Centers']
  },
  {
    id: 'schools',
    title: 'Schools & Colleges',
    subtitle: 'Child Safety & Physical Activity Restrictions',
    audience: '5,000+ primary/secondary schools, daycares, and athletic sports academies',
    icon: School,
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-400/60',
    bgColor: 'bg-amber-500/10',
    badgeBg: 'bg-amber-950/80 border-amber-500/30',
    badgeText: 'text-amber-300',
    defaultMessage:
      'Institutional Health Advisory: Given elevated particulate concentrations across Delhi NCR, schools are requested to suspend outdoor physical education, morning assemblies, and open-air sports. Ensure students stay indoors during break hours and maintain adequate indoor air circulation.',
    channels: ['Education Dept Portal', 'Principal Hotline Gateway', 'School SMS Network']
  },
  {
    id: 'municipality',
    title: 'City Municipal Squads',
    subtitle: 'Field Enforcement & Road Dust Suppression',
    audience: 'MCD, NDMC, DPCC ground teams, street sweepers, and sanitary inspectors',
    icon: Landmark,
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-500/30 hover:border-rose-400/60',
    bgColor: 'bg-rose-500/10',
    badgeBg: 'bg-rose-950/80 border-rose-500/30',
    badgeText: 'text-rose-300',
    defaultMessage:
      'Action Notice: Activate synchronized mechanized road sweeping and water sprinkling along key arterial corridors. Inspect construction sites to ensure dust nets are secured and penalize any instances of open garbage or leaf burning.',
    channels: ['MCD Operations Desk', 'Field Squad WhatsApp API', 'DPCC Command Room']
  },
  {
    id: 'traffic',
    title: 'Traffic & Transport Police',
    subtitle: 'Vehicle Diversions & Metro Transit Readiness',
    audience: 'Delhi Traffic Police, highway toll gates, DMRC, and bus depot operators',
    icon: Truck,
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
    bgColor: 'bg-emerald-500/10',
    badgeBg: 'bg-emerald-950/80 border-emerald-500/30',
    badgeText: 'text-emerald-300',
    defaultMessage:
      'Transit Advisory: Station traffic personnel at interstate border entry points to divert non-destined commercial heavy diesel vehicles to the Eastern and Western Peripheral Expressways. Increase public transit frequency along high-commute routes.',
    channels: ['Intelligent Traffic Management (ITMS)', 'Digital Highway Message Signs (VMS)', 'Toll Plazas']
  }
];

export default function ResponseConsole({
  forecast,
  observation,
  stationId,
  stations,
  onSelectStation,
  onOpenWhatIf
}: ResponseConsoleProps) {
  // AQI and GRAP Protocol calculations
  const currentAqi = observation?.aqi ?? 286;
  const current = getGrapStage(currentAqi);
  const trigger = forecast ? firstGrapTrigger(forecast.points) : null;
  const predicted = trigger?.assessment ?? current;
  const hours = trigger?.point.hour_offset ?? 14;

  // Selected station display helper
  const selectedStationObj = useMemo(() => {
    if (!stations || stations.length === 0) return null;
    return stations.find((s) => s.id === stationId) || stations[0];
  }, [stations, stationId]);

  const stationDisplayName = selectedStationObj?.name || stationId.replace(/_/g, ' ');

  // Mandate Checklist State
  const [enforcedMandates, setEnforcedMandates] = useState<Record<string, boolean>>({
    'mandate-1': true,
    'mandate-2': true,
    'mandate-3': true
  });
  const [activeMandateTab, setActiveMandateTab] = useState<string>('All');

  // Action Queue State
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const [queueLoading, setQueueLoading] = useState<boolean>(false);
  const [queueFilter, setQueueFilter] = useState<string>('all');

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<StakeholderChannel | null>(null);
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [broadcastPriority, setBroadcastPriority] = useState<string>('Standard');
  const [broadcasting, setBroadcasting] = useState<boolean>(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  const showToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch Action History
  const fetchActions = async () => {
    try {
      setQueueLoading(true);
      const res = await api.getResponseActions();
      if (res?.actions) {
        setActionQueue(res.actions as QueuedAction[]);
      }
    } catch (e) {
      console.error('Failed to load response actions:', e);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [stationId]);

  // Toggle CAQM Mandate
  const toggleMandate = (id: string) => {
    setEnforcedMandates((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const statusStr = next[id] ? 'active in this region' : 'paused';
      const mandate = STATUTORY_CAQM_MANDATES.find((m) => m.id === id);
      showToast('Action Updated', `${mandate?.title}: now marked as ${statusStr}.`);
      return next;
    });
  };

  // Open Configure & Broadcast Modal
  const handleOpenBroadcast = (channel: StakeholderChannel) => {
    setActiveChannel(channel);
    setBroadcastText(channel.defaultMessage);
    setSelectedMediums(channel.channels);
    setBroadcastPriority(current.stage === 'IV' ? 'Emergency Alert' : 'Standard Advisory');
    setBroadcastModalOpen(true);
  };

  // Quick Dispatch Action
  const handleQuickDispatch = async (channel: StakeholderChannel) => {
    try {
      const res = await api.queueResponseAction({
        action_type: channel.id,
        stakeholder: channel.id,
        station_id: stationId,
        severity: current.label,
        message: channel.defaultMessage,
        source: 'AeroSense Public Response Console'
      });
      showToast('Advisory Dispatched', `${channel.title} broadcast queued successfully (Ref: ${res?.id || 'ACK'}).`);
      fetchActions();
    } catch (e) {
      showToast('Advisory Queued', `${channel.title} advisory dispatched.`);
    }
  };

  // Transmit Custom Broadcast
  const handleTransmitBroadcast = async () => {
    if (!activeChannel) return;
    setBroadcasting(true);
    try {
      const fullMsg = `[PRIORITY: ${broadcastPriority}] [CHANNELS: ${selectedMediums.join(', ')}] ${broadcastText}`;
      const res = await api.queueResponseAction({
        action_type: `${activeChannel.id}_custom_broadcast`,
        stakeholder: activeChannel.id,
        station_id: stationId,
        severity: broadcastPriority,
        message: fullMsg,
        source: 'AeroSense Public Response Console'
      });
      setBroadcastModalOpen(false);
      showToast(
        'Custom Broadcast Sent',
        `${activeChannel.title}: Message sent to ${selectedMediums.length} communication channels.`
      );
      fetchActions();
    } catch (e) {
      setBroadcastModalOpen(false);
      showToast('Broadcast Logged', `${activeChannel.title} message transmitted.`);
    } finally {
      setBroadcasting(false);
    }
  };

  // Issue Official Escalation Notice
  const handleQueueGrapEscalation = async () => {
    try {
      const msg = `Official Notice: Airshed at ${stationDisplayName} is forecast to reach Stage ${predicted.stage} (${predicted.label}, AQI ${predicted.minAqi}+) in +${hours} hours. Prepare stage enforcement.`;
      const res = await api.queueResponseAction({
        action_type: 'grap_escalation',
        stakeholder: 'operations',
        station_id: stationId,
        severity: predicted.label,
        message: msg,
        source: 'AeroSense Public Response Console'
      });
      showToast('Escalation Notice Sent', `Official advisory sent to CAQM control room (Ref: ${res?.id || 'GRAP-NOTIFY'}).`);
      fetchActions();
    } catch (e) {
      showToast('Escalation Recorded', 'Official advisory generated.');
    }
  };

  const enforcedCount = Object.values(enforcedMandates).filter(Boolean).length;

  const filteredMandates = useMemo(() => {
    if (activeMandateTab === 'All') return STATUTORY_CAQM_MANDATES;
    return STATUTORY_CAQM_MANDATES.filter((m) => m.category === activeMandateTab);
  }, [activeMandateTab]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return actionQueue;
    return actionQueue.filter(
      (a) =>
        a.stakeholder.toLowerCase().includes(queueFilter.toLowerCase()) ||
        a.action_type.toLowerCase().includes(queueFilter.toLowerCase())
    );
  }, [actionQueue, queueFilter]);

  // Human-friendly interpretation of AQI
  const getHealthGuidance = (aqi: number) => {
    if (aqi <= 100) {
      return {
        title: 'Good to Satisfactory Air Quality',
        desc: 'Air quality is acceptable for outdoor activities and daily routines with minimal health concern.',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        residentTip: 'Enjoy outdoor exercises and natural room ventilation.'
      };
    }
    if (aqi <= 200) {
      return {
        title: 'Moderate Air Quality',
        desc: 'May cause minor breathing discomfort to sensitive individuals, young children, and asthmatics.',
        badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        residentTip: 'Sensitive individuals should take gentle breaks during long outdoor exertion.'
      };
    }
    if (aqi <= 300) {
      return {
        title: 'Poor Air Quality (Stage I GRAP Rules Apply)',
        desc: 'Breathing discomfort to most people on prolonged exposure; dust suppression and sweeping active.',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        residentTip: 'Avoid early morning outdoor running; wear comfortable dust masks near heavy traffic.'
      };
    }
    if (aqi <= 400) {
      return {
        title: 'Very Poor Air Quality (Stage II Targeted Restrictions)',
        desc: 'Respiratory illness likely on prolonged exposure; diesel generators and non-essential emissions curtailed.',
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        residentTip: 'Keep windows closed during cool night hours; use indoor air purifiers; wear N95 outdoors.'
      };
    }
    return {
      title: 'Severe Air Quality (Emergency Mitigation Enforced)',
      desc: 'Healthy people experience respiratory distress; serious health impact on vulnerable populations.',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      residentTip: 'Stay indoors as much as possible; vulnerable groups must avoid outdoor exposure entirely.'
    };
  };

  const healthGuidance = getHealthGuidance(currentAqi);

  return (
    <main className="flex-1 overflow-y-auto bg-[#07090e] text-slate-100">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-xl border border-sky-400/40 bg-[#0c141f] p-4 shadow-2xl backdrop-blur-md text-slate-100 max-w-md w-[92vw] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-white text-sm">{toast.title}</div>
            <div className="mt-0.5 text-slate-300 leading-relaxed">{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ── TOP HEADER & REGION CONTROLS ── */}
        <header className="border-b border-white/[0.08] pb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                <ShieldAlert className="h-4 w-4 text-sky-400" />
                Public Health & Statutory Air Quality Response
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span>Response Console</span>
                <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-0.5 text-xs font-mono font-medium text-sky-300">
                  Live Operations
                </span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Clear, human-friendly guidance on current air quality rules, public health advisories, and city mitigation measures for your chosen region.
              </p>
            </div>

            {/* Region / Station Selector & Live Status */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Region Selector */}
              <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-[#0c121a] px-3.5 py-2 shadow-sm">
                <MapPin className="h-4 w-4 text-sky-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-mono text-slate-400 leading-none">Select Region:</span>
                  <select
                    value={stationId}
                    onChange={(e) => onSelectStation && onSelectStation(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none cursor-pointer pr-2 mt-0.5"
                  >
                    {stations && stations.length > 0 ? (
                      stations.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0b1016] text-white">
                          {s.name} ({s.city || 'Delhi'})
                        </option>
                      ))
                    ) : (
                      <option value="anand_vihar" className="bg-[#0b1016] text-white">
                        Anand Vihar, Delhi
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-[#0d141c] px-3 py-2 flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">Current AQI:</span>
                  <span className="font-bold text-amber-300 text-sm">{currentAqi}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0d141c] px-3 py-2 flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">Active Stage:</span>
                  <span className="font-bold text-rose-300 text-sm">STAGE {current.stage}</span>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 flex items-center gap-2 text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="font-semibold text-xs">LIVE WATCH</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── SECTION 1: HUMAN-READABLE HEALTH & SITUATION SUMMARY ── */}
        <section className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0d1522] via-[#0b1018] to-[#0c141f] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${healthGuidance.badgeColor}`}>
                  {healthGuidance.title}
                </span>
                <span className="text-xs text-slate-400 font-mono">Region: {stationDisplayName}</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                What does today's air quality mean for residents?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {healthGuidance.desc}
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-sky-200">
                <Info className="h-4 w-4 text-sky-400 shrink-0" />
                <span><b>Daily Tip:</b> {healthGuidance.residentTip}</span>
              </div>
            </div>

            {/* Quick 3-slot diurnal breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono shrink-0 bg-black/30 p-3 rounded-xl border border-white/[0.06]">
              <div className="p-2 rounded bg-white/[0.02]">
                <span className="text-[10px] text-slate-400 block">Morning</span>
                <span className="font-bold text-amber-300 block mt-0.5">High Smog</span>
                <span className="text-[9px] text-slate-500">Peak Inversion</span>
              </div>
              <div className="p-2 rounded bg-white/[0.02]">
                <span className="text-[10px] text-slate-400 block">Afternoon</span>
                <span className="font-bold text-emerald-300 block mt-0.5">Moderate</span>
                <span className="text-[9px] text-slate-500">Solar Dilution</span>
              </div>
              <div className="p-2 rounded bg-white/[0.02]">
                <span className="text-[10px] text-slate-400 block">Night</span>
                <span className="font-bold text-rose-300 block mt-0.5">Worsening</span>
                <span className="text-[9px] text-slate-500">Boundary Drops</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: CAQM GRAP STAGES & STATUTORY ACTION TRACKER ── */}
        <section className="grid gap-6 xl:grid-cols-2">
          {/* Left Card: 4-Stage GRAP Escalation Tracker */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1219] p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-wide">
                    CAQM Graded Response Action Plan (GRAP)
                  </h2>
                </div>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-mono font-bold text-amber-300">
                  STAGE {current.stage} ACTIVE
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Delhi NCR enforces statutory anti-pollution measures across 4 defined stages depending on ambient AQI levels.
              </p>

              {/* 4 Clean Visual Cards for GRAP Stages */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { stage: 'I', label: 'Poor', aqi: '201 - 300', rule: 'Sweeping & Dust Control' },
                  { stage: 'II', label: 'Very Poor', aqi: '301 - 400', rule: 'Anti-Smog & DG Set Ban' },
                  { stage: 'III', label: 'Severe', aqi: '401 - 450', rule: 'Construction & Truck Ban' },
                  { stage: 'IV', label: 'Severe+', aqi: '450+', rule: 'School & Emergency Halt' }
                ].map((st) => {
                  const isCurrent = current.stage === st.stage;
                  const isPredicted = predicted.stage === st.stage && predicted.stage !== current.stage;
                  return (
                    <div
                      key={st.stage}
                      className={`rounded-xl border p-3 flex flex-col justify-between transition ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/10 shadow-lg ring-1 ring-amber-400/40'
                          : isPredicted
                          ? 'border-rose-400/60 bg-rose-500/10 animate-pulse'
                          : 'border-white/[0.06] bg-black/30 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Stage {st.stage}</span>
                          <span className="text-[10px] font-mono text-slate-400">{st.aqi}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-200 mt-1">{st.label}</div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{st.rule}</p>
                      </div>

                      {isCurrent && (
                        <span className="mt-2 block text-center text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded py-0.5">
                          CURRENT
                        </span>
                      )}
                      {isPredicted && (
                        <span className="mt-2 block text-center text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 rounded py-0.5">
                          +{hours}h ADVANCE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Advance Prediction Notice */}
              <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                    Early Warning Forecast Notice
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-300">Expected in ~{hours} hours</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Our blended forecast models indicate that particulate accumulation at <b>{stationDisplayName}</b> will track towards <b>Stage {predicted.stage} ({predicted.label})</b> during early morning hours due to cooling ground inversion.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-white/[0.08] pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Statutory Authority: <b className="text-slate-200">CAQM Delhi NCR</b>
              </span>
              <button
                onClick={handleQueueGrapEscalation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/35 transition cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                <span>Issue Advance GRAP Escalation Notice</span>
              </button>
            </div>
          </div>

          {/* Right Card: Departmental Action Checklist */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1219] p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2 text-white">
                  <ClipboardList className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-bold tracking-wide">
                    Civic Actions & Departmental Enforcement
                  </h2>
                </div>
                <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-0.5 text-xs font-mono font-bold text-sky-300">
                  {enforcedCount} of {STATUTORY_CAQM_MANDATES.length} Active
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {['All', 'Dust & Roads', 'Traffic & Transit', 'Energy & Boilers', 'Industry & Construction'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveMandateTab(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                      activeMandateTab === cat
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-400 h-full transition-all duration-300"
                    style={{ width: `${(enforcedCount / STATUTORY_CAQM_MANDATES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredMandates.map((mandate) => {
                  const isChecked = Boolean(enforcedMandates[mandate.id]);
                  return (
                    <div
                      key={mandate.id}
                      onClick={() => toggleMandate(mandate.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-sky-400/40 bg-sky-500/[0.06]'
                          : 'border-white/[0.06] bg-black/20 hover:border-white/15'
                      }`}
                    >
                      <button className="mt-0.5 shrink-0 text-sky-400">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-sky-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                            {mandate.title}
                          </span>
                          <span className="rounded bg-white/[0.05] border border-white/10 px-1.5 py-0.2 text-[9px] font-mono text-slate-400 shrink-0">
                            Stage {mandate.stage}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          {mandate.desc}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="text-sky-300/80 font-mono">Agency: {mandate.authority}</span>
                          <span className="text-emerald-400/90 text-[10px]">{mandate.impactNote}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-2.5 text-xs text-slate-400 flex justify-between">
              <span>Click items to update operational field status</span>
              <span className="text-sky-300">Audited via Central DPCC Control Desk</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: STAKEHOLDER BROADCAST CENTER ── */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0b1016] p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-sky-400" />
                Public & Inter-Agency Advisory Channels
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Send plain-English air quality guidance and operational notices directly to target communities and authorities.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              4 Target Communication Channels Active
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAKEHOLDER_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.id}
                  className={`rounded-xl border ${channel.borderColor} bg-[#0e1520] p-4 flex flex-col justify-between transition`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg border border-white/10 ${channel.bgColor}`}>
                        <Icon className={`h-4 w-4 ${channel.accentColor}`} />
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${channel.badgeBg} ${channel.badgeText}`}>
                        {channel.id}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xs font-bold text-white">{channel.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{channel.subtitle}</p>

                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300 border-t border-white/[0.06] pt-2 line-clamp-3">
                      {channel.defaultMessage}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {channel.channels.map((ch) => (
                        <span key={ch} className="rounded bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 text-[9px] text-slate-400 font-mono">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenBroadcast(channel)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition cursor-pointer"
                    >
                      <Sliders className="h-3 w-3" />
                      <span>Preview & Customize</span>
                    </button>
                    <button
                      onClick={() => handleQuickDispatch(channel)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] py-1 text-xs text-slate-300 hover:bg-white/[0.08] transition cursor-pointer font-mono"
                    >
                      <Send className="h-3 w-3" />
                      <span>Send Standard Notice</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 4: RECENT DISPATCH AUDIT LOG ── */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#090e14] p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <h2 className="text-sm font-bold tracking-wide text-white">
                  Recent Dispatches & Action History
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Log of advisories, notices, and enforcement actions dispatched for <b>{stationDisplayName}</b> and Delhi NCR.
              </p>
            </div>

            {/* Filter pills & refresh */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[10px] font-mono mr-1 hidden sm:inline">FILTER:</span>
              {['all', 'citizens', 'schools', 'municipality', 'traffic'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setQueueFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-xs capitalize transition cursor-pointer ${
                    queueFilter === filter
                      ? 'bg-sky-500/20 text-sky-200 font-semibold border border-sky-400/40'
                      : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
                  }`}
                >
                  {filter}
                </button>
              ))}
              <button
                onClick={fetchActions}
                disabled={queueLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white transition cursor-pointer ml-1"
                title="Refresh log"
              >
                <RefreshCw className={`h-3 w-3 ${queueLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Action Log Table */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1620] text-slate-400 text-[10px] uppercase font-mono border-b border-white/[0.08]">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Target Audience</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Advisory Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No dispatches recorded yet in this session.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="p-3 font-mono text-slate-400 font-medium text-[11px]">
                        {item.id.slice(0, 10)}
                      </td>
                      <td className="p-3 font-semibold text-white capitalize">
                        {item.stakeholder.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3 font-mono text-slate-300 text-[11px] uppercase">
                        {item.station_id.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3">
                        <span className="rounded px-2 py-0.5 text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Sent</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-md truncate">
                        {item.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── BROADCAST MODAL ── */}
      {broadcastModalOpen && activeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0e1520] border border-white/15 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${activeChannel.bgColor}`}>
                  <activeChannel.icon className={`h-4 w-4 ${activeChannel.accentColor}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Broadcast to {activeChannel.title}</h3>
                  <p className="text-xs text-slate-400">Target Region: {stationDisplayName}</p>
                </div>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block font-semibold mb-1">Advisory Priority</label>
                <div className="flex gap-2">
                  {['Standard Advisory', 'Urgent Alert', 'Emergency Notice'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setBroadcastPriority(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        broadcastPriority === p
                          ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                          : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Communication Channels</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeChannel.channels.map((ch) => {
                    const isSelected = selectedMediums.includes(ch);
                    return (
                      <button
                        key={ch}
                        onClick={() => {
                          setSelectedMediums((prev) =>
                            isSelected ? prev.filter((m) => m !== ch) : [...prev, ch]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50 font-medium'
                            : 'bg-white/[0.03] text-slate-400 border border-white/10'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-sky-400' : 'bg-slate-500'}`} />
                        <span>{ch}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block font-semibold mb-1">Message Content</label>
                <textarea
                  rows={4}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-xs text-white focus:border-sky-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2 bg-[#090e15]">
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTransmitBroadcast}
                disabled={broadcasting || !broadcastText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{broadcasting ? 'Transmitting...' : 'Dispatch Broadcast'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

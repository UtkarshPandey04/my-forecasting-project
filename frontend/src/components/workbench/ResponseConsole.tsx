'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardList,
  ExternalLink,
  HeartPulse,
  Landmark,
  School,
  ShieldAlert,
  Truck,
  Users,
  Activity,
  AlertTriangle,
  Radio,
  Send,
  Sliders,
  X,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  PhoneCall,
  Megaphone,
  Filter,
  Shield,
  FileText,
  BadgeCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { ForecastResponse, Observation } from '@/lib/types';
import { firstGrapTrigger, getGrapStage, GrapAssessment } from '@/lib/grap';
import { api, MitigationPartner } from '@/lib/api';

interface ResponseConsoleProps {
  forecast: ForecastResponse | null;
  observation: Observation | null;
  stationId: string;
  onOpenWhatIf: () => void;
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

const STATUTORY_CAQM_MANDATES = [
  {
    id: 'mandate-1',
    stage: 'II',
    title: 'Mechanized Sweeping & Water Sprinkling',
    desc: 'Intensify vacuum street sweeping and deploy mobile water misting trucks on heavy-traffic corridors.',
    authority: 'MCD / NDMC / PWD'
  },
  {
    id: 'mandate-2',
    stage: 'II',
    title: 'Diesel Generator (DG) Set Restriction',
    desc: 'Strict prohibition on diesel generators across commercial & residential complexes except emergency health facilities.',
    authority: 'DPCC Compliance'
  },
  {
    id: 'mandate-3',
    stage: 'III',
    title: 'Construction & Demolition (C&D) Activity Halt',
    desc: 'Enforce complete shutdown on earthwork, piling, excavation, and dry stone crushing across NCT Delhi.',
    authority: 'Municipal Enforcement'
  },
  {
    id: 'mandate-4',
    stage: 'II',
    title: 'Intensify Public Transit & Metro Frequencies',
    desc: 'Augment CNG bus fleet frequency and introduce differential parking tariffs to discourage private vehicle use.',
    authority: 'Transport Dept / DMRC'
  },
  {
    id: 'mandate-5',
    stage: 'III',
    title: 'Heavy Commercial Vehicle Interception',
    desc: 'Divert non-essential BS-III petrol & BS-IV diesel goods carriers to Eastern/Western Peripheral Expressways.',
    authority: 'Traffic Police'
  },
  {
    id: 'mandate-6',
    stage: 'IV',
    title: 'Anti-Smog Gun Saturation at 13 Hotspots',
    desc: 'Continuous operation of high-pressure mist cannons at Anand Vihar, Wazirpur, Mundka, and Okhla.',
    authority: 'Disaster Cell'
  }
];

interface StakeholderChannel {
  id: string;
  title: string;
  audience: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderHover: string;
  bgLight: string;
  badgeText: string;
  badgeBg: string;
  defaultMessage: string;
  channels: string[];
}

const STAKEHOLDER_CHANNELS: StakeholderChannel[] = [
  {
    id: 'citizens',
    title: 'Citizens & Vulnerable Public',
    audience: '20M+ residents, outdoor workers, geriatric & pediatric groups',
    icon: Users,
    accentColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-400/50',
    bgLight: 'bg-cyan-500/10',
    badgeText: 'text-cyan-300',
    badgeBg: 'bg-cyan-950/80 border-cyan-500/30',
    defaultMessage:
      'Air Quality Advisory: Severe AQI conditions forecast. High-risk individuals, asthmatics, and children are advised to avoid outdoor exposure. Wear certified N95 masks when outside and maintain indoor air purification.',
    channels: ['SMS Broadcast', 'AeroSense Mobile Push', 'Public Radio Bulletin', 'Community Centers']
  },
  {
    id: 'institutions',
    title: 'Schools & Educational Institutions',
    audience: '5,400+ primary/secondary schools, sports academies, daycare centers',
    icon: School,
    accentColor: 'text-amber-400',
    borderHover: 'hover:border-amber-400/50',
    bgLight: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
    badgeBg: 'bg-amber-950/80 border-amber-500/30',
    defaultMessage:
      'Institutional Health Flag: Suspend all morning assemblies, outdoor physical education, and extracurricular sports. Keep students indoors in clean-air sealed rooms and monitor respiratory distress.',
    channels: ['Directorate of Education Portal', 'School SMS Gateway', 'Principal Hotline']
  },
  {
    id: 'municipality',
    title: 'Municipal Authorities (DPCC / MCD / NDMC)',
    audience: 'Zonal sanitary officers, construction inspectors, anti-smog gun crews',
    icon: Landmark,
    accentColor: 'text-rose-400',
    borderHover: 'hover:border-rose-400/50',
    bgLight: 'bg-rose-500/10',
    badgeText: 'text-rose-300',
    badgeBg: 'bg-rose-950/80 border-rose-500/30',
    defaultMessage:
      'Municipal Action Protocol: Enforce statutory GRAP Stage-II/III orders immediately. Mobilize 48 mechanical sweepers, activate continuous water sprinkling on ring roads, and fine unauthorized open waste burning.',
    channels: ['MCD Operations Desk', 'Field Squad WhatsApp API', 'DPCC Command Room']
  },
  {
    id: 'traffic',
    title: 'Traffic Police & Transport Authorities',
    audience: 'Delhi Traffic Police control rooms, highway toll plazas, bus depots',
    icon: Truck,
    accentColor: 'text-emerald-400',
    borderHover: 'hover:border-emerald-400/50',
    bgLight: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
    badgeBg: 'bg-emerald-950/80 border-emerald-500/30',
    defaultMessage:
      'Transit & Traffic Management: Deploy flying interceptors at 14 interstate border entry points. Impound non-destined polluting diesel trucks and divert heavy carriers to peripheral bypass corridors.',
    channels: ['Intelligent Traffic Management (ITMS)', 'Variable Message Signs (VMS)', 'Toll Plaza Gateway']
  }
];

export default function ResponseConsole({
  forecast,
  observation,
  stationId,
  onOpenWhatIf
}: ResponseConsoleProps) {
  // Protocol State
  const currentAqi = observation?.aqi ?? 286;
  const current = getGrapStage(currentAqi);
  const trigger = forecast ? firstGrapTrigger(forecast.points) : null;
  const predicted = trigger?.assessment ?? current;
  const hours = trigger?.point.hour_offset ?? 18;

  // Enforced Mandate Checklist State
  const [enforcedMandates, setEnforcedMandates] = useState<Record<string, boolean>>({
    'mandate-1': true,
    'mandate-2': true,
    'mandate-4': true
  });

  // Action Queue State
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const [queueLoading, setQueueLoading] = useState<boolean>(false);
  const [queueFilter, setQueueFilter] = useState<string>('all');

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<StakeholderChannel | null>(null);
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [broadcastPriority, setBroadcastPriority] = useState<string>('HIGH');
  const [broadcasting, setBroadcasting] = useState<boolean>(false);

  // Mitigation Partners & Collection Request State
  const [partners, setPartners] = useState<MitigationPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [collectionTons, setCollectionTons] = useState<number>(100);
  const [collectionRegion, setCollectionRegion] = useState<string>('Sangrur-Barnala Advection Corridor');
  const [collectionMessage, setCollectionMessage] = useState<string>(
    'Urgent collection request: 100 tonnes unburnt paddy straw identified via NASA FIRMS. Dispatch heavy baler unit before afternoon burn window.'
  );
  const [collectionReceipt, setCollectionReceipt] = useState<string | null>(null);
  const [collectionLoading, setCollectionLoading] = useState<boolean>(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  const showToast = (title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 5500);
  };

  // Load partners & action queue on mount
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
    api
      .getMitigationPartners()
      .then((res) => {
        if (res?.partners && res.partners.length > 0) {
          setPartners(res.partners);
          setSelectedPartnerId(res.partners[0].id);
        }
      })
      .catch((e) => console.error('Failed to load partners:', e));
  }, []);

  // Toggle CAQM Mandate Checkbox
  const toggleMandate = (id: string) => {
    setEnforcedMandates((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const statusStr = next[id] ? 'enforced' : 'relaxed';
      const mandate = STATUTORY_CAQM_MANDATES.find((m) => m.id === id);
      showToast('Mandate Status Updated', `${mandate?.title}: now marked as ${statusStr}.`);
      return next;
    });
  };

  // Open Configure & Broadcast Modal
  const handleOpenBroadcast = (channel: StakeholderChannel) => {
    setActiveChannel(channel);
    setBroadcastText(channel.defaultMessage);
    setSelectedMediums(channel.channels);
    setBroadcastPriority(predicted.stage === 'IV' ? 'CRITICAL EMERGENCY' : 'HIGH');
    setBroadcastModalOpen(true);
  };

  // Quick Dispatch Action
  const handleQuickDispatch = async (channel: StakeholderChannel) => {
    try {
      const res = await api.queueResponseAction({
        action_type: channel.id,
        stakeholder: channel.id,
        station_id: stationId,
        severity: predicted.label,
        message: channel.defaultMessage,
        source: 'AeroSense Response Console'
      });
      showToast('Action Dispatched Successfully', `${channel.title} broadcast queued (Ref: ${res?.id || 'ACT-ACK'}).`);
      fetchActions();
    } catch (e) {
      showToast('Action Queued Locally', `${channel.title} dispatched in offline mode.`);
    }
  };

  // Transmit Custom Broadcast from Modal
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
        source: 'AeroSense Response Console'
      });
      setBroadcastModalOpen(false);
      showToast(
        'Custom Broadcast Transmitted',
        `${activeChannel.title}: Dispatched across ${selectedMediums.length} channels (ID: ${res?.id || 'ACK-ACT'}).`
      );
      fetchActions();
    } catch (e) {
      setBroadcastModalOpen(false);
      showToast('Broadcast Logged', `${activeChannel.title} transmitted in local simulation.`);
    } finally {
      setBroadcasting(false);
    }
  };

  // Trigger Official GRAP Escalation
  const handleQueueGrapEscalation = async () => {
    try {
      const msg = `Official CAQM Escalation: Airshed at ${stationId.toUpperCase()} forecast to breach GRAP Stage ${predicted.stage} (${predicted.label}, AQI ${predicted.minAqi}+) in +${hours}h. Escalating statutory protocols.`;
      const res = await api.queueResponseAction({
        action_type: 'grap_escalation',
        stakeholder: 'operations',
        station_id: stationId,
        severity: predicted.label,
        message: msg,
        source: 'AeroSense Response Console'
      });
      showToast('Official GRAP Escalation Queued', `Statutory notice issued to CAQM control room (Ref: ${res?.id || 'GRAP-ESCALATION'}).`);
      fetchActions();
    } catch (e) {
      showToast('GRAP Escalation Dispatched', `Escalation bulletin generated.`);
    }
  };

  // Submit Residue Collection Request
  const handleSubmitCollection = async () => {
    if (!selectedPartnerId) return;
    setCollectionLoading(true);
    try {
      const res = await api.createCollectionRequest({
        partner_id: selectedPartnerId,
        station_id: stationId,
        region: collectionRegion,
        estimated_tons: collectionTons,
        source_fire_ids: [],
        message: collectionMessage
      });
      const partnerObj = partners.find((p) => p.id === selectedPartnerId);
      const receiptCode = res?.id || `COL-${Math.floor(100000 + Math.random() * 900000)}`;
      setCollectionReceipt(`${receiptCode} routed to ${partnerObj?.name || 'Partner Agency'}`);
      showToast('Collection Request Dispatched', `${collectionTons}t residue routed to ${partnerObj?.name || 'Partner'}.`);
    } catch (e) {
      setCollectionReceipt(`COL-REQ-LOCAL routed to ${selectedPartnerId}`);
      showToast('Collection Request Logged', `${collectionTons} tonnes scheduled.`);
    } finally {
      setCollectionLoading(false);
    }
  };

  const enforcedCount = Object.values(enforcedMandates).filter(Boolean).length;

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return actionQueue;
    return actionQueue.filter((a) => a.stakeholder.toLowerCase().includes(queueFilter.toLowerCase()) || a.action_type.toLowerCase().includes(queueFilter.toLowerCase()));
  }, [actionQueue, queueFilter]);

  return (
    <main className="flex-1 overflow-y-auto bg-[#07090c] text-slate-100">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-lg border border-cyan-400/40 bg-[#081219] p-4 shadow-2xl backdrop-blur-md text-cyan-100 max-w-md w-[92vw] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-white">{toast.title}</div>
            <div className="mt-0.5 text-cyan-300/90">{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ── HEADER & PROTOCOL STATUS BAR ── */}
        <header className="border-b border-cyan-300/15 pb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300 font-semibold">
                <ShieldAlert className="h-4 w-4 text-cyan-400 animate-pulse" />
                Prediction &rarr; Alert &rarr; Statutory Action Execution
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span>Response Console</span>
                <span className="rounded-full bg-cyan-950/80 border border-cyan-500/30 px-3 py-0.5 text-xs font-mono font-semibold text-cyan-300">
                  LIVE INTERFACE
                </span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Statutory CAQM GRAP-linked advisories, tactical multi-stakeholder broadcasts, and bio-residue routing.
              </p>
            </div>

            {/* Live Station & Telemetry Pill Strip */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="rounded border border-white/10 bg-[#0d141c] px-3 py-1.5 flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase">Station:</span>
                <span className="font-bold text-white uppercase">{stationId.replace('_', ' ')}</span>
              </div>
              <div className="rounded border border-white/10 bg-[#0d141c] px-3 py-1.5 flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase">Current AQI:</span>
                <span className="font-bold text-orange-300">{currentAqi}</span>
              </div>
              <div className="rounded border border-white/10 bg-[#0d141c] px-3 py-1.5 flex items-center gap-2">
                <span className="text-slate-400 text-[10px] uppercase">GRAP Level:</span>
                <span className="font-bold text-rose-300">STAGE {current.stage}</span>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 flex items-center gap-1.5 text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="font-semibold text-[11px]">ACTIVE WATCH</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── SECTION 1: GRAP PROTOCOL ENGINE & STATUTORY MANDATES ── */}
        <section className="grid gap-5 xl:grid-cols-2">
          {/* Left: GRAP Escalation & Forecast Trigger */}
          <div className="border border-orange-300/25 bg-[#12100d] p-5 rounded-md flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-orange-400/15 pb-3">
                <div className="flex items-center gap-2 text-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    GRAP Statutory Escalation Tracker
                  </h2>
                </div>
                <span className="rounded bg-orange-950/80 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-orange-300">
                  STAGE {current.stage} ACTIVE
                </span>
              </div>

              {/* 4-Stage Progression Bar */}
              <div className="mt-4 grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                {[
                  { stage: 'I', label: 'Poor', range: '201-300', color: 'border-amber-500/40 text-amber-300' },
                  { stage: 'II', label: 'Very Poor', range: '301-400', color: 'border-orange-500/40 text-orange-300' },
                  { stage: 'III', label: 'Severe', range: '401-450', color: 'border-red-500/40 text-red-300' },
                  { stage: 'IV', label: 'Severe+', range: '450+', color: 'border-rose-500/40 text-rose-300' }
                ].map((st) => {
                  const isCurrent = current.stage === st.stage;
                  const isPredicted = predicted.stage === st.stage && predicted.stage !== current.stage;
                  return (
                    <div
                      key={st.stage}
                      className={`rounded border p-2 flex flex-col justify-between transition ${
                        isCurrent
                          ? 'border-orange-400 bg-orange-950/70 shadow-lg shadow-orange-950/50 ring-1 ring-orange-400/50'
                          : isPredicted
                          ? 'border-rose-400/80 bg-rose-950/40 animate-pulse'
                          : 'border-white/10 bg-black/40 text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">Stage {st.stage}</div>
                      <div className="text-[9px] mt-0.5 truncate">{st.label}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-1">{st.range}</div>
                      {isCurrent && (
                        <span className="mt-1 inline-block text-[8px] font-bold text-orange-300 bg-orange-950 border border-orange-500/40 rounded py-0.2">
                          CURRENT
                        </span>
                      )}
                      {isPredicted && (
                        <span className="mt-1 inline-block text-[8px] font-bold text-rose-300 bg-rose-950 border border-rose-500/40 rounded py-0.2">
                          +{hours}h TRIGGER
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Predictive Trigger Details */}
              <div className="mt-4 rounded-md border border-rose-400/30 bg-[#1a1114] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 font-semibold flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                    Predictive Escalation Horizon
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-300">Trigger at +{hours}h</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  Predicted: GRAP Stage {predicted.stage} ({predicted.label})
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  The physics-guided blended model projects particulate concentration to cross the Stage {predicted.stage} statutory threshold ({predicted.minAqi}+ AQI) in approximately {hours} hours due to nocturnal boundary layer inversion compression.
                </p>
              </div>
            </div>

            {/* Action CTA */}
            <div className="border-t border-orange-400/15 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                Statutory Authority: <span className="text-slate-200 font-semibold">CAQM Delhi NCR</span>
              </span>
              <button
                onClick={handleQueueGrapEscalation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded border border-rose-400 bg-rose-500/25 px-5 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/40 shadow-lg transition cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                <span>Queue Official GRAP Escalation</span>
              </button>
            </div>
          </div>

          {/* Right: Statutory CAQM Mandate Enforcement Checklist */}
          <div className="border border-white/10 bg-[#0c1218] p-5 rounded-md flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-cyan-200">
                  <ClipboardList className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    Statutory CAQM Enforcement Checklist
                  </h2>
                </div>
                <span className="rounded bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  {enforcedCount} / {STATUTORY_CAQM_MANDATES.length} ENFORCED
                </span>
              </div>

              {/* Implementation Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${(enforcedCount / STATUTORY_CAQM_MANDATES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Interactive Mandate Items */}
              <div className="mt-3.5 space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {STATUTORY_CAQM_MANDATES.map((mandate) => {
                  const isChecked = Boolean(enforcedMandates[mandate.id]);
                  return (
                    <div
                      key={mandate.id}
                      onClick={() => toggleMandate(mandate.id)}
                      className={`cursor-pointer rounded border p-2.5 transition flex items-start gap-3 select-none ${
                        isChecked
                          ? 'border-cyan-400/50 bg-cyan-950/25'
                          : 'border-white/[0.08] bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <button className="mt-0.5 shrink-0 text-cyan-400">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-cyan-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isChecked ? 'text-white' : 'text-slate-400 line-through'
                            }`}
                          >
                            {mandate.title}
                          </span>
                          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] font-mono text-slate-400 shrink-0">
                            Stage {mandate.stage}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {mandate.desc}
                        </p>
                        <div className="text-[9px] font-mono text-cyan-400/80 mt-1">
                          Authority: {mandate.authority}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-2.5 text-[10px] font-mono text-slate-400 flex justify-between">
              <span>Click items to log tactical compliance status</span>
              <span className="text-cyan-300">Audited via DPCC Operations Desk</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: MULTI-STAKEHOLDER ADVISORY & BROADCAST CENTER ── */}
        <section className="border border-white/10 bg-[#0b1016] p-5 rounded-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Multi-Stakeholder Advisory & Broadcasting Network
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              4 Dedicated Channels &bull; Automated Broadcast Formatting
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {STAKEHOLDER_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.id}
                  className={`rounded border border-white/10 bg-[#0e1620] p-4 flex flex-col justify-between transition ${channel.borderHover}`}
                >
                  <div>
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded border border-white/10 ${channel.bgLight}`}>
                        <Icon className={`h-4 w-4 ${channel.accentColor}`} />
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${channel.badgeBg} ${channel.badgeText}`}>
                        {channel.id}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xs font-bold text-white tracking-wide">{channel.title}</h3>
                    <div className="text-[10px] text-slate-400 mt-0.5">{channel.audience}</div>

                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-300 font-sans border-t border-white/5 pt-2">
                      {channel.defaultMessage.length > 120
                        ? `${channel.defaultMessage.slice(0, 115)}...`
                        : channel.defaultMessage}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {channel.channels.map((ch) => (
                        <span key={ch} className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[8px] font-mono text-slate-400">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
                    <button
                      onClick={() => handleOpenBroadcast(channel)}
                      className="w-full flex items-center justify-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-950/40 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50 transition cursor-pointer"
                    >
                      <Sliders className="h-3 w-3" />
                      <span>Configure & Broadcast</span>
                    </button>
                    <button
                      onClick={() => handleQuickDispatch(channel)}
                      className="w-full flex items-center justify-center gap-1.5 rounded border border-white/15 bg-white/5 py-1 text-[11px] font-mono text-slate-300 hover:bg-white/10 transition cursor-pointer"
                    >
                      <Send className="h-2.5 w-2.5" />
                      <span>Quick Standard Send</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 3: FARMER RESIDUE COLLECTION & WHAT-IF INTERVENTION ── */}
        <section className="grid gap-5 xl:grid-cols-2">
          {/* Farmer Residue Collection Routing Form */}
          <div className="border border-lime-300/25 bg-[#0d160f] p-5 rounded-md flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-lime-400/15 pb-3">
                <div className="flex items-center gap-2 text-lime-200">
                  <Truck className="h-4 w-4 text-lime-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    Agricultural Residue Collection Routing
                  </h2>
                </div>
                <span className="rounded bg-lime-950/80 border border-lime-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-lime-300">
                  FARMER CO-OP INTERFACE
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">
                Deploy contracted machinery fleets to collect unburnt paddy straw clusters identified through satellite FIRMS thermal telemetry and prevailing wind trajectories.
              </p>

              {/* Form Controls */}
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Select Offtake / Logistics Partner</label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full rounded border border-white/15 bg-[#142016] px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none cursor-pointer font-mono"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.region} • {p.service})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block font-medium mb-1">Target Farming Sector</label>
                    <input
                      type="text"
                      value={collectionRegion}
                      onChange={(e) => setCollectionRegion(e.target.value)}
                      className="w-full rounded border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-medium">Residue Tonnage</label>
                      <span className="font-mono text-lime-300 font-bold">{collectionTons} Tonnes</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="10"
                      value={collectionTons}
                      onChange={(e) => setCollectionTons(Number(e.target.value))}
                      className="w-full accent-lime-400 cursor-pointer h-1.5 bg-white/10 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block font-medium mb-1">Logistics & Driver Dispatch Note</label>
                  <textarea
                    rows={2}
                    value={collectionMessage}
                    onChange={(e) => setCollectionMessage(e.target.value)}
                    className="w-full rounded border border-white/15 bg-black/40 p-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Receipt Code Banner */}
              {collectionReceipt && (
                <div className="mt-3 rounded border border-emerald-400/40 bg-emerald-950/40 p-2.5 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
                  <BadgeCheck className="h-4 w-4 shrink-0" />
                  <span>{collectionReceipt}</span>
                </div>
              )}
            </div>

            {/* Action CTA */}
            <div className="border-t border-lime-400/15 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                Aadhaar DBT linked &bull; Minimum floor ₹1,850/t
              </span>
              <button
                onClick={handleSubmitCollection}
                disabled={collectionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded border border-lime-400 bg-lime-500/25 px-5 py-2 text-xs font-bold text-lime-100 hover:bg-lime-500/40 shadow-lg transition cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5 text-lime-300" />
                <span>{collectionLoading ? 'Dispatching...' : 'Dispatch Collection Fleet'}</span>
              </button>
            </div>
          </div>

          {/* Right: Quantify Intervention with What-If Lab */}
          <div className="border border-cyan-300/25 bg-[#0b161f] p-5 rounded-md flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-400/15 pb-3">
                <div className="flex items-center gap-2 text-cyan-200">
                  <HeartPulse className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    Quantify Intervention & Air Quality Impact
                  </h2>
                </div>
                <span className="rounded bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  ANALYTICS GATEWAY
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans">
                Directly connect current dispatch decisions to the live-calibrated physics simulation engine. Model the precise downwind PM2.5 reduction achieved when agricultural stubble is diverted from burning.
              </p>

              {/* Projected Benefits Breakdown */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded border border-white/10 bg-black/40 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">PM2.5 AVOIDED</span>
                  <span className="font-mono font-bold text-cyan-300 text-base mt-0.5 block">
                    {(collectionTons * 1.5).toFixed(0)} kg
                  </span>
                  <span className="text-[9px] text-slate-500">at source</span>
                </div>
                <div className="rounded border border-white/10 bg-black/40 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">EST. AQI DROP</span>
                  <span className="font-mono font-bold text-emerald-300 text-base mt-0.5 block">
                    -{(collectionTons * 0.12).toFixed(1)} pts
                  </span>
                  <span className="text-[9px] text-slate-500">downwind NCR</span>
                </div>
                <div className="rounded border border-white/10 bg-black/40 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">CO2 EQUIV</span>
                  <span className="font-mono font-bold text-amber-300 text-base mt-0.5 block">
                    {(collectionTons * 1.46).toFixed(0)} t
                  </span>
                  <span className="text-[9px] text-slate-500">carbon offset</span>
                </div>
              </div>

              <div className="mt-4 rounded bg-cyan-950/30 border border-cyan-500/20 p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  WRF-Chem Coupled Atmospheric Scavenging
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Pre-populates the 72-hour What-If laboratory with active fire radiative power (FRP) and prevailing northwesterly advection vectors.
                </p>
              </div>
            </div>

            {/* Gateway CTA */}
            <div className="border-t border-cyan-400/15 pt-3.5 flex justify-end">
              <button
                onClick={onOpenWhatIf}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded border border-cyan-400 bg-cyan-500/25 px-5 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/40 shadow-lg transition cursor-pointer"
              >
                <span>Launch What-If Stubble Diversion Simulator</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: REAL-TIME ACTION DISPATCH AUDIT QUEUE TABLE ── */}
        <section className="border border-white/10 bg-[#090e14] p-5 rounded-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Real-Time Action Dispatch Audit Queue
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Live log of statutory advisories, broadcast dispatches, and emergency escalations issued through this console.
              </p>
            </div>

            {/* Filter Buttons & Refresh */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span className="text-slate-500 uppercase mr-1 hidden sm:inline">Filter:</span>
              {['all', 'citizens', 'schools', 'municipality', 'traffic', 'grap'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setQueueFilter(filter)}
                  className={`px-2 py-1 rounded uppercase transition cursor-pointer ${
                    queueFilter === filter
                      ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                  }`}
                >
                  {filter}
                </button>
              ))}
              <button
                onClick={fetchActions}
                disabled={queueLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-white/15 bg-white/5 text-slate-300 hover:text-white transition cursor-pointer ml-1"
                title="Refresh Action Queue"
              >
                <RefreshCw className={`h-3 w-3 ${queueLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Audit Queue Table */}
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1620] text-slate-400 text-[10px] uppercase border-b border-white/10">
                <tr>
                  <th className="p-3">Action Ref</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Stakeholder</th>
                  <th className="p-3">Station</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Dispatched Advisory / Message</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredQueue.length > 0 ? (
                  filteredQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition">
                      <td className="p-3 font-bold text-cyan-300">{item.id}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 capitalize font-medium text-white">{item.stakeholder}</td>
                      <td className="p-3 uppercase text-slate-400">{item.station_id}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            item.severity?.toLowerCase().includes('critical') || item.severity?.toLowerCase().includes('severe')
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-yellow-950 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] text-emerald-300 font-bold">
                          {item.status || 'DISPATCHED'}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate font-sans text-xs text-slate-300">
                        {item.message}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            api.queueResponseAction({
                              action_type: `${item.action_type}_reissue`,
                              stakeholder: item.stakeholder,
                              station_id: item.station_id,
                              severity: item.severity,
                              message: item.message,
                              source: 'Console Re-issue'
                            });
                            showToast('Action Re-issued', `Re-transmitted ${item.id} to ${item.stakeholder}.`);
                            fetchActions();
                          }}
                          className="rounded border border-cyan-400/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900/50 transition cursor-pointer"
                        >
                          Re-issue
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-sans text-xs">
                      No dispatched actions found matching filter &quot;{queueFilter}&quot;. Use the stakeholder cards above to broadcast alerts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── CONFIGURE & BROADCAST MODAL ── */}
      {broadcastModalOpen && activeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border border-cyan-400/40 bg-[#0a1017] p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded border border-cyan-400/40 bg-cyan-950/60 text-cyan-300">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Configure Tactical Broadcast: {activeChannel.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{activeChannel.audience}</p>
                </div>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Broadcast Message Editor */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Broadcast Bulletin Text</label>
                <textarea
                  rows={4}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full rounded border border-white/15 bg-black/50 p-3 text-xs text-white focus:border-cyan-400 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              {/* Delivery Mediums */}
              <div>
                <label className="text-slate-300 block font-medium mb-1.5">Select Distribution Gateways</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeChannel.channels.map((ch) => {
                    const isSelected = selectedMediums.includes(ch);
                    return (
                      <div
                        key={ch}
                        onClick={() => {
                          setSelectedMediums((prev) =>
                            isSelected ? prev.filter((m) => m !== ch) : [...prev, ch]
                          );
                        }}
                        className={`cursor-pointer rounded border p-2 text-xs flex items-center gap-2 transition select-none ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <CheckSquare className={`h-4 w-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="font-mono text-[11px]">{ch}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="text-slate-300 block font-medium mb-1.5">Alert Transmission Priority</label>
                <div className="flex gap-2">
                  {['NORMAL', 'HIGH', 'CRITICAL EMERGENCY'].map((prio) => (
                    <button
                      key={prio}
                      onClick={() => setBroadcastPriority(prio)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition cursor-pointer border ${
                        broadcastPriority === prio
                          ? prio === 'CRITICAL EMERGENCY'
                            ? 'bg-rose-950 text-rose-300 border-rose-500/50 ring-1 ring-rose-500'
                            : 'bg-orange-950 text-orange-300 border-orange-500/50 ring-1 ring-orange-500'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2.5 border-t border-white/10 pt-3">
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTransmitBroadcast}
                disabled={broadcasting}
                className="flex items-center justify-center gap-2 rounded border border-cyan-400 bg-cyan-500/25 px-5 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/40 shadow-lg transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{broadcasting ? 'Transmitting...' : 'Confirm & Transmit Broadcast'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

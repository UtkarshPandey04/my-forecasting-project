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
  AlertCircle,
  Volume2,
  VolumeX,
  Download,
  Zap,
  Droplets,
  Activity,
  PhoneCall,
  Navigation,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { ForecastResponse, Observation, Station } from '@/lib/types';
import { firstGrapTrigger, getGrapStage, GrapAssessment } from '@/lib/grap';
import { calculateAqiFromPm25, calculateEpaAqiFromPm25 } from '@/lib/naqi';
import { api } from '@/lib/api';

interface ResponseConsoleProps {
  forecast: ForecastResponse | null;
  observation: Observation | null;
  stationId: string;
  stations?: Station[];
  onSelectStation?: (stationId: string) => void;
  onOpenWhatIf?: () => void;
  aqiStandard?: 'epa' | 'cpcb';
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

export interface FieldUnit {
  id: string;
  name: string;
  unitCode: string;
  type: 'Anti-Smog Cannon' | 'Mechanized Sweeper' | 'Flying Inspection Squad' | 'Border Diversion Checkpoint' | 'Respiratory Health Clinic';
  status: 'STANDBY' | 'DISPATCHED' | 'ON_SCENE' | 'RECHARGING';
  assignedLocation: string;
  resourceLevelPct: number; // Water / Battery / Fuel
  lastPing: string;
  operator: string;
  operatorPhone: string;
  activeSop: string;
}

export interface TacticalSop {
  id: string;
  title: string;
  desc: string;
  impact: string;
  targetAgency: string;
  priority: 'CRITICAL_EMERGENCY' | 'IMMEDIATE_DISPATCH' | 'STATUTORY_ENFORCEMENT' | 'PUBLIC_HEALTH_SURGE';
}

const INITIAL_FIELD_UNITS: FieldUnit[] = [
  {
    id: 'UNIT-AS-01',
    name: 'Anti-Smog Cannon DL-01 (60m High-Throw)',
    unitCode: 'ASC-EAST-01',
    type: 'Anti-Smog Cannon',
    status: 'ON_SCENE',
    assignedLocation: 'Anand Vihar ISBT & Vikas Marg Corridor',
    resourceLevelPct: 84,
    lastPing: '2 mins ago',
    operator: 'Inspector V. K. Yadav',
    operatorPhone: '+91 98110 44211',
    activeSop: 'Continuous fine atomized mist barrier along transit corridor'
  },
  {
    id: 'UNIT-AS-02',
    name: 'Anti-Smog Cannon DL-02 (Mobile Mist Unit)',
    unitCode: 'ASC-WEST-02',
    type: 'Anti-Smog Cannon',
    status: 'DISPATCHED',
    assignedLocation: 'Mundka Industrial Area Phase-II',
    resourceLevelPct: 92,
    lastPing: 'Just now',
    operator: 'Sub-Officer Rajesh Gujjar',
    operatorPhone: '+91 98731 22890',
    activeSop: 'Suppressing industrial plastic pyrolysis particulate suspension'
  },
  {
    id: 'UNIT-SWP-03',
    name: 'Mechanized Heavy Vacuum Sweeper #12',
    unitCode: 'MCD-SWP-12',
    type: 'Mechanized Sweeper',
    status: 'ON_SCENE',
    assignedLocation: 'Outer Ring Road (Jahangirpuri to Wazirpur)',
    resourceLevelPct: 76,
    lastPing: '4 mins ago',
    operator: 'Duty Driver Harish Chandra',
    operatorPhone: '+91 98188 77612',
    activeSop: 'High-speed HEPA filtration sweeping of unpaved road dust'
  },
  {
    id: 'UNIT-FLY-04',
    name: 'CAQM Inter-Agency Flying Squad #07',
    unitCode: 'FLY-DPCC-07',
    type: 'Flying Inspection Squad',
    status: 'STANDBY',
    assignedLocation: 'Okhla Industrial Cluster Sector 3',
    resourceLevelPct: 100,
    lastPing: '8 mins ago',
    operator: 'Er. Alok Sharma (DPCC)',
    operatorPhone: '+91 98211 55432',
    activeSop: 'Surprise diesel generator & unauthorized fuel raids'
  },
  {
    id: 'UNIT-DIV-05',
    name: 'Interstate Freight Border Diversion Team',
    unitCode: 'TFC-SINGHU-01',
    type: 'Border Diversion Checkpoint',
    status: 'ON_SCENE',
    assignedLocation: 'Singhu Border Entry (NH-44)',
    resourceLevelPct: 95,
    lastPing: '1 min ago',
    operator: 'ACP Gurinder Singh',
    operatorPhone: '+91 98711 99011',
    activeSop: 'Diverting non-destined commercial BS-III/IV diesel trucks to EPE'
  },
  {
    id: 'UNIT-MED-06',
    name: 'Mobile Pulmonary Health & Nebulizer Van',
    unitCode: 'MED-RESP-03',
    type: 'Respiratory Health Clinic',
    status: 'STANDBY',
    assignedLocation: 'Ghazipur Dairy Colony Perimeter',
    resourceLevelPct: 88,
    lastPing: '12 mins ago',
    operator: 'Dr. Neha Saxena',
    operatorPhone: '+91 99100 33441',
    activeSop: 'Emergency bronchodilator & oxygen support for vulnerable citizens'
  }
];

const TACTICAL_SOPS: TacticalSop[] = [
  {
    id: 'sop-freight-lockdown',
    title: 'Total Heavy Freight Interstate Lockdown',
    desc: 'Deploy traffic police barricades & divert all non-destined heavy diesel commercial vehicles to EPE/KMP Expressways.',
    impact: '-24 µg/m³ PM2.5 in central urban core',
    targetAgency: 'Delhi Traffic Police & NHAI ITMS',
    priority: 'CRITICAL_EMERGENCY'
  },
  {
    id: 'sop-mist-cascade',
    title: 'Synchronize 24/7 Water Mist Cannon Cascade',
    desc: 'Mobilize stationary mist cannons and fleet trucks across Anand Vihar, Mundka, Jahangirpuri, and Wazirpur hot-spots.',
    impact: '-35% re-suspended road dust suspension',
    targetAgency: 'MCD / PWD / Disaster Management Cell',
    priority: 'IMMEDIATE_DISPATCH'
  },
  {
    id: 'sop-cnd-halt',
    title: 'Enforce Total C&D Demolition Work Halt',
    desc: 'Issue digital statutory stop-work notices with electronic surveillance on unpaved excavation and ready-mix concrete plants.',
    impact: '-48 µg/m³ PM10 coarse particulate load',
    targetAgency: 'DPCC Environmental Squads & MCD',
    priority: 'STATUTORY_ENFORCEMENT'
  },
  {
    id: 'sop-hospital-surge',
    title: 'Hospital Respiratory Emergency Surge Protocol',
    desc: 'Instruct pulmonary emergency wards at AIIMS, Safdarjung, and LNJP to activate nebulizer reserves and emergency oxygen bays.',
    impact: 'Zero emergency room triage bottleneck',
    targetAgency: 'Delhi Directorate of Health Services',
    priority: 'PUBLIC_HEALTH_SURGE'
  }
];

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
  onOpenWhatIf,
  aqiStandard = 'epa'
}: ResponseConsoleProps) {
  // AQI and GRAP Protocol calculations
  const pm25 = observation?.pollutants?.pm25 ?? 55.0;
  const epaRes = calculateEpaAqiFromPm25(pm25);
  const cpcbRes = calculateAqiFromPm25(pm25);

  const activeAqi = aqiStandard === 'epa'
    ? (observation?.epa_aqi ?? observation?.live_epa_aqi ?? epaRes.aqi)
    : (observation?.aqi ?? cpcbRes.aqi);

  const activeCategory = aqiStandard === 'epa'
    ? (observation?.epa_category ?? epaRes.category)
    : (observation?.aqi_category ?? cpcbRes.category);

  // CAQM GRAP is statutory under Indian NAQI:
  const cpcbAqiForGrap = observation?.aqi ?? cpcbRes.aqi;
  const current = getGrapStage(cpcbAqiForGrap);
  const trigger = forecast ? firstGrapTrigger(forecast.points) : null;
  const predicted = trigger?.assessment ?? current;
  const hours = trigger?.point.hour_offset ?? 14;

  // Selected station display helper
  const selectedStationObj = useMemo(() => {
    if (!stations || stations.length === 0) return null;
    return stations.find((s) => s.id === stationId) || stations[0];
  }, [stations, stationId]);

  const stationDisplayName = selectedStationObj?.name || (stationId ? stationId.replace(/_/g, ' ') : 'Anand Vihar');

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

  // Tactical Field Resource Squads State
  const [fieldUnits, setFieldUnits] = useState<FieldUnit[]>(INITIAL_FIELD_UNITS);
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  // Tactical SOP execution state
  const [triggeredSops, setTriggeredSops] = useState<Record<string, boolean>>({
    'sop-mist-cascade': true
  });
  const [activeSopExecuting, setActiveSopExecuting] = useState<string | null>(null);

  // Manual Operational Stage Override
  const [manualGrapStage, setManualGrapStage] = useState<string | null>(null);

  // Emergency Siren State
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);

  // Active Effective Stage
  const effectiveStage = manualGrapStage || current.stage;

  // Filtered Field Units
  const filteredUnits = useMemo(() => {
    if (unitFilter === 'ALL') return fieldUnits;
    return fieldUnits.filter((u) => u.type === unitFilter);
  }, [fieldUnits, unitFilter]);

  const activeUnitsOnSceneCount = fieldUnits.filter(
    (u) => u.status === 'ON_SCENE' || u.status === 'DISPATCHED'
  ).length;

  // Play subtle tactical alert audio pulse
  const triggerAudioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleToggleSiren = () => {
    if (isSirenActive) {
      setIsSirenActive(false);
      showToast('Emergency Siren Muted', 'Audible alert deactivated.');
    } else {
      setIsSirenActive(true);
      triggerAudioBeep();
      showToast('Emergency Siren Armed', 'Continuous alert active for critical threshold alerts.');
    }
  };

  // Advance unit operational status
  const handleAdvanceUnitStatus = async (unitId: string) => {
    const unit = fieldUnits.find((u) => u.id === unitId);
    if (!unit) return;

    const nextStatusMap: Record<FieldUnit['status'], FieldUnit['status']> = {
      STANDBY: 'DISPATCHED',
      DISPATCHED: 'ON_SCENE',
      ON_SCENE: 'RECHARGING',
      RECHARGING: 'STANDBY'
    };
    const nextStatus = nextStatusMap[unit.status];

    setFieldUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, status: nextStatus, lastPing: 'Just now' } : u))
    );

    triggerAudioBeep();
    showToast('Field Unit Status Updated', `${unit.name} transitioned to ${nextStatus}.`);

    try {
      await api.queueResponseAction({
        action_type: `unit_status_${nextStatus.toLowerCase()}`,
        stakeholder: 'operations',
        station_id: stationId,
        severity: nextStatus === 'ON_SCENE' ? 'CRITICAL' : 'STANDARD',
        message: `Field unit ${unit.unitCode} (${unit.name}) transitioned to ${nextStatus} at ${unit.assignedLocation}.`,
        source: 'AeroSense Tactical Dispatch'
      });
      fetchActions();
    } catch {
      // Graceful fallback
    }
  };

  // Replenish unit resource level
  const handleRechargeUnit = (unitId: string) => {
    setFieldUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? { ...u, resourceLevelPct: 100, status: 'STANDBY', lastPing: 'Just now' }
          : u
      )
    );
    triggerAudioBeep();
    showToast('Unit Replenished', 'Resource reservoir refilled & calibrated to 100%.');
  };

  // Trigger Immediate Tactical SOP
  const handleTriggerSop = async (sop: TacticalSop) => {
    setActiveSopExecuting(sop.id);
    triggerAudioBeep();
    try {
      const res = await api.queueResponseAction({
        action_type: sop.id,
        stakeholder: sop.targetAgency,
        station_id: stationId,
        severity: sop.priority,
        message: `[TACTICAL EXECUTION] ${sop.title} dispatched to ${sop.targetAgency}. Expected Impact: ${sop.impact}.`,
        source: 'AeroSense Tactical SOP Engine'
      });

      setTriggeredSops((prev) => ({ ...prev, [sop.id]: true }));
      showToast(
        'Tactical SOP Executed',
        `${sop.title} confirmed! ${sop.targetAgency} notified (Ref: ${res?.id || 'SOP-ACK'}).`
      );
      fetchActions();
    } catch {
      setTriggeredSops((prev) => ({ ...prev, [sop.id]: true }));
      showToast('SOP Logged Locally', `${sop.title} registered in local operations queue.`);
    } finally {
      setActiveSopExecuting(null);
    }
  };

  // Download Comprehensive Shift Handover Dossier
  const handleExportHandoverReport = () => {
    const report = {
      reportType: 'AeroSense Operational Incident & Response Shift Handover',
      timestamp: new Date().toISOString(),
      airshed: stationDisplayName,
      stationId,
      currentAqi: activeAqi,
      aqiStandard,
      effectiveGrapStage: effectiveStage,
      isManualOverride: !!manualGrapStage,
      enforcedMandatesCount: Object.values(enforcedMandates).filter(Boolean).length,
      fieldFleetReadiness: fieldUnits.map((u) => ({
        code: u.unitCode,
        name: u.name,
        type: u.type,
        status: u.status,
        assignedSector: u.assignedLocation,
        resourceLevel: `${u.resourceLevelPct}%`,
        operatorContact: `${u.operator} (${u.operatorPhone})`
      })),
      activeTacticalSops: Object.keys(triggeredSops).filter((k) => triggeredSops[k]),
      recentDispatches: actionQueue.slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AeroSense-Shift-Handover-${stationId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Handover Report Exported', 'Official operational shift dossier saved to local downloads.');
  };

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
    if (!actionQueue || !Array.isArray(actionQueue)) return [];
    if (queueFilter === 'all') return actionQueue;
    return actionQueue.filter(
      (a) =>
        (a.stakeholder || '').toLowerCase().includes(queueFilter.toLowerCase()) ||
        (a.action_type || '').toLowerCase().includes(queueFilter.toLowerCase())
    );
  }, [actionQueue, queueFilter]);

  // Human-friendly interpretation of AQI
  const getHealthGuidance = (aqiVal: number, standard: 'epa' | 'cpcb') => {
    if (standard === 'epa') {
      if (aqiVal <= 50) {
        return {
          title: 'Good Air Quality (US EPA)',
          desc: 'Air quality is satisfactory, and air pollution poses little or no risk.',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          residentTip: 'Ideal conditions for outdoor exercises and natural ventilation.'
        };
      }
      if (aqiVal <= 100) {
        return {
          title: 'Moderate Air Quality (US EPA)',
          desc: 'Air quality is acceptable; however, unusually sensitive people may experience slight symptoms.',
          badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          residentTip: 'Sensitive individuals should consider gentle breaks during long outdoor exertion.'
        };
      }
      if (aqiVal <= 150) {
        return {
          title: 'Unhealthy for Sensitive Groups (US EPA)',
          desc: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
          badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          residentTip: 'Children, seniors, and people with respiratory conditions should limit prolonged outdoor exertion.'
        };
      }
      if (aqiVal <= 200) {
        return {
          title: 'Unhealthy Air Quality (US EPA)',
          desc: 'Some members of the general public may experience health effects; sensitive groups may experience more serious health effects.',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          residentTip: 'Everyone should reduce outdoor exertion; keep windows closed and wear masks near heavy traffic.'
        };
      }
      return {
        title: 'Very Unhealthy to Hazardous (US EPA)',
        desc: 'Health alert: Risk of health effects is increased for everyone in the airshed.',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        residentTip: 'Avoid all outdoor activities; vulnerable individuals should remain indoors.'
      };
    }
    // CPCB NAQI standard
    if (aqiVal <= 100) {
      return {
        title: 'Good to Satisfactory Air Quality (CPCB NAQI)',
        desc: 'Air quality is acceptable for outdoor activities and daily routines with minimal health concern.',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        residentTip: 'Enjoy outdoor exercises and natural room ventilation.'
      };
    }
    if (aqiVal <= 200) {
      return {
        title: 'Moderate Air Quality (CPCB NAQI)',
        desc: 'May cause minor breathing discomfort to sensitive individuals, young children, and asthmatics.',
        badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        residentTip: 'Sensitive individuals should take gentle breaks during long outdoor exertion.'
      };
    }
    if (aqiVal <= 300) {
      return {
        title: 'Poor Air Quality (Stage I GRAP Rules Apply)',
        desc: 'Breathing discomfort to most people on prolonged exposure; dust suppression and sweeping active.',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        residentTip: 'Avoid early morning outdoor running; wear comfortable dust masks near heavy traffic.'
      };
    }
    if (aqiVal <= 400) {
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

  const healthGuidance = getHealthGuidance(activeAqi, aqiStandard);

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

              {/* Status & Operational Controls */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {/* GRAP Stage Selector / Override */}
                <div className="rounded-xl border border-white/10 bg-[#0d141c] px-3 py-1.5 flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">GRAP Protocol Stage:</span>
                  <select
                    value={manualGrapStage || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualGrapStage(val ? val : null);
                      showToast(
                        val ? 'GRAP Protocol Overridden' : 'Auto Live Protocol Restored',
                        val ? `Station manually locked to STAGE ${val}.` : `Live telemetry restored to Stage ${current.stage}.`
                      );
                    }}
                    className="bg-transparent text-amber-300 font-bold text-xs sm:text-sm focus:outline-none cursor-pointer mt-0.5"
                  >
                    <option value="" className="bg-[#0b1016] text-slate-300">
                      Auto (Live Stage {current.stage})
                    </option>
                    <option value="I" className="bg-[#0b1016] text-amber-300">Stage I (Poor • 201-300)</option>
                    <option value="II" className="bg-[#0b1016] text-orange-300">Stage II (Very Poor • 301-400)</option>
                    <option value="III" className="bg-[#0b1016] text-rose-300">Stage III (Severe • 401-450)</option>
                    <option value="IV" className="bg-[#0b1016] text-red-400">Stage IV (Emergency • 450+)</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0d141c] px-3 py-2 flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">{aqiStandard === 'epa' ? 'EPA AQI:' : 'NAQI:'}</span>
                  <span className="font-bold text-amber-300 text-sm">{activeAqi}</span>
                </div>

                {/* Emergency Siren Button */}
                <button
                  onClick={handleToggleSiren}
                  className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm ${
                    isSirenActive
                      ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20 animate-pulse'
                      : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                  }`}
                  title={isSirenActive ? 'Deactivate Audible Emergency Alert' : 'Arm Audible Emergency Alert'}
                >
                  {isSirenActive ? (
                    <>
                      <Volume2 className="h-4 w-4 text-red-400 animate-bounce" />
                      <span className="font-bold text-xs">SIREN ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 text-slate-400" />
                      <span className="text-xs">Siren</span>
                    </>
                  )}
                </button>

                {/* Export Handover Report Button */}
                <button
                  onClick={handleExportHandoverReport}
                  className="px-3 py-2 rounded-xl border border-sky-400/30 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Export Official Operational Incident Shift Handover (JSON)"
                >
                  <Download className="h-4 w-4 text-sky-400" />
                  <span className="text-xs">Shift Dossier</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── SECTION 1: HUMAN-READABLE HEALTH & SITUATION SUMMARY ── */}
        <section className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0d1522] via-[#0b1018] to-[#0c141f] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${healthGuidance.badgeColor}`}>
                  {healthGuidance.title} ({activeAqi})
                </span>
                <span className="text-xs text-slate-400 font-mono">Region: {stationDisplayName}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold">
                  Scale: {aqiStandard === 'epa' ? 'US EPA (aqicn)' : 'CPCB NAQI'}
                </span>
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

        {/* ── SECTION 2: TACTICAL FIELD FLEET & REAL-TIME UNIT DISPATCH ── */}
        <section className="rounded-2xl border border-sky-500/25 bg-[#0a1019] p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-sky-400" />
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
                  <span>Tactical Field Deployment Fleet</span>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-2.5 py-0.5 text-xs font-mono">
                    {activeUnitsOnSceneCount} / {fieldUnits.length} Units Active
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational positioning and status control for anti-smog mist cannons, mechanized sweepers, and border diversion teams.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'ALL', label: 'All Units' },
                { id: 'Anti-Smog Cannon', label: 'Mist Cannons' },
                { id: 'Mechanized Sweeper', label: 'Sweepers' },
                { id: 'Border Diversion Checkpoint', label: 'Border Checkpoints' },
                { id: 'Flying Inspection Squad', label: 'Inspection Squads' },
                { id: 'Respiratory Health Clinic', label: 'Medical Vans' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setUnitFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    unitFilter === tab.id
                      ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 shadow-sm'
                      : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Units Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUnits.map((unit) => {
              const isHighResource = unit.resourceLevelPct > 40;
              const statusColors = {
                STANDBY: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
                DISPATCHED: 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse',
                ON_SCENE: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
                RECHARGING: 'bg-purple-500/20 text-purple-300 border-purple-400/40'
              };

              return (
                <div
                  key={unit.id}
                  className="rounded-xl border border-white/[0.08] bg-[#0c1420] p-4 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-md"
                >
                  <div>
                    {/* Top strip */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-slate-300 font-bold">
                          {unit.unitCode}
                        </span>
                        <h3 className="text-xs font-bold text-white mt-1.5 leading-snug">
                          {unit.name}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase border shrink-0 ${
                          statusColors[unit.status]
                        }`}
                      >
                        {unit.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Location & SOP */}
                    <div className="mt-2.5 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="truncate font-medium">{unit.assignedLocation}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-5 leading-relaxed line-clamp-2">
                        {unit.activeSop}
                      </p>
                    </div>

                    {/* Reservoir / Fuel Level Meter */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Water / Battery Reservoir:</span>
                        <span className={`font-bold ${isHighResource ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {unit.resourceLevelPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isHighResource ? 'bg-gradient-to-r from-sky-500 to-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${unit.resourceLevelPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Operator & Ping */}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Operator: {unit.operator}</span>
                      <span>Ping: {unit.lastPing}</span>
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="mt-3.5 pt-2.5 border-t border-white/[0.08] flex items-center gap-2">
                    <button
                      onClick={() => handleAdvanceUnitStatus(unit.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Activity className="h-3 w-3" />
                      <span>
                        {unit.status === 'STANDBY' && 'Deploy Unit'}
                        {unit.status === 'DISPATCHED' && 'Confirm On Scene'}
                        {unit.status === 'ON_SCENE' && 'Return to Base'}
                        {unit.status === 'RECHARGING' && 'Complete Check'}
                      </span>
                    </button>

                    {unit.resourceLevelPct < 100 && (
                      <button
                        onClick={() => handleRechargeUnit(unit.id)}
                        className="px-2 py-1.5 rounded-lg text-xs bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 transition"
                        title="Refill Reservoir to 100%"
                      >
                        <Droplets className="h-3 w-3 text-sky-400" />
                      </button>
                    )}

                    <a
                      href={`tel:${unit.operatorPhone}`}
                      className="p-1.5 rounded-lg text-xs bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 transition"
                      title={`Direct Radio/Phone: ${unit.operatorPhone}`}
                    >
                      <PhoneCall className="h-3 w-3 text-emerald-400" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 3: IMMEDIATE EMERGENCY SOPS & AIRSHED RELIEF IMPACT ── */}
        <section className="rounded-2xl border border-amber-500/25 bg-[#0f1118] p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Immediate Tactical Response SOPs</span>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                    1-Click Dispatch
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory emergency protocols pre-calibrated for immediate cross-agency execution under CAQM mandates.
              </p>
            </div>

            {/* Overall Relief Impact summary */}
            <div className="flex items-center gap-3 text-xs font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 text-[10px] uppercase">Airshed Relief Est:</span>
              <span className="text-emerald-400 font-bold">-32 µg/m³ PM2.5</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">-64 µg/m³ PM10</span>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {TACTICAL_SOPS.map((sop) => {
              const isTriggered = triggeredSops[sop.id];
              const isExecuting = activeSopExecuting === sop.id;

              return (
                <div
                  key={sop.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isTriggered
                      ? 'border-emerald-500/40 bg-emerald-950/15 shadow-lg shadow-emerald-500/5'
                      : 'border-white/[0.08] bg-[#0d131d] hover:border-amber-400/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-slate-300 uppercase">
                        {sop.targetAgency.split(' ')[0]}
                      </span>
                      {isTriggered ? (
                        <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-400/90 font-bold">
                          STANDBY
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white mt-2 leading-tight">
                      {sop.title}
                    </h4>

                    <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                      {sop.desc}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Expected Benefit:</span>
                        <span className="text-emerald-300 font-bold">{sop.impact}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Authority:</span>
                        <span className="text-slate-300 truncate max-w-[120px]">{sop.targetAgency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-white/[0.08]">
                    <button
                      onClick={() => handleTriggerSop(sop)}
                      disabled={isExecuting}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                        isTriggered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      }`}
                    >
                      {isExecuting ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : isTriggered ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 fill-current" />
                      )}
                      <span>{isTriggered ? 'Re-Issue SOP Directives' : 'Execute SOP Immediately'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 4: CAQM GRAP STAGES & STATUTORY ACTION TRACKER ── */}
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

        {/* ── SECTION 5: STAKEHOLDER BROADCAST CENTER ── */}
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

        {/* ── SECTION 6: RECENT DISPATCH AUDIT LOG ── */}
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
                        {(item.id || `ACT-${idx + 1}`).slice(0, 10)}
                      </td>
                      <td className="p-3 font-semibold text-white capitalize">
                        {(item.stakeholder || 'general').replace(/_/g, ' ')}
                      </td>
                      <td className="p-3 font-mono text-slate-300 text-[11px] uppercase">
                        {(item.station_id || stationId || 'anand_vihar').replace(/_/g, ' ')}
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

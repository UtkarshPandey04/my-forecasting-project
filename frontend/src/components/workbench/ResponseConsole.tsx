'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ClipboardList, ExternalLink, HeartPulse, Landmark, School, ShieldAlert, Truck, Users } from 'lucide-react';
import { ForecastResponse, Observation } from '@/lib/types';
import { firstGrapTrigger, getGrapStage } from '@/lib/grap';
import { api } from '@/lib/api';

interface ResponseConsoleProps { forecast: ForecastResponse | null; observation: Observation | null; stationId: string; onOpenWhatIf: () => void; }
interface Partner { id: string; name: string; type: string; region: string; service: string; }

export default function ResponseConsole({ forecast, observation, stationId, onOpenWhatIf }: ResponseConsoleProps) {
  const [sent, setSent] = useState<string[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [collectionStatus, setCollectionStatus] = useState<string | null>(null);
  const currentAqi = observation?.aqi ?? 286;
  const current = getGrapStage(currentAqi);
  const trigger = forecast ? firstGrapTrigger(forecast.points) : null;
  const predicted = trigger?.assessment ?? current;
  const hours = trigger?.point.hour_offset ?? 18;

  useEffect(() => {
    api.getMitigationPartners()
      .then((response) => setPartners(response.partners))
      .catch((error) => console.error('Failed to load mitigation partners:', error));
  }, []);

  const send = async (id: string) => {
    if (sent.includes(id)) return;
    try {
      await api.queueResponseAction({ action_type: id, stakeholder: id === 'citizens' ? 'citizens' : 'operations', station_id: stationId, severity: predicted.label, message: `Generated ${predicted.label} response action for ${stationId}.`, source: 'AeroSense Response Console' });
    } catch (error) {
      console.error('Failed to queue response action:', error);
    } finally {
      setSent((items) => items.includes(id) ? items : [...items, id]);
    }
  };

  const requestCollection = async () => {
    const partner = partners.find((item) => item.type === 'collection') || partners[0];
    if (!partner) { setCollectionStatus('No partner registry available'); return; }
    try {
      const result = await api.createCollectionRequest({ partner_id: partner.id, station_id: stationId, region: partner.region, estimated_tons: 100, source_fire_ids: [], message: 'Coordinate pickup and biomass buyer matching for predicted stubble-burning risk.' });
      setCollectionStatus(`${result.id} routed to ${result.partner.name}`);
    } catch (error) {
      console.error('Failed to create collection request:', error);
      setCollectionStatus('Partner service unavailable');
    }
  };

  const advisoryButton = (id: string, label: string) => <button onClick={() => send(id)} className="flex items-center gap-2 border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/10">{sent.includes(id) ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{sent.includes(id) ? 'Sent to queue' : label}</button>;

  return <main className="flex-1 overflow-y-auto bg-[#07090c] text-slate-100"><div className="mx-auto max-w-[1200px] space-y-5 p-5 lg:p-8">
    <header className="border-b border-cyan-300/15 pb-5"><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300"><ShieldAlert className="h-3.5 w-3.5" /> Prediction → alert → action</div><h1 className="mt-2 text-2xl font-semibold text-white">Response Console</h1><p className="mt-1 text-sm text-slate-400">GRAP-linked advisories and partner routing generated from forecast risk.</p></header>
    <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]"><div className="border border-orange-300/25 bg-[#17130f] p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-mono uppercase tracking-widest text-orange-300">Current AQI protocol</div><div className="mt-2 text-4xl font-mono text-orange-200">{currentAqi}</div></div><span className="border border-orange-300/40 px-3 py-1.5 text-xs font-mono text-orange-200">GRAP STAGE {current.stage}</span></div><div className="mt-2 text-sm text-orange-100">{current.label}</div><div className="mt-4 space-y-2">{current.actions.map((action) => <div key={action} className="flex items-start gap-2 text-xs text-slate-300"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />{action}</div>)}</div></div><div className="border border-rose-300/25 bg-[#171116] p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-mono uppercase tracking-widest text-rose-300">Forecast trigger</div><div className="mt-2 text-2xl font-mono text-rose-200">Predicted: GRAP Stage {predicted.stage}</div></div><span className="text-xs font-mono text-slate-400">in {hours}h</span></div><div className="mt-2 text-sm text-rose-100">{predicted.label} · AQI threshold {predicted.minAqi}+</div><p className="mt-4 text-xs leading-relaxed text-slate-400">{forecast ? `The blended forecast crosses the GRAP threshold at hour +${hours}.` : 'Connect the forecast service to show the first predicted GRAP trigger horizon.'}</p><button onClick={() => send('grap')} className="mt-4 flex items-center gap-2 border border-rose-300/30 px-3 py-2 text-xs text-rose-100">{sent.includes('grap') ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />} {sent.includes('grap') ? 'GRAP escalation queued' : 'Queue GRAP escalation'}</button></div></section>
    <section className="border border-white/10 bg-[#0d1116] p-5"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold">Multi-stakeholder advisories</h2></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="border border-white/[0.08] bg-[#11161d] p-4"><Users className="h-4 w-4 text-cyan-300" /><h3 className="mt-3 text-xs text-white">Citizens</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Mask outdoors. Asthma patients, children, and older adults should stay indoors. Keep indoor air clean.</p>{advisoryButton('citizens', 'Publish citizen alert')}</div><div className="border border-white/[0.08] bg-[#11161d] p-4"><School className="h-4 w-4 text-amber-300" /><h3 className="mt-3 text-xs text-white">Schools + hospitals</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Flag outdoor activity, prepare clean-air rooms, and review vulnerable-patient capacity.</p>{advisoryButton('institutions', 'Send advisory flag')}</div><div className="border border-white/[0.08] bg-[#11161d] p-4"><Landmark className="h-4 w-4 text-rose-300" /><h3 className="mt-3 text-xs text-white">Municipal authority</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">{predicted.actions[0]}; coordinate enforcement and publish the next GRAP bulletin.</p>{advisoryButton('municipality', 'Create action brief')}</div></div></section>
    <section className="grid gap-4 lg:grid-cols-2"><div className="border border-lime-300/20 bg-[#101610] p-5"><div className="flex items-center gap-2 text-lime-200"><Truck className="h-4 w-4" /><h2 className="text-sm font-semibold">Farmer support: route residue pickup</h2></div><p className="mt-2 text-xs leading-relaxed text-slate-400">FIRMS fire signal and wind trajectory can route a farmer request to a collection agency or agriculture department.</p><div className="mt-4 space-y-2">{partners.slice(0, 3).map((partner) => <div key={partner.id} className="flex items-center justify-between border border-white/[0.08] bg-[#151d16] p-3"><div><div className="text-xs text-slate-200">{partner.name}</div><div className="mt-1 text-[10px] text-slate-500">{partner.region} · {partner.service}</div></div><span className="text-[10px] font-mono text-emerald-300">READY</span></div>)}</div><button onClick={requestCollection} className="mt-4 flex items-center gap-2 border border-lime-300/30 px-3 py-2 text-xs text-lime-100">{collectionStatus ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{collectionStatus || 'Create collection request'}</button></div><div className="border border-cyan-300/20 bg-[#0d151a] p-5"><div className="flex items-center gap-2 text-cyan-200"><HeartPulse className="h-4 w-4" /><h2 className="text-sm font-semibold">Quantify the intervention</h2></div><p className="mt-2 text-xs leading-relaxed text-slate-400">Run the live-calibrated What-If Lab to estimate AQI change when residue is diverted instead of burnt.</p><button onClick={onOpenWhatIf} className="mt-4 flex items-center gap-2 border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100">Open stubble diversion What-If <ExternalLink className="h-3.5 w-3.5" /></button></div></section>
  </div></main>;
}

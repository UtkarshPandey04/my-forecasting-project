'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Building2,
  MapPin,
  Truck,
  FileCheck2,
  DollarSign,
  Send,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { MarketplaceMatch, ResidueListing, BuyerRequirement } from '@/lib/types';

export interface ContactTarget {
  name: string;
  role?: string;
  company?: string;
  phone: string;
  email: string;
  location: string;
  cropOrMaterial: string;
  tonnage: number;
  pricePerTon?: number;
  category?: string;
  source?: 'match' | 'listing' | 'buyer';
}

export interface ContactNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: ContactTarget | null;
  match?: MarketplaceMatch | null;
  listing?: ResidueListing | null;
  buyer?: BuyerRequirement | null;
  onProposalSent?: (message: string) => void;
  onActionDispatched?: (message: string) => void;
}

export default function ContactNegotiationModal({
  isOpen,
  onClose,
  target,
  match,
  listing,
  buyer,
  onProposalSent,
  onActionDispatched
}: ContactNegotiationModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('inspection');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [proposedQuantity, setProposedQuantity] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [isSent, setIsSent] = useState<boolean>(false);
  const [sentTicketId, setSentTicketId] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Derive active counterparty info
  const counterpartyName =
    target?.company ||
    target?.name ||
    match?.buyer_name ||
    buyer?.company_name ||
    listing?.farmer_name ||
    match?.farmer_name ||
    'Procurement Officer';

  const counterpartyLocation =
    target?.location ||
    match?.buyer_location ||
    buyer?.location ||
    listing?.location ||
    'Delhi NCR Industrial Cluster';

  const contactPerson =
    target?.name ||
    match?.buyer_contact_person ||
    buyer?.contact_person ||
    listing?.contact_person ||
    'Er. Rajesh Sharma (Lead Procurement)';

  const phone =
    target?.phone ||
    match?.buyer_phone ||
    buyer?.phone ||
    listing?.phone ||
    '+91 98112 77412';

  const email =
    target?.email ||
    match?.buyer_email ||
    buyer?.email ||
    'procurement@aerosense-circular.in';

  const material =
    target?.cropOrMaterial ||
    match?.material ||
    buyer?.required_material ||
    listing?.residue_type ||
    'Sustainable Biomass';

  const initialQuantity =
    target?.tonnage ||
    match?.matched_quantity_tons ||
    buyer?.required_quantity_tons ||
    listing?.quantity_tons ||
    25;

  useEffect(() => {
    if (isOpen) {
      setIsSent(false);
      setSending(false);
      setProposedQuantity(initialQuantity);
      setTargetDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
      setCustomMessage(
        `Hello ${counterpartyName}, we have reviewed your listing/requirement for ${material} (${initialQuantity} tonnes). We would like to initiate procurement dispatch and align on delivery logistics.`
      );
    }
  }, [isOpen, match, listing, buyer, initialQuantity, counterpartyName, material]);

  if (!isOpen) return null;

  const TEMPLATES = [
    {
      id: 'inspection',
      label: '🧪 Moisture & Quality Audit',
      text: `Hello ${counterpartyName}, we would like to schedule a field inspection and automated moisture audit for ${material} prior to truck baling dispatch.`
    },
    {
      id: 'price',
      label: '💰 Bulk Incentive Offer',
      text: `Hello ${counterpartyName}, we are willing to commit to full off-take of ${proposedQuantity}t of ${material} with a volume incentive. Please confirm the rate confirmation ticket.`
    },
    {
      id: 'logistics',
      label: '🚚 Confirm Weighbridge Slot',
      text: `Hello ${counterpartyName}, logistics carrier fleet is ready. Please confirm preferred weighbridge receiving hours and GPS tracking protocol for ${targetDate}.`
    },
    {
      id: 'compliance',
      label: '📜 CAQM & Carbon Audit Docket',
      text: `Hello ${counterpartyName}, please transmit the CAQM air pollution avoidance compliance certificate and origin tracking docket for this batch.`
    }
  ];

  const handleSelectTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSelectedTemplate(tpl.id);
    setCustomMessage(tpl.text);
  };

  const handleTransmit = () => {
    setSending(true);
    setTimeout(() => {
      const ticketId = `COMM-${Math.random().toString(36).substring(2, 7).toUpperCase()}-2026`;
      setSentTicketId(ticketId);
      setIsSent(true);
      setSending(false);
      const msg = `Transmission #${ticketId} dispatched to ${counterpartyName} via secure telemetric channel.`;
      if (onActionDispatched) {
        onActionDispatched(msg);
      }
      if (onProposalSent) {
        onProposalSent(msg);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-[#091019] border border-cyan-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-[#0b1624] via-[#0d1e33] to-[#0b1624] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Enterprise Counterparty Dispatch & Negotiation
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct telemetric communication channel connecting suppliers, off-takers, and logistics fleet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isSent ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  Communication Dispatched Successfully!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                  Your procurement request has been routed to <strong>{counterpartyName}</strong> with automated SMS and WhatsApp telemetry alerts.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-cyan-300">
                <span>Dispatch Ticket:</span>
                <strong className="text-white">{sentTicketId}</strong>
                <span className="text-emerald-400 ml-1">● DELIVERED</span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left max-w-lg mx-auto space-y-2 text-xs">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Message Preview:</div>
                <div className="text-slate-200 bg-black/30 p-2.5 rounded font-sans leading-relaxed">
                  "{customMessage}"
                </div>
                <div className="text-[11px] text-slate-400 pt-1 flex justify-between border-t border-white/5 font-mono">
                  <span>Target Volume: {proposedQuantity}t</span>
                  <span>Target Date: {targetDate}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg"
                >
                  Return to Marketplace
                </button>
              </div>
            </div>
          ) : (
            /* Active Form */
            <>
              {/* Counterparty Profile Card */}
              <div className="p-3.5 rounded-xl bg-[#0c1522] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm font-bold text-white">{counterpartyName}</span>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{counterpartyLocation}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Officer in Charge: <span className="text-slate-200">{contactPerson}</span>
                  </div>
                </div>

                {/* Direct Connect Pills */}
                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5">
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono hover:bg-emerald-500/25 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `AeroSense Circular Dispatch: Hello ${counterpartyName}, inquiring about ${material} batch.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] text-xs font-mono hover:bg-[#25D366]/25 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Dispatch</span>
                  </a>
                </div>
              </div>

              {/* Quick Negotiation Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Quick Negotiation Templates</span>
                  <span className="text-[10px] text-cyan-300 font-mono lowercase">click to auto-fill</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        selectedTemplate === tpl.id
                          ? 'border-cyan-400 bg-cyan-500/15 text-white font-medium shadow-sm'
                          : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{tpl.label}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                        {tpl.text}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Negotiation Message / Delivery Specifications
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type specific questions, delivery requirements, or rate proposals..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>

              {/* Deal Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Target Batch Quantity (Tonnes)
                  </label>
                  <input
                    type="number"
                    value={proposedQuantity}
                    onChange={(e) => setProposedQuantity(Number(e.target.value))}
                    min={1}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Target Collection / Gate Slot
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Regulatory Assurance Callout */}
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-400/20 text-xs text-cyan-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>AeroSense Smart Escrow Protection:</strong> All communications, weight tickets, and moisture assays are digitally timestamped. Full payment and transport subsidies release automatically upon weighbridge gate entry.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isSent && (
          <div className="border-t border-white/10 bg-[#070d15] px-5 py-3.5 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Connected to <strong>AeroSense Telemetric Network</strong>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransmit}
                disabled={sending || !customMessage.trim()}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="w-3.5 h-3.5 fill-slate-950" />
                <span>{sending ? 'Transmitting Dispatch...' : 'Transmit Dispatch & Proposal'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

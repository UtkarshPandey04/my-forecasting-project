'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Recycle,
  Leaf,
  Truck,
  Factory,
  Coins,
  ShieldCheck,
  Scale,
  ArrowRight,
  Clock,
  CheckCircle2,
  MapPin,
  AlertCircle,
  Plus,
  Search,
  Building2,
  Flame,
  Check,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  Sliders,
  Send,
  Phone,
  MessageSquare
} from 'lucide-react';
import {
  ResidueListing,
  BuyerRequirement,
  MarketplaceMatch,
  TransportOrder,
  CircularImpactMetrics,
  WasteCategory,
  ConversionPathway,
  TransportStatus
} from '@/lib/types';
import { api } from '@/lib/api';
import ContactNegotiationModal, { ContactTarget } from './ContactNegotiationModal';

const WASTE_CATEGORIES: { id: WasteCategory; label: string; active: boolean; badge?: string }[] = [
  { id: 'agricultural_residue', label: 'Agricultural Residue', active: true, badge: 'High Airshed Impact' },
  { id: 'organic_waste', label: 'Municipal Organic Waste', active: true, badge: 'Mandi & MSW' },
  { id: 'construction_waste', label: 'C&D Debris & Dust', active: true, badge: 'Recycled Aggregate' },
  { id: 'used_cooking_oil', label: 'Used Cooking Oil (UCO)', active: true, badge: 'RUCO Bio-Diesel' },
  { id: 'e_waste', label: 'Electronic Waste', active: true, badge: 'Metals & Battery' },
  { id: 'industrial_waste', label: 'Industrial Byproducts', active: true, badge: 'Fly Ash & Slag' },
];

const STREAM_CONVERSION_PATHWAYS: Record<WasteCategory, { id: ConversionPathway; label: string; desc: string; icon: string }[]> = {
  agricultural_residue: [
    { id: 'cbg_biogas', label: 'CBG / Compressed Biogas', desc: 'Anaerobic fermentation for city gas grid & green mobility', icon: '⚡' },
    { id: 'biochar', label: 'Agri-Biochar', desc: 'Pyrolysis soil amendment & permanent carbon sink', icon: '🌱' },
    { id: 'biomass_fuel', label: 'Biomass Pellets / Co-Firing', desc: 'NTPC / industrial thermal boiler coal replacement', icon: '🔥' },
    { id: 'packaging_material', label: 'Molded Pulp Packaging', desc: 'Biodegradable alternative to thermocol & plastic', icon: '📦' },
    { id: 'paper_pulp', label: 'Eco-Paper & Kraft Pulp', desc: 'High-tensile virgin pulp paper packaging', icon: '📄' },
    { id: 'mushroom_substrate', label: 'Mushroom Cultivation Substrate', desc: 'Sterilized straw beds for high-value agriculture', icon: '🍄' },
  ],
  organic_waste: [
    { id: 'anaerobic_compost', label: 'Anaerobic Biomethanation', desc: 'High-yield biogas & enriched organic soil humic fertilizer', icon: '🍃' },
    { id: 'bsf_larvae_protein', label: 'BSF Larvae Bio-Conversion', desc: 'Black soldier fly insect protein & organic frass fertilizer', icon: '🪲' },
    { id: 'cbg_biogas', label: 'Mandi CBG Compression', desc: 'Fruit & vegetable wet scrap to automotive grade CBG fuel', icon: '⚡' },
  ],
  construction_waste: [
    { id: 'recycled_concrete_aggregate', label: 'Recycled Concrete Aggregate (RCA)', desc: 'Manufactured sand (M-Sand) & structural base coarse aggregate', icon: '🧱' },
    { id: 'fly_ash_bricks', label: 'Autoclaved Eco-Pavers & Bricks', desc: 'Zero-clay cured interlocking paving blocks & boundary masonry', icon: '🏗️' },
  ],
  used_cooking_oil: [
    { id: 'ruco_biodiesel', label: 'RUCO B100 Transesterification', desc: 'FSSAI certified spent oil transesterified to B100 green diesel', icon: '🛢️' },
    { id: 'saf_aviation_fuel', label: 'Sustainable Aviation Fuel (SAF)', desc: 'Hydrotreated esters and fatty acids (HEFA) aviation blendstock', icon: '✈️' },
  ],
  e_waste: [
    { id: 'hydrometallurgical_extraction', label: 'Hydrometallurgical Refining', desc: 'Closed-loop 99.9% recovery of Gold, Copper, Palladium & Silver', icon: '🔬' },
    { id: 'battery_black_mass', label: 'Lithium Black Mass Recovery', desc: 'Cathode active material recovery: Lithium, Cobalt & Nickel salts', icon: '🔋' },
  ],
  industrial_waste: [
    { id: 'slag_cement_ggbs', label: 'GGBS Green Slag Cement', desc: 'Ground granulated blast furnace slag replacing Portland clinker', icon: '🏭' },
    { id: 'geopolymer_blocks', label: 'Geopolymer Zero-Carbon Blocks', desc: 'Fly ash alkaline activation producing zero-cement loadbearing blocks', icon: '🧱' },
  ]
};

interface CircularWorkspaceProps {
  onNavigateToCommand?: () => void;
  onNavigateToWhatIf?: () => void;
}

export default function CircularWorkspace({
  onNavigateToCommand,
  onNavigateToWhatIf
}: CircularWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    'marketplace' | 'farmer-listings' | 'buyer-demand' | 'smart-matches' | 'logistics' | 'impact-dashboard'
  >('marketplace');

  const [selectedCategory, setSelectedCategory] = useState<WasteCategory>('agricultural_residue');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Core Data
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [buyers, setBuyers] = useState<BuyerRequirement[]>([]);
  const [matches, setMatches] = useState<MarketplaceMatch[]>([]);
  const [orders, setOrders] = useState<TransportOrder[]>([]);
  const [impact, setImpact] = useState<CircularImpactMetrics | null>(null);

  // Modals & Action States
  const [showListingModal, setShowListingModal] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Farmer Listing Form State
  const [listingForm, setListingForm] = useState({
    farmer_name: '',
    location: '',
    district: 'Meerut',
    state: 'Uttar Pradesh',
    crop_type: 'Paddy',
    residue_type: 'Rice Straw (Parali)',
    quantity_tons: 10,
    harvest_date: new Date().toISOString().split('T')[0],
    availability_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    moisture_pct: 12.0,
    expected_price_per_ton: 2200,
    recommended_pathways: ['cbg_biogas', 'biochar'] as ConversionPathway[],
  });

  // Buyer Demand Form State
  const [buyerForm, setBuyerForm] = useState({
    company_name: '',
    buyer_type: 'CBG Plant',
    location: '',
    required_material: 'Rice Straw',
    required_quantity_tons: 200,
    max_distance_km: 90,
    min_price_per_ton: 2100,
    max_price_per_ton: 2500,
    pickup_available: true,
    required_moisture_max_pct: 15.0,
    availability_period: 'Sep-Dec 2026',
    conversion_pathway: 'cbg_biogas' as ConversionPathway,
  });

  // Load Data
  const loadCircularData = async () => {
    setLoading(true);
    try {
      const [lstRes, buyRes, mchRes, ordRes, impRes] = await Promise.all([
        api.getCircularListings(),
        api.getCircularBuyers(),
        api.getCircularMatches(),
        api.getTransportOrders(),
        api.getCircularImpact()
      ]);

      setListings(lstRes.listings || []);
      setBuyers(buyRes.buyers || []);
      setMatches(mchRes.matches || []);
      setOrders(ordRes.orders || []);
      setImpact(impRes);
    } catch (err) {
      console.error('Failed to load circular data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircularData();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newListing = await api.createCircularListing({
        ...listingForm,
        category: 'agricultural_residue',
        status: 'LISTED' as TransportStatus
      });
      setListings(prev => [newListing, ...prev]);

      setShowListingModal(false);
      setActionSuccessMsg(`Residue listing for ${newListing.quantity_tons}t created! Smart match algorithms notified.`);
      setTimeout(() => setActionSuccessMsg(null), 6000);
      loadCircularData();
    } catch (err) {
      console.error('Error creating listing:', err);
    }
  };

  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newReq = await api.createBuyerRequirement({
        ...buyerForm,
        status: 'ACTIVE',
        fulfilled_tons: 0
      });
      setBuyers(prev => [newReq, ...prev]);
      setShowBuyerModal(false);
      setActionSuccessMsg(`Requirement of ${newReq.required_quantity_tons}t posted for ${newReq.company_name}!`);
      setTimeout(() => setActionSuccessMsg(null), 6000);
      loadCircularData();
    } catch (err) {
      console.error('Error posting requirement:', err);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      const res = await api.acceptMarketplaceMatch(matchId);
      setMatches(prev =>
        prev.map(m => (m.id === matchId ? { ...m, status: 'ACCEPTED' } : m))
      );
      if (res.transport_order) {
        setOrders(prev => [res.transport_order, ...prev]);
      }
      setActionSuccessMsg(`Match confirmed! Transport order automatically dispatched.`);
      setTimeout(() => setActionSuccessMsg(null), 6000);
      loadCircularData();
    } catch (err) {
      console.error('Error accepting match:', err);
    }
  };

  const handleAdvanceTransport = async (orderId: string, nextStatus: TransportStatus) => {
    try {
      const updated = await api.updateTransportStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      setActionSuccessMsg(`Logistics order ${orderId} updated to: ${nextStatus}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadCircularData();
    } catch (err) {
      console.error('Error advancing transport status:', err);
    }
  };

  // Contact Negotiation Modal State & Handlers
  const [contactTarget, setContactTarget] = useState<ContactTarget | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const handleOpenContactForMatch = (match: MarketplaceMatch) => {
    setContactTarget({
      name: match.buyer_contact || match.buyer_name,
      role: 'Off-Taker / Procurement Head',
      company: match.buyer_name,
      phone: match.buyer_phone || '+91 98200 11223',
      email: 'procurement@' + match.buyer_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.in',
      location: match.buyer_location,
      cropOrMaterial: match.material,
      tonnage: match.matched_quantity_tons,
      pricePerTon: Math.round((match.estimated_farmer_revenue_inr || 20000) / (match.matched_quantity_tons || 1)),
      category: selectedCategory,
      source: 'match'
    });
    setShowContactModal(true);
  };

  const handleOpenContactForListing = (listing: ResidueListing) => {
    setContactTarget({
      name: listing.contact_person || listing.farmer_name,
      role: 'Producer / Aggregator',
      company: listing.farmer_name,
      phone: listing.phone || '+91 98101 22345',
      email: listing.email || 'seller@circulareconomy.in',
      location: listing.location,
      cropOrMaterial: `${listing.crop_type} (${listing.residue_type})`,
      tonnage: listing.quantity_tons,
      pricePerTon: listing.expected_price_per_ton,
      category: listing.category,
      source: 'listing'
    });
    setShowContactModal(true);
  };

  const handleOpenContactForBuyer = (buyer: BuyerRequirement) => {
    setContactTarget({
      name: buyer.contact_person || buyer.company_name,
      role: buyer.buyer_type,
      company: buyer.company_name,
      phone: buyer.phone || '+91 98119 88776',
      email: buyer.email || 'intake@' + buyer.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.in',
      location: buyer.location,
      cropOrMaterial: buyer.required_material,
      tonnage: buyer.required_quantity_tons,
      pricePerTon: buyer.max_price_per_ton,
      category: selectedCategory,
      source: 'buyer'
    });
    setShowContactModal(true);
  };

  const currentPathways = useMemo(() => {
    return STREAM_CONVERSION_PATHWAYS[selectedCategory] || STREAM_CONVERSION_PATHWAYS.agricultural_residue;
  }, [selectedCategory]);

  // Filtered Items by Category & Search Query
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchCat = !selectedCategory || l.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        l.farmer_name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.residue_type.toLowerCase().includes(q) ||
        l.crop_type.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [listings, selectedCategory, searchQuery]);

  const filteredBuyers = useMemo(() => {
    const validPathwayIds = currentPathways.map(p => p.id);
    return buyers.filter(b => {
      const matchCat =
        !selectedCategory ||
        validPathwayIds.includes(b.conversion_pathway);
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        b.company_name.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.buyer_type.toLowerCase().includes(q) ||
        b.required_material.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [buyers, currentPathways, selectedCategory, searchQuery]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const parentListing = listings.find(l => l.id === m.listing_id);
      const matchCat = !selectedCategory || !parentListing || parentListing.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        m.farmer_name.toLowerCase().includes(q) ||
        m.buyer_name.toLowerCase().includes(q) ||
        m.material.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [matches, listings, selectedCategory, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.pickup_location.toLowerCase().includes(q) ||
        o.delivery_location.toLowerCase().includes(q) ||
        o.transporter_name.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080d15] text-slate-200 overflow-y-auto overflow-x-hidden font-sans select-none">
      {/* Top Banner: Module Header & Live Stats Strip */}
      <div className="border-b border-emerald-500/20 bg-gradient-to-r from-[#0b171c] via-[#091515] to-[#0d1c1c] px-3 sm:px-6 py-3 sm:py-5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
                <Recycle className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    AEROSENSE CIRCULAR
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold uppercase tracking-wider">
                    Closed-Loop Airshed Economy
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">
                    DEMO / SIMULATION DATA
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Turn pollution-causing agricultural residue and waste streams into verified economic value.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowListingModal(true)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Sell Crop Residue
            </button>
            <button
              onClick={() => setShowBuyerModal(true)}
              className="px-3.5 py-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.15] text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-sky-400" />
              Register Processor Demand
            </button>
            {onNavigateToWhatIf && (
              <button
                onClick={onNavigateToWhatIf}
                className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-xs rounded-lg transition-all flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                Scenario Lab
              </button>
            )}
            <button
              onClick={loadCircularData}
              disabled={loading}
              className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] rounded-lg text-slate-400 hover:text-white transition-all"
              title="Refresh Marketplace"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Impact & Financial Ticker */}
        {impact && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-white/[0.08]">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Residue Diverted</span>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                {impact.residue_diverted_tons.toLocaleString()} <span className="text-[10px] text-slate-400">tons</span>
              </div>
              <span className="text-[10px] text-emerald-300/70">From field burning</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Farmers Onboarded</span>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {impact.farmers_onboarded.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Across 6 NCR districts</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Active Processors</span>
              <div className="text-base font-bold text-sky-400 font-mono mt-0.5">
                {impact.active_buyers} <span className="text-[10px] text-slate-400">facilities</span>
              </div>
              <span className="text-[10px] text-sky-300/70">CBG / Biochar / Pellets</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Farmer Payouts</span>
              <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                ₹{(impact.revenue_generated_for_farmers_inr / 100000).toFixed(2)}L
              </div>
              <span className="text-[10px] text-amber-300/70">Direct bank transfer</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Est. PM2.5 Prevented</span>
              <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                {impact.estimated_pm25_avoided_kg.toLocaleString()} <span className="text-[10px] text-slate-400">kg</span>
              </div>
              <span className="text-[10px] text-cyan-300/70">Calibrated factor</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Platform GMV</span>
              <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
                ₹{(impact.platform_gmv_inr / 100000).toFixed(2)}L
              </div>
              <span className="text-[10px] text-purple-300/70">3.5% take-rate model</span>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="bg-emerald-500/20 border-b border-emerald-400/30 px-6 py-2.5 text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Waste Category Selector Bar (Multi-Stream Extensibility) */}
      <div className="border-b border-white/[0.08] bg-[#070b12] px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">
          Waste Streams:
        </span>
        {WASTE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06]'
            }`}
          >
            {cat.label}
            {cat.badge && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                cat.active ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {cat.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-white/[0.08] bg-[#090f18] px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'marketplace', label: 'Marketplace Feed', count: listings.length + buyers.length },
            { id: 'farmer-listings', label: 'Farmer Listings', count: listings.length },
            { id: 'buyer-demand', label: 'Processor Demand', count: buyers.length },
            { id: 'smart-matches', label: 'Smart Matches', count: matches.length, badge: 'AI Recommended' },
            { id: 'logistics', label: 'Transport Network', count: orders.length },
            { id: 'impact-dashboard', label: 'Impact & Monetization', badge: 'Audited' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white/[0.12] text-white border border-white/[0.2] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.1] font-mono text-slate-300">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-400/30">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search district, crop, processor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white/[0.04] border border-white/[0.1] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {/* TAB 1: MARKETPLACE OVERVIEW */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Conversion Pathways Educational Card */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Configured {WASTE_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Residue'} Conversion Pathways & End-Markets
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Active conversion routes for {selectedCategory.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {currentPathways.map(p => (
                  <div key={p.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all group">
                    <div className="text-xl mb-1">{p.icon}</div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">{p.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Grid: Live Farmer Supply vs Processor Demand */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Recent Farmer Supply */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5" />
                    Available Supply ({filteredListings.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('farmer-listings')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredListings.slice(0, 4).map(item => (
                    <div
                      key={item.id}
                      className="bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{item.crop_type} ({item.residue_type})</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              {item.quantity_tons} Tonnes
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.location}</span>
                            <span className="text-slate-600">•</span>
                            <span>{item.farmer_name}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-amber-400 font-mono">
                            ₹{item.expected_price_per_ton.toLocaleString()} <span className="text-[10px] text-slate-400">/ ton</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ready: {item.availability_date}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Moisture:</span>
                          <span className="text-[10px] font-mono font-bold text-slate-300">{item.moisture_pct || 12}%</span>
                          <span className="text-slate-600 mx-1">•</span>
                          <span className="text-[10px] text-slate-400">Matches:</span>
                          <span className="text-[10px] font-mono font-bold text-sky-400">{item.active_matches_count} Buyers</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('smart-matches')}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          View Matches <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Active Processor Demand */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5" />
                    Verified Processor Demand ({filteredBuyers.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('buyer-demand')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredBuyers.slice(0, 4).map(buyer => (
                    <div
                      key={buyer.id}
                      className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/40 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{buyer.company_name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                              {buyer.buyer_type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{buyer.location}</span>
                            <span className="text-slate-600">•</span>
                            <span>Max {buyer.max_distance_km} km radius</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-sky-400 font-mono">
                            {buyer.required_quantity_tons} Tonnes
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Budget: ₹{buyer.min_price_per_ton} - ₹{buyer.max_price_per_ton}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            buyer.pickup_available
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {buyer.pickup_available ? 'Pickup Fleet Available' : 'Farmer Delivery Required'}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('smart-matches')}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        >
                          Find Sellers <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FARMER LISTINGS ("Sell Crop Residue") */}
        {activeTab === 'farmer-listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  Farmer Agricultural Residue Listings
                </h2>
                <p className="text-xs text-slate-400">
                  Pre-harvest and post-harvest paddy straw, mustard stalk, and bagasse ready for direct baling and pickup.
                </p>
              </div>
              <button
                onClick={() => setShowListingModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                Create New Residue Listing
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.1]">
                        {listing.id}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        listing.status === 'LISTED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      }`}>
                        {listing.status === 'LISTED' ? 'Available for Processing' : listing.status}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-base font-bold text-white">{listing.farmer_name}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{listing.location}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Crop / Residue</span>
                        <span className="text-slate-200 font-bold">{listing.crop_type} - {listing.residue_type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Estimated Tonnage</span>
                        <span className="text-emerald-400 font-bold text-sm">{listing.quantity_tons} Tonnes</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Moisture %</span>
                        <span className="text-slate-200 font-bold">{listing.moisture_pct || 12}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Expected Price</span>
                        <span className="text-amber-400 font-bold">₹{listing.expected_price_per_ton} / t</span>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-slate-400">
                      <span className="text-slate-500">Harvest:</span> {listing.harvest_date} | <span className="text-slate-500">Available:</span> {listing.availability_date}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenContactForListing(listing)}
                      className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.12] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      Contact Seller
                    </button>
                    <button
                      onClick={() => setActiveTab('smart-matches')}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      Match Buyers <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BUYER REQUIREMENTS */}
        {activeTab === 'buyer-demand' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Factory className="w-5 h-5 text-sky-400" />
                  Industrial Off-Taker & Processor Requirements
                </h2>
                <p className="text-xs text-slate-400">
                  Registered CBG bio-refineries, biochar kilns, pelletizers, and molded packaging plants.
                </p>
              </div>
              <button
                onClick={() => setShowBuyerModal(true)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-sky-500/20"
              >
                <Plus className="w-4 h-4" />
                Post Processor Demand
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBuyers.map(buyer => (
                <div
                  key={buyer.id}
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/50 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.1]">
                        {buyer.id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold">
                        {buyer.buyer_type}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-base font-bold text-white">{buyer.company_name}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{buyer.location}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Required Material</span>
                        <span className="text-slate-200 font-bold">{buyer.required_material}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Demand</span>
                        <span className="text-sky-400 font-bold text-sm">{buyer.required_quantity_tons} Tonnes</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Price Tolerance</span>
                        <span className="text-amber-400 font-bold">₹{buyer.min_price_per_ton} - ₹{buyer.max_price_per_ton}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Max Logistics Radius</span>
                        <span className="text-slate-200 font-bold">{buyer.max_distance_km} km</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Fulfilled: <b className="text-emerald-400 font-mono">{buyer.fulfilled_tons}t</b></span>
                      <span className="text-slate-400">Moisture Limit: <b className="text-slate-200 font-mono">≤{buyer.required_moisture_max_pct}%</b></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenContactForBuyer(buyer)}
                      className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.12] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <Phone className="w-3 h-3 text-sky-400" />
                      Contact Buyer
                    </button>
                    <button
                      onClick={() => setActiveTab('smart-matches')}
                      className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      View Matches <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SMART MATCHING ENGINE */}
        {activeTab === 'smart-matches' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Smart Compatibility Matching Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Multi-objective optimization evaluating distance, price overlap, moisture tolerance, and avoided open-burning air impact.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                Algorithm: <span className="text-emerald-400">40% Distance + 30% Price + 20% Moisture + 10% Volume</span>
              </div>
            </div>

            <div className="space-y-3">
              {filteredMatches.map(match => (
                <div
                  key={match.id}
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-5 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Parties summary */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Farmer Side */}
                      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                          Seller / Producer
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{match.farmer_name}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{match.farmer_location}</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300 mt-2">
                          Material: <b className="text-emerald-300">{match.material} ({match.matched_quantity_tons}t)</b>
                        </div>
                        <div className="text-xs font-mono text-amber-300 mt-0.5">
                          Est. Producer Revenue: <b>₹{match.estimated_farmer_revenue_inr.toLocaleString()}</b>
                        </div>
                      </div>

                      {/* Buyer Side */}
                      <div className="bg-sky-950/20 border border-sky-500/20 rounded-lg p-3.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                          Buyer / Off-Taker
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{match.buyer_name}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-sky-400" />
                          <span>{match.buyer_location}</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300 mt-2">
                          Delivery Distance: <b className="text-white">{match.distance_km} km</b>
                        </div>
                        <div className="text-xs font-mono text-sky-300 mt-0.5">
                          Est. Processor Transformed Value: <b>₹{match.estimated_processor_value_inr.toLocaleString()}</b>
                        </div>
                      </div>
                    </div>

                    {/* Compatibility Score & Action Column */}
                    <div className="lg:w-72 flex flex-col items-center justify-center p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-center">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Marketplace Compatibility Score
                      </span>
                      <div className="text-3xl font-black text-emerald-400 font-mono mt-1 flex items-baseline gap-1">
                        {match.compatibility_score}%
                        <span className="text-xs font-normal text-slate-400">match</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Multi-parameter algorithmic alignment
                      </span>

                      {/* Ecological & Economic KPIs */}
                      <div className="w-full grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-white/[0.06] text-[11px] font-mono">
                        <div className="bg-white/[0.02] rounded p-1">
                          <span className="text-slate-500 block text-[9px]">Avoided Burning</span>
                          <span className="text-emerald-300 font-bold">{match.avoided_burning_tons}t</span>
                        </div>
                        <div className="bg-white/[0.02] rounded p-1">
                          <span className="text-slate-500 block text-[9px]">PM2.5 Avoided</span>
                          <span className="text-cyan-300 font-bold">{match.estimated_pm25_avoided_kg} kg</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="w-full mt-3 flex items-center gap-2">
                        {match.status === 'ACCEPTED' ? (
                          <div className="w-full py-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4" /> Match Contracted
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAcceptMatch(match.id)}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
                            >
                              Accept Match
                            </button>
                            <button
                              onClick={() => handleOpenContactForMatch(match)}
                              className="px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
                              title="Direct Call, WhatsApp & Counterparty Negotiation"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              Contact
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TRANSPORT & COLLECTION NETWORK */}
        {activeTab === 'logistics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  Rural Collection & Transport Logistics Network
                </h2>
                <p className="text-xs text-slate-400">
                  Overcoming the #1 failure mode in residue processing: End-to-end telemetry from farm field to processing gate.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                Active Fleet: <span className="text-amber-400 font-bold">8 Baling Trucks</span> | In-Transit: <span className="text-emerald-400 font-bold">18.5 Tons</span>
              </div>
            </div>

            {/* Transport Pipeline Stepper */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-3">
                Residue Chain-of-Custody Lifecycle Stages
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { status: 'LISTED', label: '1. Listed', desc: 'Farmer declares volume' },
                  { status: 'MATCHED', label: '2. Matched', desc: 'Processor contract locked' },
                  { status: 'PICKUP_SCHEDULED', label: '3. Scheduled', desc: 'Baler assigned to farm' },
                  { status: 'IN_TRANSIT', label: '4. In Transit', desc: 'Truck routed via bypass' },
                  { status: 'DELIVERED', label: '5. Delivered', desc: 'Weighbridge check' },
                  { status: 'PROCESSED', label: '6. Transformed', desc: 'CBG / Biochar output' },
                ].map(st => (
                  <div key={st.status} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
                    <span className="text-xs font-bold text-white font-mono">{st.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{st.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Orders List */}
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{order.id}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-emerald-400 font-bold">{order.transporter_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          {order.vehicle_type}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Pickup Origin:</span>
                            <span className="text-white font-medium">{order.pickup_location}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Delivery Destination:</span>
                            <span className="text-white font-medium">{order.delivery_location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center flex-wrap gap-4 text-xs font-mono text-slate-400">
                        <span>Quantity: <b className="text-white">{order.quantity_tons}t</b></span>
                        <span>Distance: <b className="text-white">{order.distance_km} km</b></span>
                        <span>Est. Cost: <b className="text-amber-400">₹{order.transport_cost_inr.toLocaleString()}</b></span>
                        <span>Current: <b className="text-sky-300">{order.current_location}</b></span>
                        <span>ETA: <b className="text-emerald-300">{order.eta}</b></span>
                      </div>
                    </div>

                    {/* Status & Advance Control */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 block">Current Status</span>
                        <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                          {order.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {order.transporter_phone && (
                          <a
                            href={`tel:${order.transporter_phone}`}
                            className="px-2.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.12] rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                            title={`Call Driver: ${order.transporter_phone}`}
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            Call Fleet
                          </a>
                        )}
                        {order.status === 'PICKUP_SCHEDULED' && (
                          <button
                            onClick={() => handleAdvanceTransport(order.id, 'IN_TRANSIT' as TransportStatus)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {order.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleAdvanceTransport(order.id, 'DELIVERED' as TransportStatus)}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                          >
                            Confirm Delivery
                          </button>
                        )}
                        {order.status === 'DELIVERED' && (
                          <button
                            onClick={() => handleAdvanceTransport(order.id, 'PROCESSED' as TransportStatus)}
                            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                          >
                            Confirm Transformed
                          </button>
                        )}
                        {order.status === 'PROCESSED' && (
                          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Transformed to Bio-Value
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit Timeline */}
                  {order.timeline && order.timeline.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
                        Logistics Checkpoint Audit Log:
                      </span>
                      <div className="space-y-1.5">
                        {order.timeline.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-500 text-[10px] w-20">{entry.time}</span>
                            <span className="text-emerald-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04]">
                              {entry.stage}
                            </span>
                            <span className="text-slate-300 text-[11px]">{entry.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: IMPACT & MONETIZATION DASHBOARD */}
        {activeTab === 'impact-dashboard' && impact && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                AeroSense Environmental & Business Model Metrics
              </h2>
              <p className="text-xs text-slate-400">
                Transparent accounting of crop residue diverted from burning, direct farmer earnings, and platform revenue.
              </p>
            </div>

            {/* Dual Grid: Environmental vs Business Story */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Environmental Impact Card */}
              <div className="bg-white/[0.03] border border-emerald-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Pollution Prevention Accounting
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Airshed Prevention
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Residue Diverted</span>
                    <div className="text-2xl font-bold text-white font-mono mt-1">
                      {impact.residue_diverted_tons} <span className="text-xs text-slate-400">tonnes</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total biomass mobilized</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Avoided Burning</span>
                    <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                      {impact.estimated_burning_avoided_tons} <span className="text-xs text-slate-400">tonnes</span>
                    </div>
                    <span className="text-[10px] text-emerald-300/70">Estimated 96% diversion</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Avoided PM2.5 Release</span>
                    <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
                      {impact.estimated_pm25_avoided_kg.toLocaleString()} <span className="text-xs text-slate-400">kg</span>
                    </div>
                    <span className="text-[10px] text-slate-400">~3.85 kg / ton burned</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Avoided CO₂e Emissions</span>
                    <div className="text-2xl font-bold text-purple-300 font-mono mt-1">
                      {impact.estimated_co2e_avoided_tons.toLocaleString()} <span className="text-xs text-slate-400">tCO₂e</span>
                    </div>
                    <span className="text-[10px] text-slate-400">~1.46 tCO₂e / ton straw</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono bg-white/[0.02] p-3 rounded-lg border border-white/[0.06]">
                  <b>Methodology & Assumptions:</b> {impact.methodology_disclaimer}
                </div>
              </div>

              {/* AeroSense Platform Business Model Card */}
              <div className="bg-white/[0.03] border border-purple-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    AeroSense Monetization & Economics
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    B2B Climate-Tech
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Gross Merchandise Value (GMV)</span>
                    <div className="text-2xl font-bold text-white font-mono mt-1">
                      ₹{(impact.platform_gmv_inr / 100000).toFixed(2)}L
                    </div>
                    <span className="text-[10px] text-slate-400">Total transacted residue value</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">AeroSense Net Revenue</span>
                    <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                      ₹{(impact.platform_revenue_inr / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-purple-300/70">3.5% transaction commission</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Farmer Earnings Created</span>
                    <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                      ₹{(impact.revenue_generated_for_farmers_inr / 100000).toFixed(2)}L
                    </div>
                    <span className="text-[10px] text-amber-300/70">Avg ₹17,850 per farmer</span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Successful Trades</span>
                    <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                      {impact.successful_matches}
                    </div>
                    <span className="text-[10px] text-slate-400">Avg transaction ₹{impact.average_transaction_value_inr.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-300 bg-white/[0.02] p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                    AeroSense Revenue Streams:
                  </span>
                  <div className="flex items-center justify-between">
                    <span>1. Marketplace Transaction Fee:</span>
                    <b className="text-purple-300">3.5% per fulfilled contract</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>2. Processor Telemetry Subscription:</span>
                    <b className="text-sky-300">₹45,000 / month / plant</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>3. Logistics Routing & Baling Commission:</span>
                    <b className="text-amber-300">₹120 / tonne dispatched</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>4. Verified Carbon / Impact Audit Certificate:</span>
                    <b className="text-emerald-300">₹8,500 / audit dossier</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE RESIDUE LISTING MODAL */}
      {showListingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0b131e] border border-white/[0.15] rounded-2xl w-full max-w-xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Farmer Crop Residue Listing</h3>
              </div>
              <button onClick={() => setShowListingModal(false)} className="text-slate-400 hover:text-white font-mono text-sm p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Farmer Name / FPO</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Harpreet Singh"
                    value={listingForm.farmer_name}
                    onChange={e => setListingForm({ ...listingForm, farmer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Location & Village</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Modinagar, Meerut"
                    value={listingForm.location}
                    onChange={e => setListingForm({ ...listingForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Crop Type</label>
                  <select
                    value={listingForm.crop_type}
                    onChange={e => setListingForm({ ...listingForm, crop_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="Paddy">Paddy (Rice)</option>
                    <option value="Mustard">Mustard</option>
                    <option value="Sugarcane">Sugarcane</option>
                    <option value="Wheat">Wheat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Residue Type</label>
                  <input
                    type="text"
                    required
                    value={listingForm.residue_type}
                    onChange={e => setListingForm({ ...listingForm, residue_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Quantity (Tonnes)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={listingForm.quantity_tons}
                    onChange={e => setListingForm({ ...listingForm, quantity_tons: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Moisture %</label>
                  <input
                    type="number"
                    min="5"
                    max="40"
                    step="0.5"
                    value={listingForm.moisture_pct}
                    onChange={e => setListingForm({ ...listingForm, moisture_pct: parseFloat(e.target.value) || 12 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Availability Date</label>
                  <input
                    type="date"
                    required
                    value={listingForm.availability_date}
                    onChange={e => setListingForm({ ...listingForm, availability_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Expected Price (₹/ton)</label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    required
                    value={listingForm.expected_price_per_ton}
                    onChange={e => setListingForm({ ...listingForm, expected_price_per_ton: parseFloat(e.target.value) || 2000 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowListingModal(false)}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Publish Residue Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST BUYER REQUIREMENT MODAL */}
      {showBuyerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0b131e] border border-white/[0.15] rounded-2xl w-full max-w-xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Register Processor Biomass Demand</h3>
              </div>
              <button onClick={() => setShowBuyerModal(false)} className="text-slate-400 hover:text-white font-mono text-sm p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBuyer} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Company / Facility Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., GreenBio Energy CBG Corp"
                    value={buyerForm.company_name}
                    onChange={e => setBuyerForm({ ...buyerForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Facility Type</label>
                  <select
                    value={buyerForm.buyer_type}
                    onChange={e => setBuyerForm({ ...buyerForm, buyer_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="CBG / Bio-CNG Facility">CBG / Bio-CNG Facility</option>
                    <option value="Biochar Producer">Biochar Producer</option>
                    <option value="Biomass Pellet Plant">Biomass Pellet Plant</option>
                    <option value="Molded Pulp Packaging">Molded Pulp Packaging</option>
                    <option value="Paper & Kraft Mill">Paper & Kraft Mill</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Bulandshahr, UP"
                    value={buyerForm.location}
                    onChange={e => setBuyerForm({ ...buyerForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Required Material</label>
                  <input
                    type="text"
                    required
                    value={buyerForm.required_material}
                    onChange={e => setBuyerForm({ ...buyerForm, required_material: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Required Volume (Tons)</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    required
                    value={buyerForm.required_quantity_tons}
                    onChange={e => setBuyerForm({ ...buyerForm, required_quantity_tons: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Max Distance (km)</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={buyerForm.max_distance_km}
                    onChange={e => setBuyerForm({ ...buyerForm, max_distance_km: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Min Price (₹/ton)</label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    value={buyerForm.min_price_per_ton}
                    onChange={e => setBuyerForm({ ...buyerForm, min_price_per_ton: parseFloat(e.target.value) || 2000 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Max Price (₹/ton)</label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    value={buyerForm.max_price_per_ton}
                    onChange={e => setBuyerForm({ ...buyerForm, max_price_per_ton: parseFloat(e.target.value) || 2500 })}
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pickup_avail"
                  checked={buyerForm.pickup_available}
                  onChange={e => setBuyerForm({ ...buyerForm, pickup_available: e.target.checked })}
                  className="rounded border-white/[0.2] bg-white/[0.05] text-sky-500 focus:ring-0"
                />
                <label htmlFor="pickup_avail" className="text-slate-300 font-mono">
                  Company provides dedicated baler & logistics pickup from farm gate
                </label>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBuyerModal(false)}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg shadow-lg"
                >
                  Broadcast Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counterparty Contact & Deal Negotiation Modal */}
      <ContactNegotiationModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        target={contactTarget}
        onProposalSent={(msg: string) => {
          setActionSuccessMsg(msg);
          setTimeout(() => setActionSuccessMsg(null), 6000);
        }}
      />
    </div>
  );
}

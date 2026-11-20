'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMine } from '@/context/MineContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatMineSiteDisplay } from '@/lib/displayFormatters';
import {
  Compass,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  IndianRupee,
  Truck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface FleetLeadRecord {
  id: string;
  name?: string;
  leadName: string;
  mineSite: string;
  leadKm: number;
  leadRate: number;
  validFrom?: string;
  validTo?: string;
  description?: string;
}

interface MiningTripStats {
  leadName: string;
  tripCount: number;
  totalTonnage: number;
  totalRevenue: number;
}

function LeadsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { currentMine, allowedMines, isAllMines, isSingleMine, mineOptions, activeMineLabel } = useMine();

  const tabParam = searchParams.get('tab') as 'home' | 'report' | null;
  const actionParam = searchParams.get('action');

  // Active Tab: 'home' | 'report'
  const [activeTab, setActiveTab] = useState<'home' | 'report'>(tabParam || 'home');

  // Leads state
  const [leads, setLeads] = useState<FleetLeadRecord[]>([]);
  const [tripStats, setTripStats] = useState<Record<string, MiningTripStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mineFilter, setMineFilter] = useState('ALL');

  // Add Lead Modal state
  const [isModalOpen, setIsModalOpen] = useState(actionParam === 'new');

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (actionParam === 'new') setIsModalOpen(true);
  }, [actionParam]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newMineSite, setNewMineSite] = useState(
    currentMine !== 'ALL' ? currentMine : (mineOptions[0]?.value || 'JBR Eastern — Talcher Site')
  );
  const [newLeadKm, setNewLeadKm] = useState('12.5');
  const [newLeadRate, setNewLeadRate] = useState('120.00');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Leads
  const loadLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (currentMine && currentMine !== 'ALL') {
        params.append('mine_site', currentMine);
      }
      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to retrieve haulage leads.');
      }
      setLeads(json.data || []);

      // Also query trips to compile stats per lead
      const tripsRes = await fetch('/api/trips?limit=500');
      const tripsJson = await tripsRes.json();
      if (tripsRes.ok && tripsJson.success && Array.isArray(tripsJson.data)) {
        const statsMap: Record<string, MiningTripStats> = {};
        for (const t of tripsJson.data) {
          const leadKey = (t as any).custom_lead || (t as any).lead || 'Standard Corridor';
          if (!statsMap[leadKey]) {
            statsMap[leadKey] = {
              leadName: leadKey,
              tripCount: 0,
              totalTonnage: 0,
              totalRevenue: 0,
            };
          }
          statsMap[leadKey].tripCount += 1;
          const tonnage = Number(t.netWeightTons || t.net_weight_tons || 0);
          statsMap[leadKey].totalTonnage += tonnage;
          const rev = Number((t as any).custom_calculated_amount || (t as any).customCalculatedAmount || tonnage * 120);
          statsMap[leadKey].totalRevenue += rev;
        }
        setTripStats(statsMap);
      }
    } catch (err: any) {
      console.error('Error loading leads:', err);
      setError(err.message || 'Error fetching haulage leads.');
    } finally {
      setIsLoading(false);
    }
  }, [currentMine]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Handle Add Lead Submission
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newLeadName.trim()) {
      setModalError('Lead corridor name is required.');
      return;
    }
    const km = parseFloat(newLeadKm);
    if (isNaN(km) || km <= 0) {
      setModalError('Distance in KM must be greater than zero.');
      return;
    }
    const rate = parseFloat(newLeadRate);
    if (isNaN(rate) || rate < 0) {
      setModalError('Rate in ₹/MT must be a valid positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: newLeadName.trim(),
          mineSite: newMineSite,
          leadKm: km,
          leadRate: rate,
          validFrom: newValidFrom || undefined,
          validTo: newValidTo || undefined,
          description: newDescription.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create haulage corridor.');
      }

      setIsModalOpen(false);
      setNewLeadName('');
      setNewLeadKm('12.5');
      setNewLeadRate('120.00');
      setNewDescription('');
      await loadLeads();
    } catch (err: any) {
      setModalError(err.message || 'Error creating lead corridor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.mineSite.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchMine = mineFilter === 'ALL' || l.mineSite === mineFilter;
      return matchSearch && matchMine;
    });
  }, [leads, searchQuery, mineFilter]);

  // Aggregate Metrics
  const totalCorridors = leads.length;
  const avgRate = leads.length > 0 ? leads.reduce((sum, l) => sum + (l.leadRate || 0), 0) / leads.length : 0;
  const avgDistance = leads.length > 0 ? leads.reduce((sum, l) => sum + (l.leadKm || 0), 0) / leads.length : 0;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Haulage Leads & Corridors"
          subtitle="Manage mining pit haulage corridors, one-way distance milestones, contracted freight rates, and historical trip volume reconciliation."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={loadLeads}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setModalError(null);
                  setIsModalOpen(true);
                }}
              >
                + Add Haulage Lead
              </Button>
            </div>
          }
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'home'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            Lead Home & Corridors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'report'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Haulage Performance Report
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Active Corridors</span>
              <Compass className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalCorridors}</div>
            <p className="text-[11px] text-slate-400 mt-1">Configured haulage routes in ERPNext</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Average Freight Rate</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">₹{avgRate.toFixed(2)}</div>
            <p className="text-[11px] text-slate-400 mt-1">Per metric ton payload</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Average Haul Distance</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{avgDistance.toFixed(1)} KM</div>
            <p className="text-[11px] text-slate-400 mt-1">Pit to delivery destination distance</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search corridors by name, destination, or mine site..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {mineOptions.length > 0 && (
              <select
                value={mineFilter}
                onChange={(e) => setMineFilter(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              >
                <option value="ALL">All Mine Sites</option>
                {mineOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredLeads.length} of {leads.length} corridors
          </div>
        </div>

        {/* TAB 1: Lead Home & Corridor List */}
        {activeTab === 'home' && (
          <>
            {isLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Retrieving Fleet Lead records...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No haulage corridors found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "+ Add Haulage Lead" to register a designated mining delivery corridor.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Lead Corridor Name</th>
                        <th className="py-3 px-4">Stationed Mine</th>
                        <th className="py-3 px-4 text-right">Distance (KM)</th>
                        <th className="py-3 px-4 text-right">Freight Rate (₹/MT)</th>
                        <th className="py-3 px-4">Validity Period</th>
                        <th className="py-3 px-4 text-right">Trips Logged</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => {
                        const stats = tripStats[lead.leadName] || tripStats[lead.id];
                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center font-bold text-xs">
                                  <Compass className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div>{lead.leadName}</div>
                                  {lead.description && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">{lead.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span>{formatMineSiteDisplay(lead.mineSite)}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                              {Number(lead.leadKm || 0).toFixed(1)} KM
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ₹{Number(lead.leadRate || 0).toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              {lead.validFrom ? (
                                <span className="font-mono text-[11px]">
                                  {lead.validFrom} to {lead.validTo || 'Present'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Standing Tariff</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              {stats?.tripCount ? (
                                <span className="font-semibold text-blue-900">{stats.tripCount} trips</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Badge variant="positive" size="sm">
                                Active Tariff
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Haulage Performance Report */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Haulage Volume & Revenue Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated haulage reconciliation calculated from verified Mining Trips ($AMOUNT = QNT \times RATE$)
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                Live Trip Ledgers
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Haulage Corridor</th>
                      <th className="py-3 px-4">Mine Site</th>
                      <th className="py-3 px-4 text-right">Contracted Rate</th>
                      <th className="py-3 px-4 text-right">Completed Trips</th>
                      <th className="py-3 px-4 text-right">Total Quantity (MT)</th>
                      <th className="py-3 px-4 text-right">Billed Haulage Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => {
                      const stats = tripStats[lead.leadName] || tripStats[lead.id] || {
                        tripCount: 0,
                        totalTonnage: 0,
                        totalRevenue: 0,
                      };
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {lead.leadName}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {formatMineSiteDisplay(lead.mineSite)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                            ₹{Number(lead.leadRate || 0).toFixed(2)}/MT
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-900">
                            {stats.tripCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {stats.totalTonnage.toFixed(2)} MT
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Haulage Lead */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Register Haulage Lead Corridor</h2>
                  <p className="text-xs text-slate-500">Configure standard distance and freight rates for trip auto-population</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Lead Corridor Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="e.g. Pit 1 to Coal Washery 4"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Mine Site <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newMineSite}
                    onChange={(e) => setNewMineSite(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    {mineOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                    {mineOptions.length === 0 && (
                      <option value="JBR Eastern — Talcher Site">JBR Eastern — Talcher Site</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Distance (One-Way KM) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newLeadKm}
                      onChange={(e) => setNewLeadKm(e.target.value)}
                      placeholder="12.5"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Freight Rate (₹/MT) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newLeadRate}
                      onChange={(e) => setNewLeadRate(e.target.value)}
                      placeholder="120.00"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Valid From Date
                    </label>
                    <input
                      type="date"
                      value={newValidFrom}
                      onChange={(e) => setNewValidFrom(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Valid To Date
                    </label>
                    <input
                      type="date"
                      value={newValidTo}
                      onChange={(e) => setNewValidTo(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Route Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Specific route directives, terrain details, or contracted billing notes..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Haulage Corridor</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer>
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Lead Data...</span>
            </div>
          </PageContainer>
        </AppShell>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}

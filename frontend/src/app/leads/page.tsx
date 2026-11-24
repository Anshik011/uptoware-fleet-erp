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
  Printer,
  Pencil,
} from 'lucide-react';

interface FleetLeadRecord {
  id: string;
  name?: string;
  leadName: string;
  mineSite: string;
  leadKm: number | string;
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

function parseLeadDistance(leadKm: string | number | undefined | null): { num: number; display: string } {
  if (leadKm == null || leadKm === '') return { num: 0, display: '—' };
  const str = String(leadKm).trim();
  const rangeMatch = str.match(/^([\d.]+)\s*[-–—]\s*([\d.]+)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    const avg = !isNaN(low) && !isNaN(high) ? (low + high) / 2 : (!isNaN(low) ? low : 0);
    return { num: avg, display: `${low}–${high} KM` };
  }
  const clean = parseFloat(str.replace(/[^\d.]/g, ''));
  if (!isNaN(clean)) {
    return { num: clean, display: `${clean.toFixed(1)} KM` };
  }
  return { num: 0, display: str };
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
        const activeLeads: FleetLeadRecord[] = json.data || [];

        for (const t of tripsJson.data) {
          const rawLead = String(t.lead || (t as any).custom_lead || t.destination || '').trim();
          if (!rawLead) continue;

          // Normalize and find matching lead
          const matched = activeLeads.find(
            (l) =>
              l.leadName.toLowerCase().trim() === rawLead.toLowerCase() ||
              l.id.toLowerCase().trim() === rawLead.toLowerCase() ||
              rawLead.toLowerCase().startsWith(l.leadName.toLowerCase()) ||
              l.leadName.toLowerCase().startsWith(rawLead.toLowerCase())
          );
          const canonicalKey = matched ? matched.leadName : rawLead;

          if (!statsMap[canonicalKey]) {
            statsMap[canonicalKey] = {
              leadName: canonicalKey,
              tripCount: 0,
              totalTonnage: 0,
              totalRevenue: 0,
            };
          }

          const rawTrips = Number(t.tripCount || (t as any).custom_trip_count || 1);
          statsMap[canonicalKey].tripCount += !isNaN(rawTrips) && rawTrips > 0 ? rawTrips : 1;

          // Tonnage: calculatedQuantity (volumetric) or netWeightTons
          const rawTonnage = parseFloat(
            String(t.calculatedQuantity ?? (t as any).custom_calculated_quantity ?? t.netWeightTons ?? (t as any).net_weight_tons ?? 0)
          );
          const safeTonnage = !isNaN(rawTonnage) && rawTonnage > 0 ? rawTonnage : 0;
          statsMap[canonicalKey].totalTonnage += safeTonnage;

          // Revenue: calculatedAmount or grossRevenue or tonnage * leadRate
          let rawRev = parseFloat(
            String(t.calculatedAmount ?? (t as any).custom_calculated_amount ?? t.grossRevenue ?? (t as any).gross_revenue ?? 0)
          );
          if (isNaN(rawRev) || rawRev <= 0) {
            const rawRate = parseFloat(
              String(t.leadRate ?? (t as any).custom_lead_rate ?? t.ratePerTon ?? matched?.leadRate ?? 0)
            );
            const safeRate = !isNaN(rawRate) ? rawRate : 0;
            rawRev = safeTonnage * safeRate;
          }
          if (!isNaN(rawRev) && rawRev > 0) {
            statsMap[canonicalKey].totalRevenue += rawRev;
          }
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
      setModalError('Lead name is required.');
      return;
    }
    if (!newLeadKm.trim()) {
      setModalError('Distance (One-Way KM) is required (e.g. 3-4 or 4-5).');
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
          leadKm: newLeadKm.trim(),
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

  // Aggregate Metrics with strict NaN protection
  const totalCorridors = leads.length;
  const avgRate =
    leads.length > 0
      ? leads.reduce((sum, l) => {
          const r = parseFloat(String(l.leadRate || 0));
          return sum + (!isNaN(r) ? r : 0);
        }, 0) / leads.length
      : 0;

  const avgDistance =
    leads.length > 0
      ? leads.reduce((sum, l) => {
          const d = parseLeadDistance(l.leadKm).num;
          return sum + (!isNaN(d) ? d : 0);
        }, 0) / leads.length
      : 0;

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
            <p className="text-[11px] text-slate-400 mt-1">Configured commercial haulage routes</p>
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
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Lead Name</th>
                        <th className="py-3 px-4 text-right">Distance</th>
                        <th className="py-3 px-4 text-right">Trip Logged</th>
                        <th className="py-3 px-4 text-right">Qnt Logged</th>
                        <th className="py-3 px-4">Validity</th>
                        <th className="py-3 px-4 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => {
                        const stats = tripStats[lead.leadName] || tripStats[lead.id];
                        const tripsLogged = stats?.tripCount || 0;
                        const qntLogged = (stats?.totalTonnage || 0).toFixed(2);

                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0">
                                  <Compass className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div>{lead.leadName}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatMineSiteDisplay(lead.mineSite)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                              {parseLeadDistance(lead.leadKm).display}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">
                              {tripsLogged > 0 ? `${tripsLogged} trips` : '0'}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                              {qntLogged} MT
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

                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewLeadName(lead.leadName);
                                  setNewMineSite(lead.mineSite);
                                  setNewLeadKm(String(lead.leadKm || ''));
                                  setNewLeadRate(String(lead.leadRate || ''));
                                  setNewValidFrom(lead.validFrom || '');
                                  setNewValidTo(lead.validTo || '');
                                  setNewDescription(lead.description || '');
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                                title="Edit Lead"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
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
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Haulage Volume & Revenue Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated haulage reconciliation calculated from verified Mining Trips ($AMOUNT = QNT \times RATE$)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  Print Report
                </Button>
                <Badge variant="neutral" size="sm">
                  Live Trip Ledgers
                </Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Lead Name</th>
                      <th className="py-3 px-4 text-right">Distance</th>
                      <th className="py-3 px-4 text-right">Total Trip</th>
                      <th className="py-3 px-4 text-right">Total Qnt</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => {
                      const stats =
                        tripStats[lead.leadName] ||
                        tripStats[lead.id] ||
                        Object.values(tripStats).find(
                          (s) => s.leadName.toLowerCase().trim() === lead.leadName.toLowerCase().trim()
                        ) || {
                          tripCount: 0,
                          totalTonnage: 0,
                          totalRevenue: 0,
                        };

                      const safeRate = parseFloat(String(lead.leadRate || 0)) || 0;
                      const safeTonnage = !isNaN(stats.totalTonnage) ? stats.totalTonnage : 0;
                      const safeRevenue = !isNaN(stats.totalRevenue) ? stats.totalRevenue : (safeTonnage * safeRate);
                      const safeTrips = !isNaN(stats.tripCount) ? stats.tripCount : 0;

                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {lead.leadName}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                            {parseLeadDistance(lead.leadKm).display}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-900">
                            {safeTrips} trips
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {safeTonnage.toFixed(2)} MT
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            ₹{safeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                      <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-[11px] text-slate-700">
                        TOTAL {searchQuery ? `FOR "${searchQuery}"` : 'HAULAGE PERFORMANCE'} ({filteredLeads.length} LEADS)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                        {filteredLeads.reduce((acc, l) => {
                          const s = tripStats[l.leadName] || tripStats[l.id];
                          return acc + (s?.tripCount || 0);
                        }, 0)} trips
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        {filteredLeads.reduce((acc, l) => {
                          const s = tripStats[l.leadName] || tripStats[l.id];
                          return acc + (s?.totalTonnage || 0);
                        }, 0).toFixed(2)} MT
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                        ₹{filteredLeads.reduce((acc, l) => {
                          const s = tripStats[l.leadName] || tripStats[l.id];
                          const r = parseFloat(String(l.leadRate || 0)) || 0;
                          const rev = s?.totalRevenue && s.totalRevenue > 0 ? s.totalRevenue : ((s?.totalTonnage || 0) * r);
                          return acc + rev;
                        }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
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
                  <h2 className="text-base font-bold text-slate-900">Lead Name Entry</h2>
                  <p className="text-xs text-slate-500">Configure lead name, distance slabs (e.g. 3-4, 4-5 km), and freight rates</p>
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
                      type="text"
                      required
                      value={newLeadKm}
                      onChange={(e) => setNewLeadKm(e.target.value)}
                      placeholder="e.g. 3-4 or 4-5"
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

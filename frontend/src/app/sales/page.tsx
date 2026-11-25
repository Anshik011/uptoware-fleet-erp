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
import { formatVehicleDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';
import {
  ShoppingCart,
  Truck,
  Package,
  Calendar,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  Clock,
} from 'lucide-react';

interface PartSaleRecord {
  id: string;
  name: string;
  customer: string;
  postingDate: string;
  vehicle: string | null;
  mineSite: string | null;
  grandTotal: number;
  totalQty: number;
  status: string;
  docstatus?: number;
  remarks: string | null;
  items: Array<{
    itemCode: string;
    itemName: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
}

interface ItemOption {
  itemCode: string;
  itemName: string;
  standardRate?: number;
  valuationRate?: number;
  actualQty?: number;
  stockUom?: string;
}

interface VehicleOption {
  id: string;
  licensePlate: string;
}

function SalesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { currentMine, allowedMines, isAllMines, isSingleMine, mineOptions } = useMine();

  const tabParam = searchParams.get('tab') as 'home' | 'report' | null;
  const actionParam = searchParams.get('action');

  const [activeTab, setActiveTab] = useState<'home' | 'report'>(tabParam || 'home');
  const [sales, setSales] = useState<PartSaleRecord[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(actionParam === 'new');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleApproveSale = async (id: string) => {
    try {
      setApprovingId(id);
      setActionMessage(null);
      const res = await fetch(`/api/sales/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to approve parts sale.');
      }
      setActionMessage(`Sales Invoice ${id} approved & submitted successfully.`);
      await loadSales();
    } catch (err: any) {
      console.error('Error approving sale:', err);
      alert(err.message || 'Error approving invoice.');
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (actionParam === 'new') setIsModalOpen(true);
  }, [actionParam]);
  const [modalVehicle, setModalVehicle] = useState('');
  const [modalItemCode, setModalItemCode] = useState('');
  const [modalItemName, setModalItemName] = useState('');
  const [modalQty, setModalQty] = useState('1');
  const [modalRate, setModalRate] = useState('0');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalMine, setModalMine] = useState(
    currentMine !== 'ALL' ? currentMine : (mineOptions[0]?.value || 'JBR Eastern — Talcher Site')
  );
  const [modalRemarks, setModalRemarks] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated Amount: QNT * RATE
  const computedAmount = useMemo(() => {
    const q = parseFloat(modalQty) || 0;
    const r = parseFloat(modalRate) || 0;
    return Math.round(q * r * 100) / 100;
  }, [modalQty, modalRate]);

  // Load Sales Data
  const loadSales = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (vehicleFilter && vehicleFilter !== 'ALL') params.append('vehicle', vehicleFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (currentMine && currentMine !== 'ALL') params.append('mine_site', currentMine);

      const res = await fetch(`/api/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch sales invoices.');
      }
      setSales(json.data || []);
    } catch (err: any) {
      console.error('Error loading sales:', err);
      setError(err.message || 'Error fetching sales records.');
    } finally {
      setIsLoading(false);
    }
  }, [vehicleFilter, fromDate, toDate, currentMine]);

  // Load Vehicles & Items for Dropdowns
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [vRes, iRes] = await Promise.all([
          fetch('/api/vehicles?limit=200'),
          fetch('/api/inventory/items?limit=200'),
        ]);
        const vJson = await vRes.json();
        const iJson = await iRes.json();

        if (vJson.success && Array.isArray(vJson.data)) {
          setVehicles(
            vJson.data.map((v: any) => ({
              id: v.id,
              licensePlate: formatVehicleDisplay(v.id) || v.licensePlate || v.id,
            }))
          );
        }

        if (iJson.success && Array.isArray(iJson.items || iJson.data)) {
          const rawItems = iJson.items || iJson.data;
          setItems(
            rawItems.map((it: any) => ({
              itemCode: it.itemCode || it.name,
              itemName: it.itemName || it.item_name || it.itemCode,
              standardRate: Number(it.standardRate || it.standard_rate || 0),
              valuationRate: Number(it.valuationRate || it.valuation_rate || it.standardRate || 0),
              actualQty: Number(it.totalActualQty ?? it.actual_qty ?? 0),
              stockUom: it.stockUom || it.stock_uom || 'Nos',
            }))
          );
        }
      } catch (err) {
        console.warn('Could not prefetch sales dropdown metadata:', err);
      }
    }
    fetchMetadata();
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Item dropdown change handler
  const handleItemSelect = (code: string) => {
    setModalItemCode(code);
    const found = items.find((it) => it.itemCode === code);
    if (found) {
      setModalItemName(found.itemName);
      // Automatically populate rate from purchase valuation rate, falling back to standard rate
      const effectiveRate = found.valuationRate && found.valuationRate > 0 ? found.valuationRate : (found.standardRate || 0);
      if (effectiveRate > 0) {
        setModalRate(String(effectiveRate));
      }
    }
  };

  // Submit Sale Entry
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalItemCode) {
      setModalError('Please select a spare part / item from catalog.');
      return;
    }
    const q = parseFloat(modalQty);
    if (isNaN(q) || q <= 0) {
      setModalError('Quantity must be greater than zero.');
      return;
    }
    const r = parseFloat(modalRate);
    if (isNaN(r) || r < 0) {
      setModalError('Rate must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postingDate: modalDate,
          vehicle: modalVehicle || undefined,
          mineSite: modalMine || undefined,
          itemCode: modalItemCode,
          itemName: modalItemName || modalItemCode,
          qty: q,
          rate: r,
          remarks: modalRemarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record part sale.');
      }

      setIsModalOpen(false);
      setModalVehicle('');
      setModalItemCode('');
      setModalItemName('');
      setModalQty('1');
      setModalRate('0');
      setModalRemarks('');
      setActionMessage(`Sales Invoice ${json.data?.id || ''} created in Pending. Click "Approve & Submit" to finalize.`);
      if (statusFilter === 'APPROVED') {
        setStatusFilter('PENDING');
      }
      await loadSales();
    } catch (err: any) {
      setModalError(err.message || 'Error creating sale invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Counts
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    for (const s of sales) {
      if (s.docstatus === 0 || s.status === 'Draft') pending++;
      else if (s.docstatus === 1 || s.status === 'Submitted' || s.status === 'Paid') approved++;
    }
    return { all: sales.length, pending, approved };
  }, [sales]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Status filter
      const isPending = s.docstatus === 0 || s.status === 'Draft';
      const isApproved = s.docstatus === 1 || s.status === 'Submitted' || s.status === 'Paid';
      if (statusFilter === 'PENDING' && !isPending) return false;
      if (statusFilter === 'APPROVED' && !isApproved) return false;

      // Vehicle filter
      if (vehicleFilter && vehicleFilter !== 'ALL' && s.vehicle !== vehicleFilter) return false;

      // Date range filter
      if (fromDate && s.postingDate && s.postingDate < fromDate) return false;
      if (toDate && s.postingDate && s.postingDate > toDate) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          s.id.toLowerCase().includes(q) ||
          (s.vehicle && s.vehicle.toLowerCase().includes(q)) ||
          (s.customer && s.customer.toLowerCase().includes(q)) ||
          s.items.some((it) => (it.itemName && it.itemName.toLowerCase().includes(q)) || (it.itemCode && it.itemCode.toLowerCase().includes(q)));
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [sales, statusFilter, vehicleFilter, fromDate, toDate, searchQuery]);

  // Aggregate Metrics
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalPartsSold = sales.reduce(
    (acc, s) => acc + (s.items.reduce((iAcc, it) => iAcc + it.qty, 0) || s.totalQty || 0),
    0
  );
  const totalInvoices = sales.length;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Spare Parts Sales"
          subtitle="Record and track external parts sales and billable vehicle maintenance issues with verified commercial sales invoices."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={loadSales}
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
                + Sale Entry
              </Button>
            </div>
          }
        />

        {/* Success Action Notification Banner */}
        {actionMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{actionMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <ShoppingCart className="w-4 h-4" />
            Sales Home & Invoices
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
            Sale Parts Report
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Total Sales Revenue</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ₹{totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total value of billed parts</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Spare Parts Sold</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalPartsSold} units</div>
            <p className="text-[11px] text-slate-400 mt-1">Dispatched inventory components</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Sales Invoices</span>
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalInvoices}</div>
            <p className="text-[11px] text-slate-400 mt-1">Recorded sales transactions</p>
          </div>
        </div>

        {/* Filter Bar with Status Pills, Search, Date and Vehicle filters */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Status Filter Options: All / Pending / Approved */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending ({counts.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved ({counts.approved})</span>
              </button>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, vehicle, item..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {/* Vehicle Filter */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
            >
              <option value="ALL">All Fleet Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate}
                </option>
              ))}
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              />
              <span>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="text-xs"
            >
              Print
            </Button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredSales.length} of {sales.length} transactions
          </div>
        </div>

        {/* TAB 1: Sales Directory */}
        {activeTab === 'home' && (
          <>
            {isLoading ? (
              <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                <p className="text-xs text-slate-500">Retrieving parts sales records...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
                <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">No parts sales found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "+ Sale Entry" to log a spare parts sale transaction against a fleet vehicle.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3 text-center w-12 font-mono">Sl No</th>
                        <th className="py-3 px-4">Ref No</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Vehicle Number</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-right">Qnt</th>
                        <th className="py-3 px-4 text-right">Rate</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((sale, idx) => {
                        const totalQty = sale.items.reduce((sum, it) => sum + it.qty, 0) || sale.totalQty || 0;
                        const primaryItem = sale.items[0];
                        const itemsText = sale.items.length > 0
                          ? sale.items.map((it) => it.itemName || it.itemCode).join(', ')
                          : 'Spare Parts';
                        const rate = primaryItem ? primaryItem.rate : (totalQty > 0 ? sale.grandTotal / totalQty : 0);
                        const isPending = sale.docstatus === 0 || sale.status === 'Draft';

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-blue-900">
                              {sale.id}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{sale.postingDate}</td>
                            <td className="py-3 px-4">
                              {sale.vehicle ? (
                                <div className="flex items-center gap-1.5 font-semibold text-slate-800 font-mono">
                                  <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{formatVehicleDisplay(sale.vehicle)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Direct / Counter Sale</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800">
                                {itemsText}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {totalQty}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                              ₹{sale.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPending ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 mr-1" /> Pending Approval
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isPending ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  isLoading={approvingId === sale.id}
                                  disabled={approvingId === sale.id}
                                  onClick={() => handleApproveSale(sale.id)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1 shadow-2xs ml-auto"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve & Submit</span>
                                </Button>
                              ) : (
                                <span className="text-emerald-700 text-[11px] font-semibold flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approved</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredSales.length > 0 && (
                      <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
                        <tr>
                          <td colSpan={4} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                            TOTAL ({filteredSales.length} TRANSACTIONS)
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                            {filteredSales.reduce((acc, s) => acc + (s.items.reduce((sum, it) => sum + it.qty, 0) || s.totalQty || 0), 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            —
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                            ₹{filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Sale Parts Report */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sale Parts Itemized Report</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed ledger of spare parts sold, verified by vehicle registration ($AMOUNT = QNT \times RATE$)
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
                  Itemized Verification
                </Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12 font-mono">Sl No</th>
                      <th className="py-3 px-4">Ref No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Vehicle No</th>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4 text-right">Qnt</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let counter = 0;
                      return filteredSales.flatMap((sale) => {
                        const isPending = sale.docstatus === 0 || sale.status === 'Draft';
                        const rows = sale.items && sale.items.length > 0 ? sale.items : [{
                          itemCode: 'SP-PARTS',
                          itemName: 'Spare Parts',
                          qty: sale.totalQty || 1,
                          rate: sale.totalQty ? sale.grandTotal / sale.totalQty : sale.grandTotal,
                          amount: sale.grandTotal,
                        }];

                        return rows.map((it, idx) => {
                          counter += 1;
                          return (
                            <tr key={`${sale.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-slate-500 font-semibold">
                                {counter}
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-blue-900">
                                {sale.id}
                              </td>
                              <td className="py-3 px-4 text-slate-700">{sale.postingDate}</td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-800">
                                {sale.vehicle ? formatVehicleDisplay(sale.vehicle) : 'Counter Sale'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {it.itemName}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {it.qty}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-700">
                                ₹{it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                ₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                            {isPending ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 mr-1" /> Pending Approval
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPending ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                isLoading={approvingId === sale.id}
                                disabled={approvingId === sale.id}
                                onClick={() => handleApproveSale(sale.id)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1 shadow-2xs ml-auto"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </Button>
                            ) : (
                              <span className="text-emerald-700 text-[11px] font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  });
                })()}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No sold parts matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredSales.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                      TOTAL ({filteredSales.length} TRANSACTIONS)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                          {filteredSales.reduce((acc, s) => acc + (s.items.reduce((sum, it) => sum + it.qty, 0) || s.totalQty || 0), 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          —
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                          ₹{filteredSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: + Sale Entry */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Record Spare Parts Sale</h2>
                  <p className="text-xs text-slate-500">Create an official sales invoice for vehicle-linked parts (Amount = Qty × Rate)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSale} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Target Vehicle
                    </label>
                    <select
                      value={modalVehicle}
                      onChange={(e) => setModalVehicle(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                    >
                      <option value="">-- Direct Counter Sale --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Sale Date <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Select Spare Part / Item <span className="text-rose-600">*</span>
                    </label>
                    {modalItemCode && items.find((it) => it.itemCode === modalItemCode) && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Available Stock: {items.find((it) => it.itemCode === modalItemCode)?.actualQty ?? 0} {items.find((it) => it.itemCode === modalItemCode)?.stockUom || 'Nos'}
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={modalItemCode}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                  >
                    <option value="">-- Choose Spare Part Catalog Item --</option>
                    {items.map((it) => (
                      <option key={it.itemCode} value={it.itemCode}>
                        {it.itemName} ({it.itemCode}) — Stock: {it.actualQty ?? 0} {it.stockUom || 'Nos'} | Purchase Rate: ₹{(it.valuationRate || it.standardRate || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Quantity (QNT) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={modalQty}
                      onChange={(e) => setModalQty(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Unit Rate (RATE ₹) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={modalRate}
                      onChange={(e) => setModalRate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Total Amount (₹)
                    </label>
                    <div className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-900">
                      ₹{computedAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Mine Site
                  </label>
                  <select
                    value={modalMine}
                    onChange={(e) => setModalMine(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Remarks / Work Order Notes
                  </label>
                  <input
                    type="text"
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    placeholder="e.g. Scheduled suspension overhaul part sale"
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
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Submit Sale Entry</span>
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

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer>
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Spare Parts Sales...</span>
            </div>
          </PageContainer>
        </AppShell>
      }
    >
      <SalesContent />
    </Suspense>
  );
}

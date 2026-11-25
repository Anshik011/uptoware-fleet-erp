'use client';

import React, { useState, useMemo } from 'react';
import { FuelLog } from '@/types/fleet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVehicleDisplay } from '@/lib/displayFormatters';
import { toLocalDateString } from '@/lib/datetime';
import {
  Fuel,
  ShoppingCart,
  TrendingDown,
  Scale,
  Calendar,
  Search,
  Printer,
  Download,
  PlusCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Building,
  RotateCcw,
  Check,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

interface FuelPurchaseSaleLedgerProps {
  logs: FuelLog[];
  vehicles: Array<{ id: string; licensePlate: string }>;
  fuelSources: string[];
  activeSubTab?: 'purchase' | 'sale' | 'ledger';
  onSubTabChange?: (tab: 'purchase' | 'sale' | 'ledger') => void;
  onOpenAddPurchase: () => void;
  onOpenAddSale: () => void;
  onApproveLog: (log: FuelLog) => void;
  onSelectLog: (log: FuelLog) => void;
  canManage: boolean;
}

export function isFuelPurchase(log: FuelLog): boolean {
  const rem = (log.remarks || '').toUpperCase();
  const station = (log.fuelStation || '').toUpperCase();
  return (
    rem.includes('[TYPE:PURCHASE]') ||
    rem.includes('PURCHASE') ||
    station.includes('PURCHASE') ||
    station.includes('INWARD')
  );
}

export function FuelPurchaseSaleLedger({
  logs,
  vehicles,
  fuelSources,
  activeSubTab = 'ledger',
  onSubTabChange,
  onOpenAddPurchase,
  onOpenAddSale,
  onApproveLog,
  onSelectLog,
  canManage,
}: FuelPurchaseSaleLedgerProps) {
  const [tab, setTab] = useState<'purchase' | 'sale' | 'ledger'>(activeSubTab);

  React.useEffect(() => {
    if (activeSubTab) setTab(activeSubTab);
  }, [activeSubTab]);

  const handleTabSwitch = (newTab: 'purchase' | 'sale' | 'ledger') => {
    setTab(newTab);
    if (onSubTabChange) onSubTabChange(newTab);
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedSupplyName, setSelectedSupplyName] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Draft' | 'Approved'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Segregate purchases vs sales
  const purchaseLogs = useMemo(() => logs.filter((l) => isFuelPurchase(l)), [logs]);
  const saleLogs = useMemo(() => logs.filter((l) => !isFuelPurchase(l)), [logs]);

  // Extract unique supply/station names
  const supplyOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      const name = l.fuelStation || l.fuelSource;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Extract unique months from logs
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.fuelDate) {
        const parts = l.fuelDate.split('-');
        if (parts.length >= 2) {
          set.add(`${parts[0]}-${parts[1]}`); // e.g. "2026-11"
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [logs]);

  // Filter helper
  const filterList = (list: FuelLog[]) => {
    return list.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const v = (l.vehicle || '').toLowerCase();
        const s = (l.fuelStation || l.fuelSource || '').toLowerCase();
        const r = (l.remarks || '').toLowerCase();
        if (!v.includes(q) && !s.includes(q) && !r.includes(q)) return false;
      }
      if (selectedVehicle !== 'ALL' && l.vehicle !== selectedVehicle) {
        return false;
      }
      if (selectedSupplyName !== 'ALL') {
        const station = l.fuelStation || l.fuelSource;
        if (station !== selectedSupplyName) return false;
      }
      if (selectedStatus !== 'ALL' && l.approvalStatus !== selectedStatus) {
        return false;
      }
      if (selectedMonth !== 'ALL' && l.fuelDate && !l.fuelDate.startsWith(selectedMonth)) {
        return false;
      }
      if (fromDate && l.fuelDate && l.fuelDate < fromDate) {
        return false;
      }
      if (toDate && l.fuelDate && l.fuelDate > toDate) {
        return false;
      }
      return true;
    });
  };

  const filteredPurchases = useMemo(() => filterList(purchaseLogs), [purchaseLogs, searchQuery, selectedVehicle, selectedSupplyName, selectedStatus, selectedMonth, fromDate, toDate]);
  const filteredSales = useMemo(() => filterList(saleLogs), [saleLogs, searchQuery, selectedVehicle, selectedSupplyName, selectedStatus, selectedMonth, fromDate, toDate]);

  // Metrics for filtered sets
  const purchaseTotalLitres = useMemo(
    () => filteredPurchases.reduce((sum, l) => sum + (l.quantityLitres || 0), 0),
    [filteredPurchases]
  );
  const purchaseTotalAmount = useMemo(
    () => filteredPurchases.reduce((sum, l) => sum + (l.totalCost || (l.quantityLitres * l.ratePerLitre) || 0), 0),
    [filteredPurchases]
  );
  const purchaseAvgRate =
    purchaseTotalLitres > 0 ? purchaseTotalAmount / purchaseTotalLitres : 0;

  const saleTotalLitres = useMemo(
    () => filteredSales.reduce((sum, l) => sum + (l.quantityLitres || 0), 0),
    [filteredSales]
  );
  const saleTotalAmount = useMemo(
    () => filteredSales.reduce((sum, l) => sum + (l.totalCost || (l.quantityLitres * l.ratePerLitre) || 0), 0),
    [filteredSales]
  );
  const saleAvgRate = saleTotalLitres > 0 ? saleTotalAmount / saleTotalLitres : 0;

  const balanceLitres = purchaseTotalLitres - saleTotalLitres;
  const balanceAmount = purchaseTotalAmount - saleTotalAmount;

  // Format date helper
  const formatDate = (dStr?: string) => {
    if (!dStr) return '—';
    const parts = dStr.split(/[ T]/)[0].split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dStr;
  };

  const setTodayFilter = () => {
    const today = toLocalDateString();
    setFromDate(today);
    setToDate(today);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedVehicle('ALL');
    setSelectedSupplyName('ALL');
    setSelectedStatus('ALL');
    setSelectedMonth('ALL');
    setFromDate('');
    setToDate('');
  };

  const handleDownloadCsv = (type: 'purchase' | 'sale' | 'ledger') => {
    let headers: string[] = [];
    let rows: string[] = [];
    let filename = '';

    if (type === 'purchase') {
      headers = ['Date', 'Supply Name', 'Vehicle Number', 'Quantity (L)', 'Rate (INR)', 'Amount (INR)', 'Status'];
      rows = filteredPurchases.map((l) => [
        formatDate(l.fuelDate),
        `"${(l.fuelStation || l.fuelSource || '').replace(/"/g, '""')}"`,
        l.vehicle || '',
        l.quantityLitres.toFixed(2),
        l.ratePerLitre.toFixed(2),
        (l.totalCost || (l.quantityLitres * l.ratePerLitre)).toFixed(2),
        l.approvalStatus,
      ].join(','));
      filename = `Fuel_Purchases_${toLocalDateString()}.csv`;
    } else if (type === 'sale') {
      headers = ['Date', 'Supply Name', 'Vehicle Number', 'Quantity (L)', 'Rate (INR)', 'Amount (INR)', 'Status'];
      rows = filteredSales.map((l) => [
        formatDate(l.fuelDate),
        `"${(l.fuelStation || l.fuelSource || '').replace(/"/g, '""')}"`,
        l.vehicle || '',
        l.quantityLitres.toFixed(2),
        l.ratePerLitre.toFixed(2),
        (l.totalCost || (l.quantityLitres * l.ratePerLitre)).toFixed(2),
        l.approvalStatus,
      ].join(','));
      filename = `Fuel_Sales_${toLocalDateString()}.csv`;
    } else {
      headers = ['Date', 'Type', 'Supply Name', 'Vehicle Number', 'Quantity (L)', 'Rate (INR)', 'Amount (INR)', 'Status'];
      const allRows = [
        ...filteredPurchases.map((l) => ({ ...l, txnType: 'Purchase' })),
        ...filteredSales.map((l) => ({ ...l, txnType: 'Sale' })),
      ].sort((a, b) => (b.fuelDate || '').localeCompare(a.fuelDate || ''));
      rows = allRows.map((l) => [
        formatDate(l.fuelDate),
        l.txnType,
        `"${(l.fuelStation || l.fuelSource || '').replace(/"/g, '""')}"`,
        l.vehicle || '',
        l.quantityLitres.toFixed(2),
        l.ratePerLitre.toFixed(2),
        (l.totalCost || (l.quantityLitres * l.ratePerLitre)).toFixed(2),
        l.approvalStatus,
      ].join(','));
      filename = `Fuel_Purchase_Sale_Ledger_${toLocalDateString()}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Sub-Tab Switcher: Purchase Report, Sale Report, Balancing Ledger */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabSwitch('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'ledger'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Purchase & Sale Stock Balancing</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('purchase')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'purchase'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Fuel Purchase Report ({purchaseLogs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('sale')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'sale'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Fuel Sale Report ({saleLogs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'purchase' && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddPurchase}
              className="text-xs h-8 px-3"
            >
              + Log Fuel Purchase
            </Button>
          )}
          {tab === 'sale' && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddSale}
              className="text-xs h-8 px-3"
            >
              + Log Fuel Dispensation
            </Button>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Month-Wise & Date-to-Date Reactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Purchase */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Fuel Purchase
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {purchaseTotalLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L
            </div>
            <span className="text-xs font-mono font-semibold text-blue-900">
              ₹ {purchaseTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Avg: ₹{purchaseAvgRate.toFixed(2)}/L • {filteredPurchases.length} logs
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Total Sale / Dispensed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Fuel Sale / Dispensed
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {saleTotalLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-900">
              ₹ {saleTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Avg: ₹{saleAvgRate.toFixed(2)}/L • {filteredSales.length} logs
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Balance Stock */}
        <div
          className={`border rounded-xl p-4 shadow-xs flex items-center justify-between ${
            balanceLitres >= 0
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-rose-50/70 border-rose-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Net Balance Stock (Purchase - Sale)
            </span>
            <div
              className={`text-xl sm:text-2xl font-bold font-mono mt-0.5 ${
                balanceLitres >= 0 ? 'text-emerald-900' : 'text-rose-900'
              }`}
            >
              {balanceLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L
            </div>
            <span
              className={`text-xs font-mono font-bold ${
                balanceAmount >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              ₹ {balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {balanceLitres >= 0 ? 'Positive stock surplus' : 'Negative stock deficit'}
            </span>
          </div>
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
              balanceLitres >= 0
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}
          >
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Filter Toolbar (Month-Wise & Date-to-Date) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search supply, vehicle, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800"
            />
          </div>

          {/* Month Wise Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Months ({monthOptions.length})</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Vehicles ({vehicles.length})</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate || v.id}
                </option>
              ))}
            </select>
          </div>

          {/* Supply Name Filter */}
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSupplyName}
              onChange={(e) => setSelectedSupplyName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Supply / Stations ({supplyOptions.length})</option>
              {supplyOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date to Date Controls Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-semibold text-[10px] uppercase">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-semibold text-[10px] uppercase">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none font-medium"
              />
            </div>

            <button
              type="button"
              onClick={setTodayFilter}
              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg"
            >
              Today
            </button>

            {(fromDate || toDate || selectedVehicle !== 'ALL' || selectedSupplyName !== 'ALL' || selectedMonth !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setSelectedStatus('ALL')}
                className={`px-2.5 py-1 rounded font-semibold ${
                  selectedStatus === 'ALL' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('Draft')}
                className={`px-2.5 py-1 rounded font-semibold ${
                  selectedStatus === 'Draft' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-600'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('Approved')}
                className={`px-2.5 py-1 rounded font-semibold ${
                  selectedStatus === 'Approved' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-600'
                }`}
              >
                Approved
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="text-xs h-7 px-2.5"
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => handleDownloadCsv(tab)}
              className="text-xs h-7 px-2.5"
            >
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* 4. TAB 1: FUEL PURCHASE REPORT */}
      {tab === 'purchase' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Fuel Purchase Inward Report ({filteredPurchases.length} Records)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-blue-900">
              Total Purchase: {purchaseTotalLitres.toFixed(1)} L • ₹ {purchaseTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supply Name</th>
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4 text-right">Qnt (L)</th>
                  <th className="py-3 px-4 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No fuel purchase records found matching criteria. Click &quot;+ Log Fuel Purchase&quot; to add.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((l) => {
                    const amount = l.totalCost || l.quantityLitres * l.ratePerLitre;
                    const isDraft = l.approvalStatus === 'Draft';
                    return (
                      <tr
                        key={l.id}
                        onClick={() => onSelectLog(l)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium">{formatDate(l.fuelDate)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {l.fuelStation || l.fuelSource || 'Direct Tanker Inward'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">
                          {formatVehicleDisplay(l.vehicle)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {l.quantityLitres.toLocaleString('en-IN', { minimumFractionDigits: 2 })} L
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{l.ratePerLitre.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-right print:hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDraft && canManage && (
                            <button
                              type="button"
                              onClick={() => onApproveLog(l)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredPurchases.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-slate-700">
                      TOTAL FUEL PURCHASE ({filteredPurchases.length} RECORDS)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-900">
                      {purchaseTotalLitres.toLocaleString('en-IN', { minimumFractionDigits: 2 })} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{purchaseAvgRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-900">
                      ₹{purchaseTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 2: FUEL SALE REPORT */}
      {tab === 'sale' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-indigo-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Fuel Sale & Dispensation Report ({filteredSales.length} Records)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-900">
              Total Sale: {saleTotalLitres.toFixed(1)} L • ₹ {saleTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supply / Station Name</th>
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4 text-right">Qnt (L)</th>
                  <th className="py-3 px-4 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No fuel sale / dispensation records found matching criteria. Click &quot;+ Log Fuel Dispensation&quot; to add.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((l) => {
                    const amount = l.totalCost || l.quantityLitres * l.ratePerLitre;
                    const isDraft = l.approvalStatus === 'Draft';
                    return (
                      <tr
                        key={l.id}
                        onClick={() => onSelectLog(l)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium">{formatDate(l.fuelDate)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {l.fuelStation || l.fuelSource || 'Site Bowser Dispenser'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">
                          {formatVehicleDisplay(l.vehicle)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {l.quantityLitres.toLocaleString('en-IN', { minimumFractionDigits: 2 })} L
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{l.ratePerLitre.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900">
                          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-right print:hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDraft && canManage && (
                            <button
                              type="button"
                              onClick={() => onApproveLog(l)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredSales.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-slate-700">
                      TOTAL FUEL SALE / DISPENSED ({filteredSales.length} RECORDS)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-900">
                      {saleTotalLitres.toLocaleString('en-IN', { minimumFractionDigits: 2 })} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{saleAvgRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-900">
                      ₹{saleTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 3: CONSOLIDATED PURCHASE & SALE STOCK BALANCING LEDGER */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Fuel Inward vs Outward Balancing Ledger
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs h-7 px-2.5 print:hidden"
                >
                  Print Report
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-bold text-[11px] uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Transaction Details</th>
                    <th className="py-3 px-4">Vehicle / Bowser</th>
                    <th className="py-3 px-4 text-right bg-blue-50/50">Purchase Qnt (L)</th>
                    <th className="py-3 px-4 text-right bg-blue-50/50">Purchase Amt (₹)</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/50">Sale Qnt (L)</th>
                    <th className="py-3 px-4 text-right bg-indigo-50/50">Sale Amt (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredPurchases.length === 0 && filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No transactions recorded for the selected period.
                      </td>
                    </tr>
                  ) : (
                    // Interleave and sort all transactions chronologically descending
                    [
                      ...filteredPurchases.map((l) => ({ ...l, isP: true })),
                      ...filteredSales.map((l) => ({ ...l, isP: false })),
                    ]
                      .sort((a, b) => (b.fuelDate || '').localeCompare(a.fuelDate || ''))
                      .map((l) => {
                        const amount = l.totalCost || l.quantityLitres * l.ratePerLitre;
                        return (
                          <tr
                            key={l.id}
                            onClick={() => onSelectLog(l)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-4 font-mono font-medium">{formatDate(l.fuelDate)}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  l.isP ? 'text-blue-900' : 'text-indigo-900'
                                }`}
                              >
                                {l.isP ? <ShoppingCart className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {l.isP ? 'PURCHASE' : 'SALE'}: {l.fuelStation || l.fuelSource}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                              {formatVehicleDisplay(l.vehicle)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                              {l.isP ? `${l.quantityLitres.toFixed(1)} L` : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-blue-900 bg-blue-50/20">
                              {l.isP ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
                              {!l.isP ? `${l.quantityLitres.toFixed(1)} L` : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-indigo-900 bg-indigo-50/20">
                              {!l.isP ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {l.approvalStatus === 'Draft' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Pending
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Approved
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-slate-700">
                      TOTALS & NET BALANCE STOCK
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-900 bg-blue-100/50">
                      {purchaseTotalLitres.toLocaleString('en-IN', { minimumFractionDigits: 1 })} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-900 bg-blue-100/50">
                      ₹{purchaseTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-900 bg-indigo-100/50">
                      {saleTotalLitres.toLocaleString('en-IN', { minimumFractionDigits: 1 })} L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-900 bg-indigo-100/50">
                      ₹{saleTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-200/80 text-sm">
                    <td colSpan={3} className="py-3 px-4 uppercase text-slate-900 font-bold">
                      NET STOCK BALANCE (PURCHASE - SALE):
                    </td>
                    <td
                      colSpan={2}
                      className={`py-3 px-4 font-mono font-bold text-right ${
                        balanceLitres >= 0 ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {balanceLitres.toLocaleString('en-IN', { minimumFractionDigits: 1 })} Litres
                    </td>
                    <td
                      colSpan={2}
                      className={`py-3 px-4 font-mono font-bold text-right ${
                        balanceAmount >= 0 ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      ₹ {balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

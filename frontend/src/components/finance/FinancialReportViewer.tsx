'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatNumber, formatDate } from '@/config/branding';
import { useMine } from '@/context/MineContext';
import {
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BarChart3,
  MapPin,
  Receipt,
  Table,
} from 'lucide-react';
import { VehicleIncomeBillFormat } from './VehicleIncomeBillFormat';

export const FINANCE_REPORTS = [
  { name: 'Vehicle-wise Revenue and Profitability', desc: 'Asset P&L: Invoiced revenue, fuel, parts, labour, OpEx, net margin' },
  { name: 'Trip-wise Revenue and Profitability', desc: 'Trip haulage contribution: Indicative vs invoiced revenue & direct costs' },
  { name: 'Mine Site-wise Revenue and Profitability', desc: 'Site-level P&L: Delivered tons, invoiced billing, and operating costs' },
  { name: 'Customer-wise Revenue', desc: 'Customer billing ledger: Invoiced amounts, credit notes, collections, receivables' },
  { name: 'Monthly Revenue Summary', desc: 'Monthly financial trajectory: Invoicing, collections, and realization rates' },
  { name: 'Operating Cost Summary', desc: 'Fleet cost streams: Fuel, maintenance, direct OpEx, and overheads' },
  { name: 'Vehicle Operating Cost Analysis', desc: 'Per-vehicle cost breakdown: Parts, labour, fuel, OpEx, cost per KM' },
  { name: 'Revenue vs Cost Analysis', desc: 'Comparative P&L across assets: Revenue vs total cost & margin ratios' },
  { name: 'Outstanding Revenue / Receivables', desc: 'Commercial aging analysis: Overdue invoices and client credit risk' },
  { name: 'Unallocated Cost Register', desc: 'Overhead and indirect costs not tied to specific vehicles or trips' },
  { name: 'Accounts Receivable', desc: 'Authoritative trade receivables ledger with aging buckets' },
  { name: 'Gross Profit', desc: 'Authoritative gross profit analysis on submitted commercial invoices' },
  { name: 'Daily Fleet Income and Expense Summary', desc: 'Daily net operating contribution: Haulage revenue minus fuel, repair, and OpEx costs' },
  { name: 'Monthly Fleet Income and Expense Summary', desc: 'Monthly executive P&L: Completed trips, billed tonnage, revenue vs outflow margins' },
  { name: 'Vehicle Earning Summary Report', desc: 'Provisional vehicle unit economics (Revenue, fuel, repairs, net profit) — Draft format pending client template' },
  { name: 'HSD Fuel Price Escalation Report', desc: 'HSD benchmark price escalation tracking — User-configurable contract baseline rate' },
  { name: 'Fleet Lead Haulage Report', desc: 'Lead route performance: Tonnage, contract rates, trip counts, and earned freight' },
  { name: 'Employee Attendance Summary Report', desc: 'Personnel shift roster: Present, half-day, absent, wage rates, and calculated payroll' },
];

export function FinancialReportViewer() {
  const { currentMine } = useMine();
  const searchParams = useSearchParams();
  const activeMine = currentMine && currentMine !== 'ALL' ? currentMine : undefined;
  const reportParam = searchParams.get('report');

  const [selectedReport, setSelectedReport] = useState(() => {
    if (reportParam && FINANCE_REPORTS.some((r) => r.name === reportParam)) {
      return reportParam;
    }
    return FINANCE_REPORTS[0].name;
  });

  useEffect(() => {
    if (reportParam && FINANCE_REPORTS.some((r) => r.name === reportParam)) {
      setSelectedReport(reportParam);
    }
  }, [reportParam]);

  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-12-31');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [columns, setColumns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billViewMode, setBillViewMode] = useState<'table' | 'bill'>('table');
  const [selectedBillVehicle, setSelectedBillVehicle] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const filters: Record<string, any> = {
        from_date: fromDate || '2026-01-01',
        to_date: toDate || '2026-12-31',
        vehicle: vehicleFilter || '',
        customer: customerFilter || '',
      };
      if (activeMine) {
        filters.mine_site = activeMine;
      }

      const res = await fetch('/api/finance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: selectedReport,
          filters,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setColumns(json.columns || []);
        setData(json.result || []);
      } else {
        setError(json.error || 'Failed to execute report');
        setColumns([]);
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || 'Network error executing report');
      setColumns([]);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, currentMine]);

  // Client search filtering
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // CSV Export
  const exportToCSV = () => {
    if (columns.length === 0 || data.length === 0) return;

    const headers = columns.map((c) => c.label || c.fieldname).join(',');
    const rows = data.map((row) => {
      return columns
        .map((c) => {
          const val = row[c.fieldname] !== undefined ? row[c.fieldname] : '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCellValue = (val: any, col: any) => {
    if (val === null || val === undefined || val === '' || val === 'NaN') return '—';
    if (col.fieldtype === 'Currency') {
      const num = Number(val);
      if (isNaN(num)) return '—';
      return num < 0 ? `-${formatCurrency(Math.abs(num))}` : formatCurrency(num);
    }
    if (col.fieldtype === 'Percent') {
      const num = Number(val);
      if (isNaN(num)) return '—';
      return `${num.toFixed(1)}%`;
    }
    if (col.fieldtype === 'Date') {
      return formatDate(val);
    }
    if (col.fieldtype === 'Float' || col.fieldtype === 'Int') {
      const num = Number(val);
      return isNaN(num) ? '—' : formatNumber(num);
    }
    if (val === 'NaN' || (typeof val === 'number' && isNaN(val))) return '—';
    return String(val);
  };

  const isNumericCol = (col: any) => {
    return (
      col.fieldtype === 'Currency' ||
      col.fieldtype === 'Float' ||
      col.fieldtype === 'Int' ||
      col.fieldtype === 'Percent'
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Controls Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Financial & Analytics Report
              </label>
              {activeMine && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MapPin className="w-2.5 h-2.5" />
                  {activeMine}
                </span>
              )}
            </div>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full sm:w-96 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FINANCE_REPORTS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              {FINANCE_REPORTS.find((r) => r.name === selectedReport)?.desc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Executing...' : 'Run Report'}</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={data.length === 0 || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Vehicle Filter</label>
            <input
              type="text"
              placeholder="e.g. KA-19-MG-7001"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Customer Filter</label>
            <input
              type="text"
              placeholder="e.g. NMDC Mining"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* When Vehicle Earning Summary Report is selected, offer Tabular Analytics as default with optional full bill view */}
      {selectedReport === 'Vehicle Earning Summary Report' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-blue-100 text-blue-900 rounded-lg">
              <Table className="w-4 h-4 text-blue-900" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Vehicle Earning Analytics & Transport Bills
                </span>
                <span className="text-[10px] bg-blue-200/70 text-blue-900 font-semibold px-2 py-0.5 rounded">
                  Lingaraj OCP
                </span>
              </div>
              <p className="text-[11px] text-blue-700">
                View fleet-wide tabular analytics with individual vehicle bill preview buttons.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-blue-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBillViewMode('table');
                setSelectedBillVehicle(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                billViewMode === 'table' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabular Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setBillViewMode('bill')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                billViewMode === 'bill' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Single Vehicle Bill</span>
            </button>
          </div>
        </div>
      )}

      {selectedReport === 'Vehicle Earning Summary Report' && billViewMode === 'bill' ? (
        <VehicleIncomeBillFormat vehicleNo={vehicleFilter || 'OD19D1199'} periodFrom="01.01.2026" periodTo="15.01.2026" />
      ) : (
        /* Report Results */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Search & Title */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">{selectedReport}</span>
            <span className="text-[11px] text-slate-500">
              ({filteredData.length} records)
            </span>
            {activeMine && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {activeMine}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
        </div>

        {error && (
          <div className="p-6 text-center text-rose-600 text-xs">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                {columns.map((c, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-2.5 whitespace-nowrap ${isNumericCol(c) ? 'text-right' : 'text-left'}`}
                  >
                    {c.label || c.fieldname}
                  </th>
                ))}
                {selectedReport === 'Vehicle Earning Summary Report' && (
                  <th className="px-4 py-2.5 text-center whitespace-nowrap w-24">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Executing financial report query...
                  </td>
                </tr>
              )}

              {!loading && paginatedData.length === 0 && !error && (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-slate-400">
                    <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Records Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {data.length === 0
                        ? 'The report returned zero records for the specified filter criteria.'
                        : 'No records match your search filter.'}
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedData.map((row, rIdx) => {
                  const vehicleVal = row.vehicle || row.vehicle_no || row.license_plate || '';
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                      {columns.map((c, cIdx) => {
                        const isNum = isNumericCol(c);
                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-2.5 whitespace-nowrap ${
                              isNum ? 'text-right font-mono font-medium text-slate-800' : 'text-slate-700'
                            }`}
                          >
                            {formatCellValue(row[c.fieldname], c)}
                          </td>
                        );
                      })}
                      {selectedReport === 'Vehicle Earning Summary Report' && (
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          {vehicleVal ? (
                            <button
                              type="button"
                              onClick={() => setSelectedBillVehicle(vehicleVal)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 transition-colors"
                              title={`View official haulage bill for ${vehicleVal}`}
                            >
                              <Receipt className="w-3 h-3 text-blue-700" />
                              <span>View Bill</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Pop-up Modal / Drawer when user clicks "View Bill" on any row in the Tabular Analytics */}
      {selectedBillVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-blue-600 rounded-lg">
                  <Receipt className="w-5 h-5 text-white" />
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Official Transport Bill — {selectedBillVehicle}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Lingaraj OCP Contract Haulage & Mining Earning Statement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBillVehicle(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <VehicleIncomeBillFormat
                vehicleNo={selectedBillVehicle}
                periodFrom="01.01.2026"
                periodTo="15.01.2026"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

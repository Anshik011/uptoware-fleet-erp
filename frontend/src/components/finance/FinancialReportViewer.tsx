'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatNumber, formatDate } from '@/config/branding';
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
} from 'lucide-react';

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
  { name: 'Accounts Receivable', desc: 'Standard ERPNext trade receivables ledger with aging buckets' },
  { name: 'Gross Profit', desc: 'Standard ERPNext gross profit analysis on submitted commercial invoices' },
];

export function FinancialReportViewer() {
  const [selectedReport, setSelectedReport] = useState(FINANCE_REPORTS[0].name);
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-12-31');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [columns, setColumns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const res = await fetch('/api/finance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: selectedReport,
          filters: {
            from_date: fromDate || '2026-01-01',
            to_date: toDate || '2026-12-31',
            vehicle: vehicleFilter || '',
            customer: customerFilter || '',
          },
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
  }, [selectedReport]);

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
    if (val === null || val === undefined || val === '') return '—';
    if (col.fieldtype === 'Currency') {
      const num = Number(val);
      if (isNaN(num)) return val;
      return num < 0 ? `-${formatCurrency(Math.abs(num))}` : formatCurrency(num);
    }
    if (col.fieldtype === 'Percent') {
      return `${val}%`;
    }
    if (col.fieldtype === 'Date') {
      return formatDate(val);
    }
    if (col.fieldtype === 'Float' || col.fieldtype === 'Int') {
      const num = Number(val);
      return isNaN(num) ? val : formatNumber(num);
    }
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
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
              Select Financial & Analytics Report
            </label>
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

      {/* Report Results */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Search & Title */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">{selectedReport}</span>
            <span className="text-[11px] text-slate-500">
              ({filteredData.length} records)
            </span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Executing native ERPNext query report...
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
                paginatedData.map((row, rIdx) => (
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
                  </tr>
                ))}
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
    </div>
  );
}


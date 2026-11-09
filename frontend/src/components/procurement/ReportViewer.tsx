import React, { useState, useEffect } from 'react';
import { FleetReportColumn, FleetReportResult } from '@/types/fleet';
import { FileSpreadsheet, Play, RefreshCw, Calendar, Download, Filter, AlertCircle } from 'lucide-react';

interface ReportViewerProps {
  warehouses: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
}

export const ALL_16_REPORTS = [
  // 1. Inventory Reports
  { name: 'Spare Parts Stock Register', category: 'Inventory & Stock' },
  { name: 'Warehouse-wise Stock', category: 'Inventory & Stock' },
  { name: 'Low Stock / Reorder Report', category: 'Inventory & Stock' },
  { name: 'Spare Parts Consumption by Vehicle', category: 'Inventory & Stock' },
  { name: 'Spare Parts Consumption by Breakdown', category: 'Inventory & Stock' },
  { name: 'Spare Parts Consumption by Mine Site', category: 'Inventory & Stock' },
  { name: 'Stock Movement History', category: 'Inventory & Stock' },

  // 2. Procurement Reports
  { name: 'Supplier Register', category: 'Procurement & Vendors' },
  { name: 'Supplier-wise Purchase Summary', category: 'Procurement & Vendors' },
  { name: 'Purchase Order Register', category: 'Procurement & Vendors' },
  { name: 'Pending Purchase Orders', category: 'Procurement & Vendors' },
  { name: 'Purchase Receipt Register', category: 'Procurement & Vendors' },
  { name: 'Purchase Invoice Register', category: 'Procurement & Vendors' },
  { name: 'Supplier Outstanding / Payables', category: 'Procurement & Vendors' },
  { name: 'Purchase by Vehicle / Breakdown / Mine Site', category: 'Procurement & Vendors' },
  { name: 'Purchase Analysis by Month', category: 'Procurement & Vendors' },
];

export function ReportViewer({ warehouses, suppliers, vehicles }: ReportViewerProps) {
  const [selectedReport, setSelectedReport] = useState('Spare Parts Stock Register');
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-12-31');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<FleetReportResult | null>(null);

  const executeReport = async (reportName = selectedReport) => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: Record<string, any> = {
        company: 'Uptoware',
        from_date: fromDate,
        to_date: toDate,
        show_all: '1',
      };
      if (selectedWarehouse) filters.warehouse = selectedWarehouse;
      if (selectedSupplier) filters.supplier = selectedSupplier;
      if (selectedVehicle) filters.vehicle = selectedVehicle;

      const res = await fetch('/api/procurement/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: reportName,
          filters,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute report');
      }

      setReportResult({
        columns: data.columns,
        result: data.result,
        reportName: data.reportName,
      });
    } catch (err: any) {
      setError(err.message || 'Error executing fleet report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeReport(selectedReport);
  }, [selectedReport]);

  const isNumericField = (fieldtype: string) => {
    const ft = (fieldtype || '').toLowerCase();
    return ft.includes('currency') || ft.includes('float') || ft.includes('int') || ft.includes('percent');
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Fleet Script Reports Engine (16 Standard Reports)
              </h3>
              <p className="text-xs text-slate-500">
                Native Frappe Desk Script Reports executed with live audit data
              </p>
            </div>
          </div>

          {/* Report Selector Dropdown */}
          <div className="w-full sm:w-80">
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <optgroup label="Inventory & Spare Parts">
                {ALL_16_REPORTS.filter((r) => r.category === 'Inventory & Stock').map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Procurement & Vendors">
                {ALL_16_REPORTS.filter((r) => r.category === 'Procurement & Vendors').map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Warehouse Filter</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Supplier Filter</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => executeReport(selectedReport)}
              disabled={isLoading}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>Run Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Display */}
      <div className="overflow-x-auto">
        {error ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50 flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Executing {selectedReport}...</span>
          </div>
        ) : !reportResult || reportResult.columns.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-800">No report schema or data returned</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
                {reportResult.columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3 px-4 ${isNumericField(col.fieldtype) ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {reportResult.result.length === 0 ? (
                <tr>
                  <td
                    colSpan={reportResult.columns.length}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    No operational records matched the filter criteria for &ldquo;{reportResult.reportName}&rdquo;.
                  </td>
                </tr>
              ) : (
                reportResult.result.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                    {reportResult.columns.map((col, colIdx) => {
                      const val = row[col.fieldname] ?? row[col.label] ?? '—';
                      const isNumeric = isNumericField(col.fieldtype);

                      let formattedVal = val;
                      if (typeof val === 'number') {
                        formattedVal = val.toLocaleString('en-IN', {
                          minimumFractionDigits: val % 1 === 0 ? 0 : 2,
                          maximumFractionDigits: 2,
                        });
                      }

                      return (
                        <td
                          key={colIdx}
                          className={`py-2.5 px-4 ${
                            isNumeric ? 'text-right font-mono font-medium' : 'text-left'
                          }`}
                        >
                          {String(formattedVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      {reportResult && !isLoading && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Report: <span className="font-semibold text-slate-700">{reportResult.reportName}</span> | Columns:{' '}
            <span className="font-semibold text-slate-700">{reportResult.columns.length}</span>
          </div>
          <div className="font-medium">
            Total Rows: <span className="font-semibold text-slate-900">{reportResult.result.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}


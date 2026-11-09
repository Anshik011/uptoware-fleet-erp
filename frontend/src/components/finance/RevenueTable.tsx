'use client';

import React, { useState } from 'react';
import { formatCurrency, formatDate } from '@/config/branding';
import { SalesInvoiceRecord } from '@/lib/frappe';
import { InvoiceDetailDrawer } from './InvoiceDetailDrawer';
import { Search, Filter, ExternalLink, FileText, CheckCircle, Clock, AlertTriangle, RotateCcw } from 'lucide-react';

interface RevenueTableProps {
  invoices: SalesInvoiceRecord[];
  loading: boolean;
  onRefresh?: () => void;
}

export function RevenueTable({ invoices, loading, onRefresh }: RevenueTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vehicle && inv.vehicle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.miningTrip && inv.miningTrip.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PAID') return inv.status === 'Paid';
    if (statusFilter === 'UNPAID') return inv.status === 'Unpaid';
    if (statusFilter === 'OVERDUE') return inv.status === 'Overdue';
    if (statusFilter === 'RETURN') return inv.isReturn;
    return true;
  });

  const getStatusBadge = (status: string, isReturn: boolean) => {
    if (isReturn) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <RotateCcw className="w-3 h-3" />
          Credit Return
        </span>
      );
    }
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case 'Unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Unpaid
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice ID, customer, vehicle, trip..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-none bg-transparent pr-2 py-0.5 text-xs text-slate-700 font-medium focus:ring-0 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid Only</option>
              <option value="UNPAID">Unpaid Only</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="RETURN">Credit Notes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Invoice Number</th>
              <th className="px-4 py-3">Customer Client</th>
              <th className="px-4 py-3">Posting Date</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Attributed Asset</th>
              <th className="px-4 py-3 text-right">Grand Total</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  Loading commercial invoices...
                </td>
              </tr>
            )}

            {!loading && filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No Commercial Invoices Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {invoices.length === 0
                      ? 'No submitted Sales Invoices exist in the system.'
                      : 'No invoices match your search or filter criteria.'}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 font-semibold text-blue-700 font-mono group-hover:underline">
                    {inv.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{inv.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{inv.customer}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.postingDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3">
                    {inv.vehicle && <div className="text-slate-800 font-medium">{inv.vehicle}</div>}
                    {inv.miningTrip && (
                      <div className="text-[11px] text-slate-500 font-mono">{inv.miningTrip}</div>
                    )}
                    {!inv.vehicle && !inv.miningTrip && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                    {inv.isReturn ? `-${formatCurrency(Math.abs(inv.baseGrandTotal))}` : formatCurrency(inv.baseGrandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700 font-mono">
                    {formatCurrency(inv.outstandingAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(inv.status, inv.isReturn)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoiceId(inv.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer Count */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> submitted invoices
        </span>
        <span className="text-[11px] text-slate-400">Single Source of Truth: ERPNext Sales Invoice</span>
      </div>

      {/* Invoice Detail Slide-Over Drawer */}
      <InvoiceDetailDrawer
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
}


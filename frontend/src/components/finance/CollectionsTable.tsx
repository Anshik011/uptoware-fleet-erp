'use client';

import React, { useState } from 'react';
import { formatCurrency, formatDate } from '@/config/branding';
import { PaymentEntryRecord } from '@/lib/frappe';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';
import { Search, Filter, ExternalLink, CreditCard, CheckCircle } from 'lucide-react';

interface CollectionsTableProps {
  payments: PaymentEntryRecord[];
  loading: boolean;
  onRefresh?: () => void;
}

export function CollectionsTable({ payments, loading, onRefresh }: CollectionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const availableModes = Array.from(new Set(payments.map((p) => p.modeOfPayment).filter(Boolean)));

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (modeFilter !== 'ALL' && p.modeOfPayment !== modeFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by payment ID, customer, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="border-none bg-transparent pr-2 py-0.5 text-xs text-slate-700 font-medium focus:ring-0 cursor-pointer"
            >
              <option value="ALL">All Payment Modes</option>
              {availableModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Receipt / Payment ID</th>
              <th className="px-4 py-3">Customer Client</th>
              <th className="px-4 py-3">Posting Date</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3">Ref No / Cheque</th>
              <th className="px-4 py-3 text-right">Received Amount</th>
              <th className="px-4 py-3 text-right">Allocated</th>
              <th className="px-4 py-3 text-right">Unallocated</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  Loading collections records...
                </td>
              </tr>
            )}

            {!loading && filteredPayments.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No Payment Collections Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {payments.length === 0
                      ? 'No submitted Payment Entries exist in the system.'
                      : 'No payments match your search or filter criteria.'}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPaymentId(p.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 font-semibold text-emerald-700 font-mono group-hover:underline">
                    {p.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.partyName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.party}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.postingDate)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {p.modeOfPayment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{p.referenceNo}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                    {formatCurrency(p.receivedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono">
                    {formatCurrency(p.allocatedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-500 font-mono">
                    {formatCurrency(p.unallocatedAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3 h-3" />
                      Settled
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPaymentId(p.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200"
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

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong>{filteredPayments.length}</strong> of <strong>{payments.length}</strong> collections
        </span>
        <span className="text-[11px] text-slate-400">Single Source of Truth: ERPNext Payment Entry</span>
      </div>

      {/* Payment Detail Slide-Over Drawer */}
      <PaymentDetailDrawer
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}


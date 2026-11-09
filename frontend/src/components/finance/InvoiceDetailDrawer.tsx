'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/config/branding';
import { SalesInvoiceRecord } from '@/lib/frappe';
import { X, FileText, Calendar, User, Truck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface InvoiceDetailDrawerProps {
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoiceDetailDrawer({ invoiceId, onClose }: InvoiceDetailDrawerProps) {
  const [invoice, setInvoice] = useState<SalesInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/finance/revenue/${encodeURIComponent(invoiceId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.invoice) {
          setInvoice(data.invoice);
        } else {
          setError(data.error || 'Failed to load invoice details.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Network error fetching invoice.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{invoiceId}</h2>
              <p className="text-xs text-slate-500">Commercial Sales Invoice Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Loading invoice records from ERPNext...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {invoice && (
            <>
              {/* Financial Status Summary Banner */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Grand Total</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatCurrency(invoice.baseGrandTotal)}
                  </div>
                  {invoice.isReturn && (
                    <span className="text-[10px] text-rose-600 font-semibold uppercase">Credit Note Return</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Outstanding Balance</div>
                  <div className="text-xl font-bold text-amber-700 mt-0.5">
                    {formatCurrency(invoice.outstandingAmount)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Status: <strong className="text-slate-700">{invoice.status}</strong>
                  </span>
                </div>
              </div>

              {/* Metadata Attributes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commercial Context</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Customer</span>
                    </div>
                    <div className="font-semibold text-slate-800">{invoice.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{invoice.customer}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Posting & Due Date</span>
                    </div>
                    <div className="font-semibold text-slate-800">Posted: {formatDate(invoice.postingDate)}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Due: {formatDate(invoice.dueDate)}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Attributed Vehicle</span>
                    </div>
                    <div className="font-semibold text-slate-800">{invoice.vehicle || 'Fleet Unassigned'}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Operational Trip Link</span>
                    </div>
                    <div className="font-semibold text-slate-800">{invoice.miningTrip || 'Direct Billing'}</div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billed Services & Items</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">Item Description</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-right">Rate</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(invoice.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-800">{it.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{it.itemCode}</div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">{it.qty}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">{formatCurrency(it.rate)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 font-mono">
                            {formatCurrency(it.amount)}
                          </td>
                        </tr>
                      ))}
                      {(!invoice.items || invoice.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                            No item breakdown found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Allocations */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Settlement Allocations</h3>
                <div className="space-y-2">
                  {(invoice.payments || []).map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold text-slate-800">{p.paymentId}</span>
                          <span className="text-slate-400 text-[11px] block">{formatDate(p.date)}</span>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 font-mono">
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))}
                  {(!invoice.payments || invoice.payments.length === 0) && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No payment settlements posted against this invoice.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold transition-colors shadow-2xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}


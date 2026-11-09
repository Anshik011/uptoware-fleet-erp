'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/config/branding';
import { PaymentEntryRecord } from '@/lib/frappe';
import { X, CreditCard, Calendar, User, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface PaymentDetailDrawerProps {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentDetailDrawer({ paymentId, onClose }: PaymentDetailDrawerProps) {
  const [payment, setPayment] = useState<PaymentEntryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/finance/collections/${encodeURIComponent(paymentId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.payment) {
          setPayment(data.payment);
        } else {
          setError(data.error || 'Failed to load payment details.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Network error fetching payment.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  if (!paymentId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{paymentId}</h2>
              <p className="text-xs text-slate-500">Customer Payment Collection Receipt</p>
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
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
              <p className="text-xs">Loading collection record from ERPNext...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {payment && (
            <>
              {/* Collection Summary Banner */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Received Amount</div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {formatCurrency(payment.receivedAmount)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Type: <strong className="text-slate-700">{payment.paymentType}</strong>
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Allocated to Invoices</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatCurrency(payment.allocatedAmount)}
                  </div>
                  {payment.unallocatedAmount > 0 && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      Unallocated: {formatCurrency(payment.unallocatedAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Commercial Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transaction Details</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Customer</span>
                    </div>
                    <div className="font-semibold text-slate-800">{payment.partyName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{payment.party}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Posting Date</span>
                    </div>
                    <div className="font-semibold text-slate-800">{formatDate(payment.postingDate)}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Ref Date: {formatDate(payment.referenceDate)}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Payment Method</span>
                    </div>
                    <div className="font-semibold text-slate-800">{payment.modeOfPayment}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-white">
                    <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Cheque / UTR Reference</span>
                    </div>
                    <div className="font-semibold text-slate-800 font-mono">{payment.referenceNo}</div>
                  </div>
                </div>
              </div>

              {/* Invoices Settled / Allocated */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Allocated Sales Invoices
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">Invoice Number</th>
                        <th className="px-3 py-2.5 text-right">Invoice Total</th>
                        <th className="px-3 py-2.5 text-right">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(payment.references || []).map((ref, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono font-medium text-blue-700">
                            {ref.referenceName}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">
                            {formatCurrency(ref.totalAmount)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono">
                            {formatCurrency(ref.allocatedAmount)}
                          </td>
                        </tr>
                      ))}
                      {(!payment.references || payment.references.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                            No specific invoice references allocated (Advance Receipt or Direct Settlement).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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


'use client';

import React, { useState, useEffect } from 'react';
import { SalesInvoiceRecord, PaymentEntryRecord } from '@/lib/frappe';
import { formatCurrency, formatDate } from '@/config/branding';
import { X, CreditCard, IndianRupee, Calendar, FileText, CheckCircle2, AlertCircle, Loader2, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface PaymentRecordingModalProps {
  isOpen: boolean;
  invoice: SalesInvoiceRecord | null;
  onClose: () => void;
  onPaymentCreated: (payment: PaymentEntryRecord) => void;
}

const PAYMENT_MODES = [
  'Bank Transfer',
  'Cash',
  'Cheque',
  'UPI',
  'NEFT',
  'RTGS',
  'Post Dated Cheque',
  'Demand Draft',
  'Other',
];

export function PaymentRecordingModal({ isOpen, invoice, onClose, onPaymentCreated }: PaymentRecordingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPayment, setSavedPayment] = useState<PaymentEntryRecord | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setModeOfPayment('Bank Transfer');
      setReferenceNo('');
      setReferenceDate(new Date().toISOString().split('T')[0]);
      setError(null);
      setSavedPayment(null);
    }
    if (invoice && isOpen) {
      // Default to full outstanding amount
      if (invoice.outstandingAmount > 0) {
        setAmount(String(invoice.outstandingAmount));
      }
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const outstandingAmount = invoice.outstandingAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const isOverpayment = paymentAmount > outstandingAmount;
  const isValidAmount = paymentAmount > 0 && Number.isFinite(paymentAmount);

  const handleRecordPayment = async () => {
    if (!invoice || !isValidAmount) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/finance/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          party: invoice.customer,
          amount: paymentAmount,
          modeOfPayment,
          referenceNo,
          referenceDate,
          invoices: [{ id: invoice.id, amount: paymentAmount }],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment.');
      }

      setSavedPayment(data.payment);
      onPaymentCreated(data.payment);
    } catch (err: any) {
      setError(err.message || 'Error recording payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900 text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
              <p className="text-xs text-slate-500">
                Customer: {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {isOverpayment && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Warning: Overpayment Detected</p>
                <p className="text-xs mt-0.5">
                  Payment amount (₹{paymentAmount.toFixed(2)}) exceeds invoice outstanding (₹{outstandingAmount.toFixed(2)}).
                </p>
              </div>
            </div>
          )}

          {savedPayment ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold">Payment Recorded Successfully</p>
                  <p className="text-xs mt-0.5">
                    Payment Entry <strong className="font-mono">{savedPayment.id}</strong> created.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Amount Received</span>
                      <div className="font-medium text-slate-900">{formatCurrency(savedPayment.receivedAmount)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Allocated to Invoice</span>
                      <div className="font-medium text-slate-900">{formatCurrency(savedPayment.allocatedAmount)}</div>
                    </div>
                    {savedPayment.unallocatedAmount > 0 && (
                      <div>
                        <span className="text-xs text-slate-600">Unallocated (Advance)</span>
                        <div className="font-medium text-amber-700">{formatCurrency(savedPayment.unallocatedAmount)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Invoice Amount</span>
                  <span className="font-medium text-slate-900">{formatCurrency(invoice.baseGrandTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Outstanding Balance</span>
                  <Badge variant={invoice.status === 'Paid' ? 'positive' : 'warning'} size="sm">
                    {formatCurrency(outstandingAmount)}
                  </Badge>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Details</h3>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Payment Amount</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={outstandingAmount > 0 ? `₹${outstandingAmount.toFixed(2)} (Required)` : '₹0.00'}
                    className="font-mono text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5">Payment Mode</label>
                    <Select
                      value={modeOfPayment}
                      onChange={(e) => setModeOfPayment(e.target.value)}
                    >
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5">Reference No.</label>
                    <Input
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Cheque No / UTR / Transaction ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">Reference Date</label>
                  <Input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="md"
            disabled={loading}
          >
            {savedPayment ? 'Close' : 'Cancel'}
          </Button>
          {!savedPayment && (
            <Button
              onClick={handleRecordPayment}
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={loading || !amount || paymentAmount <= 0}
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
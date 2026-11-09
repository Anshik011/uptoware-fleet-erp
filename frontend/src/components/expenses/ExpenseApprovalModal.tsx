'use client';

import React, { useState } from 'react';
import { OperationalExpense, ExpenseWorkflowAction } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import {
  IndianRupee,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

interface ExpenseApprovalModalProps {
  isOpen: boolean;
  expense: OperationalExpense;
  action: ExpenseWorkflowAction;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseApprovalModal({
  isOpen,
  expense,
  action,
  onClose,
  onSuccess,
}: ExpenseApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    setError(null);

    if (action === 'Reject' && !rejectionReason.trim()) {
      setError('A rejection reason is strictly required when rejecting an expense disbursement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/expenses/${encodeURIComponent(expense.id)}/transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            rejectionReason: rejectionReason.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${action.toLowerCase()} expense.`);
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing approval action.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isReject = action === 'Reject';
  const isApprove = action === 'Approve';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      data-testid="modal-expense-approval"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isReject ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isReject ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {action} Operational Expense
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {expense.id} • ₹{expense.amount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Expense Snapshot */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-900">{expense.expenseCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Disbursed Amount:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Beneficiary / Payee:</span>
              <span className="text-slate-900 font-medium">
                {expense.payeeName || expense.supplierName || 'Direct'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Attribution:</span>
              <span className="text-slate-900">
                {expense.vehicle ? `Vehicle: ${expense.vehicle}` : 'General Fleet'}
              </span>
            </div>
          </div>

          {/* Rejection input */}
          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this expense claim is rejected (e.g. missing invoice receipt, unverified toll rate)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                data-testid="input-expense-rejection-reason"
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-rose-600"
              />
            </div>
          )}

          {/* Audit disclaimer */}
          <p className="text-[11px] text-slate-500">
            {isApprove &&
              'Approving will lock operational fields, certifying this disbursement for General Ledger accounting.'}
            {isReject &&
              'Rejecting will halt accounting processing and record the reason in the expense audit dossier.'}
            {action === 'Submit for Approval' &&
              'Submitting will forward this draft expense claim to management for formal sign-off.'}
            {action === 'Re-open' &&
              'Re-opening will return this expense to Draft state for modification and re-review.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isReject ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            disabled={isSubmitting}
            data-testid="btn-confirm-expense-approval"
          >
            {isSubmitting ? 'Processing...' : `Confirm: ${action}`}
          </Button>
        </div>
      </div>
    </div>
  );
}


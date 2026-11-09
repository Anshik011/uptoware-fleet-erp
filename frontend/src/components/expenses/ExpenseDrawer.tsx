'use client';

import React, { useState, useEffect } from 'react';
import {
  OperationalExpense,
  ExpenseApprovalStatus,
  ExpenseAccountingStatus,
  ExpenseWorkflowAction,
} from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  IndianRupee,
  X,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  User,
  Building2,
  Receipt,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

interface ExpenseDrawerProps {
  expenseId: string | null;
  onClose: () => void;
  onOpenApprovalModal: (expense: OperationalExpense, action: ExpenseWorkflowAction) => void;
  canManage: boolean;
}

export function ExpenseDrawer({
  expenseId,
  onClose,
  onOpenApprovalModal,
  canManage,
}: ExpenseDrawerProps) {
  const [expense, setExpense] = useState<OperationalExpense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expenseId) {
      setExpense(null);
      return;
    }

    let ignore = false;
    async function loadDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/expenses/${encodeURIComponent(expenseId!)}`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch expense details.');
        }
        setExpense(json.expense);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Error loading details.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDetails();
    return () => {
      ignore = true;
    };
  }, [expenseId]);

  if (!expenseId) return null;

  function getApprovalBadgeVariant(status: ExpenseApprovalStatus): BadgeVariant {
    switch (status) {
      case 'Approved':
        return 'positive';
      case 'Submitted':
        return 'warning';
      case 'Draft':
        return 'neutral';
      case 'Rejected':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  function getAccountingBadgeVariant(status?: ExpenseAccountingStatus): BadgeVariant {
    switch (status) {
      case 'Posted':
        return 'positive';
      case 'Unposted':
      default:
        return 'neutral';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end"
      data-testid="drawer-expense-details"
    >
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-blue-900">
                {expenseId}
              </span>
              {expense && (
                <>
                  <Badge variant={getApprovalBadgeVariant(expense.approvalStatus)}>
                    {expense.approvalStatus}
                  </Badge>
                  <Badge variant={getAccountingBadgeVariant(expense.accountingStatus)}>
                    {expense.accountingStatus}
                  </Badge>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Operational Fleet Disbursement & Expense Dossier
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Loading operational expense disbursement records...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {expense && !isLoading && (
            <>
              {/* Rejection Notice if present */}
              {expense.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Expense Rejected by Management</span>
                  </div>
                  <p className="text-xs text-rose-800 pl-6">{expense.rejectionReason}</p>
                </div>
              )}

              {/* Section 1: Financial Disbursement Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-slate-500" />
                  Financial Disbursement Summary
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Category</span>
                    <span className="font-semibold text-slate-900">{expense.expenseCategory}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Disbursed Amount</span>
                    <span className="font-mono font-bold text-base text-blue-900">
                      ₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Expense Date</span>
                    <span className="font-mono text-slate-900">{expense.expenseDate}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Payment Method</span>
                    <span className="text-slate-900">{expense.paymentMethod || 'Cash'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Payee / Beneficiary</span>
                    <span className="text-slate-900 font-medium">
                      {expense.payeeName || expense.supplierName || 'Direct'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Bill / Receipt Ref</span>
                    <span className="font-mono text-slate-900">{expense.billReference || '—'}</span>
                  </div>
                </div>

                {expense.description && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Description & Business Justification
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">
                      {expense.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Operational Attribution */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" />
                  Fleet & Route Attribution
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Attributed Vehicle</span>
                    <span className="font-mono font-bold text-slate-900">
                      {expense.vehicle || 'General Fleet'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Mining Trip</span>
                    <span className="font-mono text-blue-900">
                      {expense.miningTrip || 'Unlinked'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Mine Site</span>
                    <span className="text-slate-900">
                      {expense.mineSiteName || expense.mineSite || 'Fleet General'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Driver</span>
                    <span className="text-slate-900">
                      {expense.driverName || expense.driver || 'Unlinked'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Supplier / Vendor</span>
                    <span className="text-slate-900">
                      {expense.supplierName || expense.supplier || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Payment Status</span>
                    <span className="font-semibold text-slate-900">{expense.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: General Ledger & Accounting Status */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  ERPNext General Ledger Posting
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Accounting Status</span>
                    <Badge variant={getAccountingBadgeVariant(expense.accountingStatus)}>
                      {expense.accountingStatus}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Expense GL Account</span>
                    <span className="text-slate-900 font-mono text-[11px]">
                      {expense.expenseAccount || 'Fleet Expenses - UFM'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Payment Account</span>
                    <span className="text-slate-900 font-mono text-[11px]">
                      {expense.paymentAccount || 'Cash / Bank - UFM'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Cost Center</span>
                    <span className="text-slate-900 font-mono text-[11px]">
                      {expense.costCenter || 'Fleet Operations - UFM'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Posting Document</span>
                    <span className="text-slate-900 font-mono text-[11px]">
                      {expense.postingDocumentName
                        ? `${expense.postingDocumentType || 'Doc'}: ${expense.postingDocumentName}`
                        : 'Pending Posting'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Posted By / On</span>
                    <span className="text-slate-900">
                      {expense.postedBy ? `${expense.postedBy} (${expense.postedOn || ''})` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Audit & Sign-off Trail */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Created: {expense.creation || '—'}</div>
                <div>Last Modified: {expense.modified || '—'}</div>
                {expense.submittedBy && (
                  <div>
                    Submitted By: {expense.submittedBy} on {expense.submittedOn || '—'}
                  </div>
                )}
                {expense.approvedBy && (
                  <div>
                    Approved By: {expense.approvedBy} on {expense.approvedOn || '—'}
                  </div>
                )}
                {expense.rejectedBy && (
                  <div>
                    Rejected By: {expense.rejectedBy} on {expense.rejectedOn || '—'}
                  </div>
                )}
                {expense.isTestRecord ? (
                  <div className="text-amber-600 font-bold">Quarantined QA Test Record</div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>

          {canManage && expense && (
            <div className="flex items-center gap-2">
              {expense.approvalStatus === 'Draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenApprovalModal(expense, 'Submit for Approval')}
                  data-testid="btn-drawer-submit-expense"
                >
                  Submit for Approval
                </Button>
              )}

              {expense.approvalStatus === 'Submitted' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenApprovalModal(expense, 'Reject')}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    data-testid="btn-drawer-reject-expense"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenApprovalModal(expense, 'Approve')}
                    data-testid="btn-drawer-approve-expense"
                  >
                    Approve Expense
                  </Button>
                </>
              )}

              {(expense.approvalStatus === 'Approved' || expense.approvalStatus === 'Rejected') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenApprovalModal(expense, 'Re-open')}
                  data-testid="btn-drawer-reopen-expense"
                >
                  Re-open Expense
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

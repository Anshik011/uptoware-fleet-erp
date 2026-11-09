'use client';

import React from 'react';
import { OperationalExpense, ExpenseApprovalStatus, ExpenseAccountingStatus } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  IndianRupee,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  PlusCircle,
  Clock,
  ArrowRight,
  Receipt,
  Truck,
  MapPin,
  User,
} from 'lucide-react';

interface ExpenseTableProps {
  expenses: OperationalExpense[];
  categories: string[];
  vehicles: Array<{ id: string; licensePlate: string }>;
  searchQuery: string;
  selectedCategory: string;
  selectedVehicle: string;
  selectedStatus: string;
  onSearchChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
  onVehicleChange: (v: string) => void;
  onStatusChange: (status: string) => void;
  onSelectExpense: (e: OperationalExpense) => void;
  onOpenAddExpense: () => void;
  onOpenApprovalModal: (e: OperationalExpense, action: 'Approve' | 'Reject' | 'Re-open' | 'Submit for Approval') => void;
  canManage: boolean;
}

export function ExpenseTable({
  expenses,
  categories,
  vehicles,
  searchQuery,
  selectedCategory,
  selectedVehicle,
  selectedStatus,
  onSearchChange,
  onCategoryChange,
  onVehicleChange,
  onStatusChange,
  onSelectExpense,
  onOpenAddExpense,
  onOpenApprovalModal,
  canManage,
}: ExpenseTableProps) {
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

  const pendingCount = expenses.filter(
    (e) => e.approvalStatus === 'Submitted' || e.approvalStatus === 'Draft'
  ).length;
  const approvedCount = expenses.filter((e) => e.approvalStatus === 'Approved').length;
  const rejectedCount = expenses.filter((e) => e.approvalStatus === 'Rejected').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header, Tabs & Filters */}
      <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => onStatusChange('ALL')}
              data-testid="tab-expense-all"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatus === 'ALL'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Expenses ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Pending')}
              data-testid="tab-expense-pending"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === 'Pending'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Approval
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-200/80 font-bold">
                {pendingCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Approved')}
              data-testid="tab-expense-approved"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === 'Approved'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Rejected')}
              data-testid="tab-expense-rejected"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatus === 'Rejected'
                  ? 'bg-rose-100 text-rose-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddExpense}
              data-testid="btn-add-expense-table"
            >
              Record Expense
            </Button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, payee, bill ref, vehicle, trip, category..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-expense-search"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              data-testid="select-expense-filter-category"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Expense Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedVehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              data-testid="select-expense-filter-vehicle"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate || v.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs sm:text-sm"
          data-testid="table-expenses"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Expense ID / Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Attribution (Vehicle / Site / Trip)</th>
              <th className="py-3 px-4">Payee & Method</th>
              <th className="py-3 px-4">Bill Reference</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4 text-right">Accounting</th>
              <th className="py-3 px-4 text-right">Approval Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <IndianRupee className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No operational expenses found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery || selectedCategory !== 'ALL' || selectedVehicle !== 'ALL'
                        ? 'Try clearing the search query or adjusting active filters.'
                        : 'No operational expense disbursements have been recorded in ERPNext.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((e) => {
                const isPending = e.approvalStatus === 'Submitted' || e.approvalStatus === 'Draft';

                return (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectExpense(e)}
                    data-testid={`row-expense-${e.id}`}
                  >
                    {/* Expense ID & Date */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                      <div className="font-mono text-xs font-bold text-blue-900">
                        {e.id}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {e.expenseDate}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 text-xs">
                        {e.expenseCategory}
                      </div>
                      {e.description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {e.description}
                        </div>
                      )}
                    </td>

                    {/* Attribution */}
                    <td className="py-3.5 px-4">
                      {e.vehicle ? (
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          {e.vehicle}
                        </div>
                      ) : null}
                      {e.miningTrip ? (
                        <div className="text-[11px] font-mono text-blue-800">
                          Trip: {e.miningTrip}
                        </div>
                      ) : null}
                      {e.mineSite ? (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {e.mineSite}
                        </div>
                      ) : null}
                      {!e.vehicle && !e.miningTrip && !e.mineSite && (
                        <span className="text-slate-400 text-xs">Fleet General</span>
                      )}
                    </td>

                    {/* Payee & Method */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 font-medium">
                        {e.payeeName || e.supplierName || e.supplier || 'Direct Expense'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {e.paymentMethod || 'Cash'}
                      </div>
                    </td>

                    {/* Bill Reference */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                      {e.billReference || '—'}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      ₹{e.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>

                    {/* Accounting Status */}
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={getAccountingBadgeVariant(e.accountingStatus)}>
                        {e.accountingStatus}
                      </Badge>
                    </td>

                    {/* Approval Status */}
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={getApprovalBadgeVariant(e.approvalStatus)}>
                        {e.approvalStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right"
                      onClick={(evt) => evt.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => onSelectExpense(e)}
                          data-testid={`btn-view-expense-${e.id}`}
                        >
                          Details
                        </Button>

                        {canManage && isPending && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ArrowRight}
                            onClick={() => onOpenApprovalModal(e, 'Approve')}
                            data-testid={`btn-approve-expense-${e.id}`}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OperationalExpense, ExpenseMetrics, ExpenseWorkflowAction } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpenseDashboard } from '@/components/expenses/ExpenseDashboard';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { ExpenseDrawer } from '@/components/expenses/ExpenseDrawer';
import { ExpenseApprovalModal } from '@/components/expenses/ExpenseApprovalModal';
import { Button } from '@/components/ui/Button';
import { IndianRupee, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function ExpensesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Accountant', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<ExpenseMetrics>({
    totalDisbursed: 0,
    approvedAmount: 0,
    pendingApprovalsCount: 0,
    unpostedAmount: 0,
  });

  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [approvalModalState, setApprovalModalState] = useState<{
    expense: OperationalExpense;
    action: ExpenseWorkflowAction;
  } | null>(null);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/expenses/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.categories) setCategories(json.categories);
          if (json.vehicles) setVehicles(json.vehicles);
        }
      } catch (err) {
        console.warn('Could not load expense filter options:', err);
      }
    }
    loadOptions();
  }, []);

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (selectedStatus === 'Pending') {
          // In frappe filter, we can let the API handle or filter on client
        } else if (selectedStatus !== 'ALL') {
          params.set('status', selectedStatus);
        }
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
        if (selectedVehicle !== 'ALL') params.set('vehicle', selectedVehicle);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/expenses?${params.toString()}`);
        const json = await res.json();
        if (ignore) return;

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch operational expenses.');
        }

        setError(null);
        setMetrics(json.metrics);

        let data = json.expenses || [];
        if (selectedStatus === 'Pending') {
          data = data.filter(
            (e: OperationalExpense) =>
              e.approvalStatus === 'Submitted' || e.approvalStatus === 'Draft'
          );
        }

        setExpenses(data);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Network error fetching expenses.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedStatus, selectedCategory, selectedVehicle, searchQuery, refreshIndex]);

  const fetchExpenseData = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  return (
    <AppShell
      headerTitle="Operational Expense & Financial Control"
      headerSubtitle="Fleet disbursements, route expenses, driver allowances, and multi-tier audit approvals"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="Operational Expense Register"
          subtitle="Real-time expense claims, cost attribution, and General Ledger authorization"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Operating Expenses' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                icon={RefreshCw}
                onClick={fetchExpenseData}
                disabled={isLoading}
                data-testid="btn-refresh-expenses"
              >
                Refresh
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="md"
                  icon={PlusCircle}
                  onClick={() => setIsAddModalOpen(true)}
                  data-testid="btn-add-expense-header"
                >
                  Record Expense
                </Button>
              )}
            </div>
          }
        />

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-rose-900">Expense Retrieval Failed</h4>
              <p className="mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchExpenseData}>
              Retry
            </Button>
          </div>
        )}

        {/* Live Operational Metrics Dashboard */}
        <ExpenseDashboard metrics={metrics} isLoading={isLoading} />

        {/* Main Table */}
        <ExpenseTable
          expenses={expenses}
          categories={categories}
          vehicles={vehicles}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          selectedVehicle={selectedVehicle}
          selectedStatus={selectedStatus}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
          onVehicleChange={setSelectedVehicle}
          onStatusChange={setSelectedStatus}
          onSelectExpense={(e) => setSelectedExpenseId(e.id)}
          onOpenAddExpense={() => setIsAddModalOpen(true)}
          onOpenApprovalModal={(e, action) => setApprovalModalState({ expense: e, action })}
          canManage={canManage}
        />

        {/* Record Expense Modal */}
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchExpenseData();
          }}
        />

        {/* Expense Details Drawer */}
        <ExpenseDrawer
          expenseId={selectedExpenseId}
          onClose={() => setSelectedExpenseId(null)}
          onOpenApprovalModal={(e, action) => {
            setSelectedExpenseId(null);
            setApprovalModalState({ expense: e, action });
          }}
          canManage={canManage}
        />

        {/* Approval Modal */}
        {approvalModalState && (
          <ExpenseApprovalModal
            isOpen={Boolean(approvalModalState)}
            expense={approvalModalState.expense}
            action={approvalModalState.action}
            onClose={() => setApprovalModalState(null)}
            onSuccess={() => {
              setApprovalModalState(null);
              fetchExpenseData();
            }}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}


'use client';

import React from 'react';
import { ExpenseMetrics } from '@/types/fleet';
import { IndianRupee, Clock, CheckCircle2, AlertCircle, TrendingUp, PieChart } from 'lucide-react';

interface ExpenseDashboardProps {
  metrics: ExpenseMetrics;
  isLoading?: boolean;
}

export function ExpenseDashboard({ metrics, isLoading = false }: ExpenseDashboardProps) {
  const cards = [
    {
      id: 'total-disbursed',
      label: 'Total Disbursed',
      value: isLoading
        ? '...'
        : `₹${metrics.totalDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subtext: 'Cumulative operational expense recorded',
      badge: 'Gross Outflow',
      badgeColor: 'bg-slate-100 text-slate-800',
      icon: IndianRupee,
      iconColor: 'text-blue-900',
      iconBg: 'bg-blue-50',
    },
    {
      id: 'approved-amount',
      label: 'Certified Approved Spend',
      value: isLoading
        ? '...'
        : `₹${metrics.approvedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subtext: 'Formally audited and approved disbursements',
      badge: 'Audited & Verified',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
    },
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      value: isLoading ? '...' : `${metrics.pendingApprovalsCount} Records`,
      subtext: 'Submitted expenses awaiting management sign-off',
      badge: metrics.pendingApprovalsCount > 0 ? 'Requires Action' : 'All Clear',
      badgeColor:
        metrics.pendingApprovalsCount > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800',
      icon: Clock,
      iconColor: metrics.pendingApprovalsCount > 0 ? 'text-amber-700' : 'text-emerald-700',
      iconBg: metrics.pendingApprovalsCount > 0 ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      id: 'top-category',
      label: 'Top Category Outflow',
      value: isLoading
        ? '...'
        : metrics.topCategoryName && metrics.topCategoryAmount != null
        ? `₹${metrics.topCategoryAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : '—',
      subtext: metrics.topCategoryName
        ? `Dominant: ${metrics.topCategoryName}`
        : 'No category spend recorded',
      badge: metrics.topCategoryName || 'Analysis',
      badgeColor: 'bg-purple-100 text-purple-800',
      icon: PieChart,
      iconColor: 'text-purple-700',
      iconBg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            data-testid={`metric-card-${card.id}`}
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                  {card.value}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

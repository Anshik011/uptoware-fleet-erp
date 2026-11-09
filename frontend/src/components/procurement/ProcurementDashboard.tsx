import React from 'react';
import { ProcurementMetrics } from '@/types/fleet';
import { ShoppingCart, IndianRupee, Clock, PackageCheck, Users } from 'lucide-react';

interface ProcurementDashboardProps {
  metrics: ProcurementMetrics;
  isLoading?: boolean;
}

export function ProcurementDashboard({ metrics, isLoading = false }: ProcurementDashboardProps) {
  const cards = [
    {
      title: 'Total Procurement Spend',
      value: `₹${(metrics.totalSpend || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: 'Cumulative purchase orders',
      icon: IndianRupee,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Open Purchase Orders',
      value: (metrics.openOrdersCount || 0).toLocaleString(),
      subtitle: 'Orders awaiting full receipt/billing',
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      badge: metrics.openOrdersCount > 0 ? 'Active' : 'All Clear',
      badgeColor: metrics.openOrdersCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Pending Goods Inward',
      value: (metrics.pendingReceiptsCount || 0).toLocaleString(),
      subtitle: 'POs awaiting Purchase Receipt',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badge: metrics.pendingReceiptsCount > 0 ? 'Awaiting Inward' : 'None',
      badgeColor: metrics.pendingReceiptsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Supplier Payables (Outstanding)',
      value: `₹${(metrics.outstandingPayables || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: 'Creditors outstanding balance',
      icon: Users,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-white rounded-lg border ${card.borderColor} p-6 shadow-sm flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-600">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 animate-pulse rounded" />
                ) : (
                  card.value
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{card.subtitle}</span>
                {card.badge && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


import React from 'react';
import { InventoryMetrics } from '@/types/fleet';
import { Package, IndianRupee, AlertTriangle, ArrowDownRight, Layers } from 'lucide-react';

interface InventoryDashboardProps {
  metrics: InventoryMetrics;
  isLoading?: boolean;
}

export function InventoryDashboard({ metrics, isLoading = false }: InventoryDashboardProps) {
  const cards = [
    {
      title: 'Total Stock Valuation',
      value: `₹${(metrics.totalInventoryValue || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: 'Valuation across active warehouses',
      icon: IndianRupee,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Active Spare Parts',
      value: (metrics.activePartsCount || 0).toLocaleString(),
      subtitle: 'Catalogued inventory items',
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      title: 'Low Stock Alerts',
      value: (metrics.lowStockCount || 0).toLocaleString(),
      subtitle: 'Items at or below reorder level',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badge: metrics.lowStockCount > 0 ? 'Action Required' : 'Optimal',
      badgeColor: metrics.lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Stock Outages',
      value: (metrics.outOfStockCount || 0).toLocaleString(),
      subtitle: 'Items with zero actual stock',
      icon: ArrowDownRight,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      badge: metrics.outOfStockCount > 0 ? 'Critical' : 'None',
      badgeColor: metrics.outOfStockCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
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


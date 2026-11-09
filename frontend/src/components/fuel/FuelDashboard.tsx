'use client';

import React from 'react';
import { FuelMetrics } from '@/types/fleet';
import { Fuel, IndianRupee, Gauge, CheckCircle2 } from 'lucide-react';

interface FuelDashboardProps {
  metrics: FuelMetrics;
  isLoading?: boolean;
}

export function FuelDashboard({ metrics, isLoading = false }: FuelDashboardProps) {
  const cards = [
    {
      id: 'total-litres',
      label: 'Approved Fuel Volume',
      value: isLoading ? '...' : `${metrics.totalLitres.toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`,
      subtext: 'Cumulative approved fuel dispensed',
      badge: `${metrics.approvedLogsCount} Logs`,
      badgeColor: 'bg-blue-100 text-blue-800',
      icon: Fuel,
      iconColor: 'text-blue-900',
      iconBg: 'bg-blue-50',
    },
    {
      id: 'total-cost',
      label: 'Total Fuel Expenditure',
      value: isLoading ? '...' : `₹${metrics.totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subtext: 'Billed refuel disbursement total',
      badge: 'Certified Spend',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      icon: IndianRupee,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
    },
    {
      id: 'average-rate',
      label: 'Average Rate / Litre',
      value: isLoading ? '...' : `₹${metrics.averageRatePerLitre.toFixed(2)}/L`,
      subtext: 'Weighted cost per litre dispensed',
      badge: 'Price Benchmark',
      badgeColor: 'bg-purple-100 text-purple-800',
      icon: Gauge,
      iconColor: 'text-purple-700',
      iconBg: 'bg-purple-50',
    },
    {
      id: 'average-kml',
      label: 'Interval Fleet Mileage',
      value: isLoading ? '...' : metrics.averageKmPerLitre > 0 ? `${metrics.averageKmPerLitre.toFixed(2)} KM/L` : '—',
      subtext: 'Mean full-to-full tank interval efficiency',
      badge: metrics.pendingApprovalsCount > 0 ? `${metrics.pendingApprovalsCount} Pending` : 'Audited',
      badgeColor: metrics.pendingApprovalsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
      icon: CheckCircle2,
      iconColor: metrics.pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-700',
      iconBg: metrics.pendingApprovalsCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
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
              <p className="mt-1.5 text-xs text-slate-500">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


'use client';

import React from 'react';
import { WeighbridgeMetrics } from '@/types/fleet';
import { Scale, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface WeighbridgeDashboardProps {
  metrics: WeighbridgeMetrics;
  isLoading?: boolean;
}

export function WeighbridgeDashboard({ metrics, isLoading = false }: WeighbridgeDashboardProps) {
  const cards = [
    {
      id: 'pending-scale',
      label: 'Pending Scale Queue',
      value: isLoading ? '...' : String(metrics.pendingTripsCount),
      subtext: 'Dispatched trucks awaiting scale capture',
      badge: metrics.pendingTripsCount > 0 ? 'Action Required' : 'Cleared',
      badgeColor: metrics.pendingTripsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      id: 'completed-today',
      label: 'Scale Slips Confirmed',
      value: isLoading ? '...' : String(metrics.completedTodayCount),
      subtext: 'Weighbridge readings logged today',
      badge: 'Today',
      badgeColor: 'bg-blue-100 text-blue-800',
      icon: CheckCircle2,
      iconColor: 'text-blue-900',
      iconBg: 'bg-blue-50',
    },
    {
      id: 'total-tonnage',
      label: 'Total Net Tonnage Weighed',
      value: isLoading ? '...' : `${metrics.totalTonnageWeighed.toLocaleString('en-IN', { maximumFractionDigits: 1 })} T`,
      subtext: 'Cumulative verified payload weight',
      badge: 'Certified',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      icon: Scale,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
    },
    {
      id: 'average-payload',
      label: 'Average Net Payload',
      value: isLoading ? '...' : `${metrics.averageNetPayloadTons.toFixed(2)} T`,
      subtext: 'Mean certified haul per completed trip',
      badge: 'Efficiency',
      badgeColor: 'bg-purple-100 text-purple-800',
      icon: TrendingUp,
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
              <p className="mt-1.5 text-xs text-slate-500">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


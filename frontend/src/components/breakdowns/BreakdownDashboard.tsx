'use client';

import React from 'react';
import { BreakdownMetrics } from '@/types/fleet';
import { Wrench, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface BreakdownDashboardProps {
  metrics: BreakdownMetrics;
  isLoading?: boolean;
}

export function BreakdownDashboard({ metrics, isLoading = false }: BreakdownDashboardProps) {
  const cards = [
    {
      id: 'total-incidents',
      label: 'Total Incidents',
      value: isLoading ? '...' : `${metrics.totalIncidents}`,
      subtext: 'Cumulative breakdown events recorded',
      badge: `${metrics.closedIncidents} Resolved`,
      badgeColor: 'bg-slate-100 text-slate-800',
      icon: AlertTriangle,
      iconColor: 'text-blue-900',
      iconBg: 'bg-blue-50',
    },
    {
      id: 'in-workshop',
      label: 'Active in Workshop',
      value: isLoading ? '...' : `${metrics.inWorkshopCount}`,
      subtext: 'Vehicles currently undergoing repairs',
      badge: 'Work in Progress',
      badgeColor: 'bg-amber-100 text-amber-800',
      icon: Wrench,
      iconColor: 'text-amber-700',
      iconBg: 'bg-amber-50',
    },
    {
      id: 'awaiting-parts',
      label: 'Awaiting Spare Parts',
      value: isLoading ? '...' : `${metrics.awaitingPartsCount}`,
      subtext: 'Repairs pending component requisition',
      badge: metrics.awaitingPartsCount > 0 ? 'Action Needed' : 'No Bottlenecks',
      badgeColor: metrics.awaitingPartsCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
      icon: Clock,
      iconColor: metrics.awaitingPartsCount > 0 ? 'text-rose-600' : 'text-emerald-700',
      iconBg: metrics.awaitingPartsCount > 0 ? 'bg-rose-50' : 'bg-emerald-50',
    },
    {
      id: 'fleet-downtime',
      label: 'Fleet Downtime / Critical',
      value: isLoading ? '...' : `${metrics.totalDowntimeHours.toFixed(1)} Hrs`,
      subtext: `Total repair outage (${metrics.criticalIncidents} critical events)`,
      badge: `${metrics.criticalIncidents} Critical`,
      badgeColor: metrics.criticalIncidents > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
      icon: ShieldAlert,
      iconColor: metrics.criticalIncidents > 0 ? 'text-rose-700' : 'text-slate-700',
      iconBg: metrics.criticalIncidents > 0 ? 'bg-rose-50' : 'bg-slate-50',
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


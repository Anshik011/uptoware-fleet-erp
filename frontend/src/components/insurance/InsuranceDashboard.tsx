import React from 'react';
import { InsuranceMetrics } from '@/types/fleet';
import { Shield, ShieldAlert, ShieldCheck, IndianRupee, AlertTriangle } from 'lucide-react';

interface InsuranceDashboardProps {
  metrics: InsuranceMetrics;
  isLoading?: boolean;
}

export function InsuranceDashboard({ metrics, isLoading = false }: InsuranceDashboardProps) {
  const cards = [
    {
      title: 'Active Insurance Policies',
      value: (metrics.activePolicies || 0).toLocaleString(),
      subtitle: `Out of ${metrics.totalPolicies || 0} total fleet policies`,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      badge: metrics.activePolicies > 0 ? 'Covered' : 'Action Required',
      badgeColor: metrics.activePolicies > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
    },
    {
      title: 'Expiring Within 30 Days',
      value: (metrics.expiringSoon || 0).toLocaleString(),
      subtitle: 'Policies requiring renewal notice',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badge: metrics.expiringSoon > 0 ? 'Attention' : 'No Expiries',
      badgeColor: metrics.expiringSoon > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
    },
    {
      title: 'Expired / Lapsed Policies',
      value: (metrics.expired || 0).toLocaleString(),
      subtitle: 'Dispatch blocking coverage gaps',
      icon: ShieldAlert,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      badge: metrics.expired > 0 ? 'Dispatch Blocked' : 'Zero Lapses',
      badgeColor: metrics.expired > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Total Annual Premium',
      value: `₹${(metrics.totalPremiumSpent || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `Avg. ₹${Math.round(metrics.averagePremium || 0).toLocaleString('en-IN')} / vehicle`,
      icon: IndianRupee,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {card.title}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {isLoading ? (
                      <span className="inline-block w-20 h-7 bg-slate-100 animate-pulse rounded" />
                    ) : (
                      card.value
                    )}
                  </h3>
                </div>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bgColor} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium truncate">{card.subtitle}</span>
              {card.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


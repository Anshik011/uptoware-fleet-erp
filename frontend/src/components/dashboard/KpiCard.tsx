import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'positive' | 'warning' | 'critical' | 'neutral';
  };
}

export function KpiCard({ title, value, subtext, icon: Icon, badge }: KpiCardProps) {
  const badgeClasses = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      data-testid="kpi-card"
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full min-w-0 overflow-hidden"
    >
      {/* Card Header: Title & Icon */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-snug break-words min-w-0 flex-1">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 border border-blue-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Main Metric Section: Value & Dedicated Responsive Badge Row */}
      <div className="my-auto py-1 min-w-0 flex flex-col justify-center">
        {/* Value row with responsive scaling and zero horizontal overflow */}
        <div className="text-xl sm:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight min-w-0 break-words">
          {value}
        </div>

        {/* Status badge placed in dedicated row below value to prevent horizontal space collision */}
        {badge && (
          <div className="mt-2 min-w-0 flex items-center">
            <span
              data-testid="kpi-badge"
              className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 max-w-full ${
                badgeClasses[badge.variant]
              }`}
            >
              {badge.text}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Subtext / Breakdown with clear divider */}
      <div className="text-xs text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100 min-w-0 flex items-center gap-1.5 leading-relaxed">
        <span className="break-words min-w-0">{subtext}</span>
      </div>
    </div>
  );
}

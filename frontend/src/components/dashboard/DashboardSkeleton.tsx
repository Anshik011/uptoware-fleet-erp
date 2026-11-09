import React from 'react';

export function KpiCardSkeleton() {
  return (
    <div
      data-testid="kpi-card-skeleton"
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden animate-pulse"
    >
      {/* Header Row: Title & Icon placeholder */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 min-w-0">
        <div className="h-3.5 bg-slate-200 rounded w-24" />
        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
      </div>

      {/* Main Metric: Value & Badge placeholder */}
      <div className="my-auto py-1 min-w-0 flex flex-col justify-center">
        <div className="h-7 sm:h-8 bg-slate-200 rounded w-28 mb-2" />
        <div className="h-5 bg-slate-100 rounded-md w-20 border border-slate-200" />
      </div>

      {/* Footer Subtext placeholder */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 min-w-0">
        <div className="h-3 bg-slate-200/70 rounded w-36" />
      </div>
    </div>
  );
}

export function UtilizationCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded w-44" />
            <div className="h-3 bg-slate-100 rounded w-64" />
          </div>
          <div className="h-6 bg-slate-100 border border-slate-200 rounded-full w-28" />
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-slate-200/70 rounded-full mb-6" />

        {/* Status Distribution Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-20" />
              <div className="h-6 bg-slate-200 rounded w-10" />
              <div className="h-2.5 bg-slate-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Strip */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div className="h-3.5 bg-slate-200 rounded w-32" />
        <div className="h-4 bg-slate-200 rounded w-24" />
      </div>
    </div>
  );
}

export function FinancialSummaryCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded w-48" />
            <div className="h-3 bg-slate-100 rounded w-56" />
          </div>
          <div className="h-6 bg-slate-100 border border-slate-200 rounded w-20" />
        </div>

        {/* 2 Big boxes */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="h-7 bg-slate-200 rounded w-28" />
            <div className="h-2.5 bg-slate-100 rounded w-24" />
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-28" />
            <div className="h-7 bg-slate-200 rounded w-28" />
            <div className="h-2.5 bg-slate-100 rounded w-24" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="h-3.5 bg-slate-200 rounded w-28" />
              <div className="h-3.5 bg-slate-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
        <div className="h-3 bg-slate-200 rounded w-36" />
        <div className="h-4 bg-slate-200 rounded w-28" />
      </div>
    </div>
  );
}


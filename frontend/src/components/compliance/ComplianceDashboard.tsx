'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Truck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ComplianceMetrics } from '@/types/fleet';

interface ComplianceDashboardProps {
  metrics: ComplianceMetrics;
  isLoading?: boolean;
}

export function ComplianceDashboard({ metrics, isLoading = false }: ComplianceDashboardProps) {
  const complianceRate = metrics.totalVehicles > 0
    ? Math.round((metrics.fullyCompliant / metrics.totalVehicles) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Fleet Monitored */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Monitored Fleet
            </p>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {isLoading ? '...' : metrics.totalVehicles}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active commercial haulage assets</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Fully Compliant Assets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              100% Fully Compliant
            </p>
            <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
              {isLoading ? '...' : metrics.fullyCompliant}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {complianceRate}% dispatch-ready rate
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Expiring Within 30 Days */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expiring Soon (&le;30d)
            </p>
            <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
              {isLoading ? '...' : metrics.expiringSoon}
            </div>
            <p className="text-xs text-amber-700 mt-1">Requires renewal attention</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Non-Compliant / Dispatch Blocked */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Non-Compliant / Blocked
            </p>
            <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">
              {isLoading ? '...' : metrics.nonCompliant}
            </div>
            <p className="text-xs text-rose-600 mt-1">
              {metrics.insuranceExpired > 0 && `${metrics.insuranceExpired} ins.`}
              {metrics.insuranceExpired > 0 && metrics.fitnessExpired > 0 && ' | '}
              {metrics.fitnessExpired > 0 && `${metrics.fitnessExpired} fit.`}
              {metrics.insuranceExpired === 0 && metrics.fitnessExpired === 0 && 'Immediate dispatch freeze'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}


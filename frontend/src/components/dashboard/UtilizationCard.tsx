import React from 'react';
import { Gauge, CheckCircle2, AlertTriangle, Wrench, ShieldAlert } from 'lucide-react';

interface UtilizationCardProps {
  totalVehicles: number;
  activeVehicles: number;
  inMaintenance: number;
  inBreakdown: number;
  outOfService: number;
  utilizationRate: number;
  totalCapacityTons: number;
  activeCapacityTons: number;
}

export function UtilizationCard({
  totalVehicles,
  activeVehicles,
  inMaintenance,
  inBreakdown,
  outOfService,
  utilizationRate,
  totalCapacityTons,
  activeCapacityTons,
}: UtilizationCardProps) {
  const activePercent = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
  const maintPercent = totalVehicles > 0 ? Math.round((inMaintenance / totalVehicles) * 100) : 0;
  const bdPercent = totalVehicles > 0 ? Math.round((inBreakdown / totalVehicles) * 100) : 0;

  // Calculate SVG bar coordinates safely
  const activeWidth = activePercent;
  const maintWidth = maintPercent;
  const bdWidth = bdPercent;
  const maintX = activeWidth;
  const bdX = activeWidth + maintWidth;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Fleet Utilization & Capacity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time operational readiness and deployed mineral payload
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
            <Gauge className="w-4 h-4 text-blue-700" />
            <span>{utilizationRate}% Deployed</span>
          </div>
        </div>

        {/* Multi-segment Progress Bar using native SVG attributes without inline CSS */}
        <div className="space-y-2 mb-6">
          <svg className="w-full h-3 rounded-full bg-slate-100 overflow-hidden" preserveAspectRatio="none" viewBox="0 0 100 12">
            <rect x="0" y="0" width={activeWidth} height="12" fill="#2563eb" />
            <rect x={maintX} y="0" width={maintWidth} height="12" fill="#f59e0b" />
            <rect x={bdX} y="0" width={bdWidth} height="12" fill="#ef4444" />
          </svg>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Fleet Efficiency Benchmark: 80%</span>
            <span className="font-semibold text-slate-700">{totalVehicles} Total Units</span>
          </div>
        </div>

        {/* Status Distribution Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Active on Road</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{activeVehicles}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{activePercent}% of fleet</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>In Maintenance</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{inMaintenance}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{maintPercent}% of fleet</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>In Workshop</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{inBreakdown}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{bdPercent}% of fleet</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              <span>Out of Service</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{outOfService}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Standby reserve</div>
          </div>
        </div>
      </div>

      {/* Payload Tonnage Metric Bar */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500">Mineral Haulage Capacity: </span>
          <span className="font-bold text-slate-900">{activeCapacityTons} MT</span>
          <span className="text-slate-500"> / {totalCapacityTons} MT Total</span>
        </div>
        <div className="font-semibold text-blue-800">
          {totalCapacityTons > 0 ? Math.round((activeCapacityTons / totalCapacityTons) * 100) : 0}% Deployed
        </div>
      </div>
    </div>
  );
}

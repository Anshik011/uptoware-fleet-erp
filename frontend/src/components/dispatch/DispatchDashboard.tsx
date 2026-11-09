'use client';

import React from 'react';
import {
  Clock,
  Truck,
  Scale,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { DispatchMetrics } from '@/types/fleet';

interface DispatchDashboardProps {
  metrics: DispatchMetrics | null;
  isLoading: boolean;
}

export function DispatchDashboard({ metrics, isLoading }: DispatchDashboardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {/* 1. Pending Dispatches */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pending Dispatch
          </span>
          <div
            className="text-2xl font-bold text-amber-700 font-mono mt-0.5"
            data-testid="metric-pending-dispatches"
          >
            {isLoading ? '—' : metrics?.pendingDispatches ?? 0}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Awaiting Authorization</span>
        </div>
      </div>

      {/* 2. In Transit */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            In Transit
          </span>
          <div
            className="text-2xl font-bold text-blue-700 font-mono mt-0.5"
            data-testid="metric-dispatched-trips"
          >
            {isLoading ? '—' : metrics?.dispatchedTrips ?? 0}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Active on Road</span>
        </div>
      </div>

      {/* 3. Awaiting Weighbridge */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Awaiting Scale
          </span>
          <div
            className="text-2xl font-bold text-indigo-700 font-mono mt-0.5"
            data-testid="metric-awaiting-weighbridge"
          >
            {isLoading ? '—' : metrics?.awaitingWeighbridge ?? 0}
          </div>
          <span className="text-[11px] text-indigo-600 font-medium">Pending Weighment</span>
        </div>
      </div>

      {/* 4. Completed Deliveries */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Delivered
          </span>
          <div
            className="text-2xl font-bold text-emerald-700 font-mono mt-0.5"
            data-testid="metric-delivered-trips"
          >
            {isLoading ? '—' : metrics?.deliveredTrips ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Haul Completed</span>
        </div>
      </div>

      {/* 5. Fleet Availability */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5 col-span-2 md:col-span-1">
        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-900" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Fleet Ready
          </span>
          <div
            className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5"
            data-testid="metric-fleet-availability"
          >
            {isLoading
              ? '—'
              : `${metrics?.activeVehiclesAvailable ?? 0} Vehicles / ${metrics?.activeDriversAvailable ?? 0} Drivers`}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Available Assets</span>
        </div>
      </div>
    </div>
  );
}


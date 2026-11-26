'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ShieldAlert, Truck, RefreshCw, Compass, Package, UserCheck, Fuel, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface QuickActionsProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function QuickActions({ onRefresh, isLoading = false }: QuickActionsProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  const role = user?.role || '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Fleet Quick Actions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rapid operational controls and direct entry into asset management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Refresh Action */}
          <button
            type="button"
            data-testid="btn-refresh-metrics"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Metrics'}</span>
          </button>

          {/* User 2: Site Supervisor Actions */}
          {role === 'Site Supervisor User' && (
            <Link
              href="/trips?action=site_sup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>+ Site Supervisor Trip Entry</span>
            </Link>
          )}

          {/* User 3: Reconcile Incharge Actions */}
          {role === 'Reconcile Incharge User' && (
            <>
              <Link
                href="/trips?tab=reconcile_summary"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Reconcile Summary</span>
              </Link>
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Reconcile Trip Entry</span>
              </Link>
            </>
          )}

          {/* User 1: Maintenance & Stores Incharge Actions */}
          {role === 'Maintenance Stores User' && (
            <>
              <Link
                href="/purchases"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Spare Parts Entry</span>
              </Link>
              <Link
                href="/attendance"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Attendance Entry</span>
              </Link>
              <Link
                href="/fuel/average"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <Fuel className="w-3.5 h-3.5 text-amber-600" />
                <span>HSD Log</span>
              </Link>
              <Link
                href="/maintenance"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Workshop Maintenance</span>
              </Link>
            </>
          )}

          {/* Standard Full Roles (Administrator, Fleet Manager, Dispatcher, Workshop Supervisor, Accountant) */}
          {role !== 'Site Supervisor User' && role !== 'Reconcile Incharge User' && role !== 'Maintenance Stores User' && (
            <>
              <Link
                href="/vehicles?compliance=EXPIRING_SOON"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Document Warnings</span>
              </Link>

              <Link
                href="/vehicles?status=Active"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Active Haulers</span>
              </Link>

              <Link
                href="/vehicles?action=new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register Vehicle</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


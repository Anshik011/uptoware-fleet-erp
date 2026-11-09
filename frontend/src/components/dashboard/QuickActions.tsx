'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, ShieldAlert, Truck, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function QuickActions({ onRefresh, isLoading = false }: QuickActionsProps) {
  const router = useRouter();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

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

          {/* Compliance Filter Shortcut */}
          <Link
            href="/vehicles?compliance=EXPIRING_SOON"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Document Warnings</span>
          </Link>

          {/* Active Fleet View Shortcut */}
          <Link
            href="/vehicles?status=Active"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Haulers</span>
          </Link>

          {/* Primary Action: Add Vehicle */}
          <Link
            href="/vehicles?action=new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Vehicle</span>
          </Link>
        </div>
      </div>
    </div>
  );
}


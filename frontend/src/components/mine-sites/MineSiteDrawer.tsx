'use client';

import React, { useEffect, useState } from 'react';
import { MineSite, MiningTrip, CustomerOption, MineralType, MineSiteStatus } from '@/types/fleet';
import {
  X,
  Mountain,
  MapPin,
  Building2,
  Layers,
  Compass,
  Edit2,
  Calendar,
  Loader2,
  FileText,
  IndianRupee,
  CheckCircle2,
  Clock,
  Truck,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface MineSiteDrawerProps {
  siteId: string | null;
  onClose: () => void;
  onEditSite: (site: MineSite) => void;
  canManage: boolean;
}

export function MineSiteDrawer({
  siteId,
  onClose,
  onEditSite,
  canManage,
}: MineSiteDrawerProps) {
  const [site, setSite] = useState<MineSite | null>(null);
  const [trips, setTrips] = useState<MiningTrip[]>([]);
  const [clientDetails, setClientDetails] = useState<CustomerOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      return;
    }

    async function loadSiteDetails() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/mine-sites/${encodeURIComponent(siteId!)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch mine site profile');
        }
        setSite(json.data.site);
        setTrips(json.data.trips || []);
        setClientDetails(json.data.clientDetails || null);
      } catch (err: any) {
        console.error('Mine site drawer load error:', err);
        setError(err.message || 'Error loading mine site profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadSiteDetails();
  }, [siteId]);

  if (!siteId) return null;

  const getStatusBadge = (status: MineSiteStatus) => {
    switch (status) {
      case 'Operational':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        );
      case 'Inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
    }
  };

  const getTripStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered':
      case 'Approved':
        return 'positive';
      case 'In Progress':
      case 'Dispatched':
      case 'Weighbridge Confirmed':
        return 'info';
      case 'Draft':
        return 'warning';
      case 'Cancelled':
        return 'critical';
      default:
        return 'neutral';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {site?.siteName || siteId}
                </h2>
                {site && getStatusBadge(site.status)}
              </div>
              <p className="text-xs font-mono text-slate-500 font-medium">
                {siteId} {site?.isTestRecord ? '· [Test Record]' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            aria-label="Close mine site details drawer"
            data-testid="btn-close-drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <p className="text-xs text-slate-500">Retrieving operational mine site records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-semibold mb-1">Failed to load mine site profile</p>
              <p>{error}</p>
            </div>
          ) : site ? (
            <>
              {/* Operational Capacity Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    Daily Target
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {site.dailyTargetTonnage > 0
                      ? `${site.dailyTargetTonnage.toLocaleString()} MT`
                      : 'None'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Planned per day</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Loading Pits
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {site.activeLoadingPits} {site.activeLoadingPits === 1 ? 'Pit' : 'Pits'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Active loading bays</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Rate / Ton
                  </div>
                  <div className="text-base font-bold text-emerald-700">
                    {site.ratePerTon > 0 ? `₹${site.ratePerTon.toLocaleString()}` : '—'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Indicative haulage</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Total Hauled
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {(site.totalHauledTons || 0).toLocaleString()} MT
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{trips.length} logged runs</p>
                </div>
              </div>

              {/* Site Details Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-900" />
                  Site & Client Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] font-medium block mb-0.5">
                      Client / Customer
                    </label>
                    <div className="font-semibold text-slate-900">
                      {clientDetails
                        ? clientDetails.customerName
                        : site.clientName || site.client || 'Captive / Internal Operation'}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] font-medium block mb-0.5">
                      Mineral / Material Extracted
                    </label>
                    <div className="font-semibold text-slate-900">{site.mineralType}</div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-400 text-[11px] font-medium block mb-0.5">
                      Location & Access Notes
                    </label>
                    <div className="font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {site.location || 'No location or coordinates recorded.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Trip History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-900" />
                    Recent Mining Trips Dispatched ({trips.length})
                  </h3>
                </div>

                {trips.length === 0 ? (
                  <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <Compass className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No Dispatches Recorded</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No mining trips have been dispatched from this site yet.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Trip ID</th>
                            <th className="py-2 px-3">Vehicle</th>
                            <th className="py-2 px-3">Driver</th>
                            <th className="py-2 px-3 text-right">Net Wt</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {trips.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono font-medium text-blue-900">
                                {t.id}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                {t.vehicle}
                              </td>
                              <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">
                                {t.driverName || t.driver}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-900">
                                {t.netWeightTons} MT
                              </td>
                              <td className="py-2 px-3 text-right">
                                <Badge variant={getTripStatusVariant(t.status)} size="sm">
                                  {t.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-testid="btn-drawer-close"
          >
            Close
          </Button>

          {canManage && site && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEditSite(site);
              }}
              className="gap-2"
              data-testid="btn-drawer-edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Mine Site
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


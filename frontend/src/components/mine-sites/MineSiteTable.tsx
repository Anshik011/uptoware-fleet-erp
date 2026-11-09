'use client';

import React from 'react';
import { MineSite, MineralType, MineSiteStatus } from '@/types/fleet';
import {
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  Building2,
  Layers,
  TrendingUp,
  Edit2,
  ChevronRight,
  Mountain,
  IndianRupee,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface MineSiteTableProps {
  mineSites: MineSite[];
  onSelectSite: (id: string) => void;
  onEditSite: (site: MineSite) => void;
  onOpenAddSite: () => void;
  canManage: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedMineral: string;
  onMineralChange: (mineral: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function MineSiteTable({
  mineSites,
  onSelectSite,
  onEditSite,
  onOpenAddSite,
  canManage,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedMineral,
  onMineralChange,
  sortBy,
  onSortChange,
}: MineSiteTableProps) {
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

  const getMineralBadge = (mineral: MineralType) => {
    switch (mineral) {
      case 'Iron Ore':
        return (
          <Badge variant="warning" size="sm" className="font-medium">
            Iron Ore
          </Badge>
        );
      case 'Coal':
        return (
          <Badge variant="neutral" size="sm" className="font-medium">
            Coal
          </Badge>
        );
      case 'Bauxite':
        return (
          <Badge variant="warning" size="sm" className="font-medium">
            Bauxite
          </Badge>
        );
      case 'Limestone':
        return (
          <Badge variant="info" size="sm" className="font-medium">
            Limestone
          </Badge>
        );
      case 'Manganese':
        return (
          <Badge variant="neutral" size="sm" className="font-medium">
            Manganese
          </Badge>
        );
      case 'Overburden':
        return (
          <Badge variant="neutral" size="sm" className="font-medium">
            Overburden
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="font-medium">
            {mineral}
          </Badge>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search site by name, client, mineral, location..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="input-search-mine-site"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-filter-status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Operational">Operational Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Mineral Filter */}
          <div>
            <select
              value={selectedMineral}
              onChange={(e) => onMineralChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-filter-mineral"
            >
              <option value="ALL">All Minerals</option>
              <option value="Iron Ore">Iron Ore</option>
              <option value="Coal">Coal</option>
              <option value="Bauxite">Bauxite</option>
              <option value="Limestone">Limestone</option>
              <option value="Manganese">Manganese</option>
              <option value="Overburden">Overburden</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Sort & Quick Actions */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-sort-mine-sites"
            >
              <option value="name_asc">Site Name (A-Z)</option>
              <option value="name_desc">Site Name (Z-A)</option>
              <option value="target_desc">Daily Target (High to Low)</option>
              <option value="target_asc">Daily Target (Low to High)</option>
              <option value="pits_desc">Loading Pits (Most to Least)</option>
              <option value="rate_desc">Indicative Rate (High to Low)</option>
              <option value="trips_desc">Trips Hauled (Most to Least)</option>
            </select>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddSite}
              className="gap-2 shadow-xs whitespace-nowrap"
              data-testid="btn-add-mine-site"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Site</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto min-w-full">
        {mineSites.length === 0 ? (
          <div
            className="text-center py-16 px-4 bg-white"
            data-testid="empty-mine-sites-state"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Mountain className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              No Mine Sites Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery || selectedStatus !== 'ALL' || selectedMineral !== 'ALL'
                ? 'No mine sites match the selected filters. Clear filters or adjust your search query.'
                : 'No operational mine sites are currently registered in ERPNext.'}
            </p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAddSite}
                className="gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Register First Mine Site
              </Button>
            )}
          </div>
        ) : (
          <table
            className="w-full text-left border-collapse"
            data-testid="table-mine-sites"
          >
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                <th className="py-3.5 pl-6 pr-3 text-left">Mine Site & Location</th>
                <th className="py-3.5 px-3 text-left">Client / Customer</th>
                <th className="py-3.5 px-3 text-left">Mineral</th>
                <th className="py-3.5 px-3 text-left">Status</th>
                <th className="py-3.5 px-3 text-right">Daily Target</th>
                <th className="py-3.5 px-3 text-right">Loading Pits</th>
                <th className="py-3.5 px-3 text-right">Rate / Ton</th>
                <th className="py-3.5 px-3 text-right">Total Hauled</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {mineSites.map((site) => (
                <tr
                  key={site.id}
                  className="hover:bg-slate-50/75 transition-colors group cursor-pointer"
                  onClick={() => onSelectSite(site.id)}
                  data-testid={`row-mine-site-${site.id}`}
                >
                  {/* Site Name & Location */}
                  <td className="py-3.5 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Mountain className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {site.siteName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {site.location || 'Location unrecorded'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Client / Customer */}
                  <td className="py-3.5 px-3">
                    {site.client ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 truncate max-w-[160px]">
                          {site.clientName || site.client}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Captive / Internal</span>
                    )}
                  </td>

                  {/* Mineral Type */}
                  <td className="py-3.5 px-3">{getMineralBadge(site.mineralType)}</td>

                  {/* Status */}
                  <td className="py-3.5 px-3">{getStatusBadge(site.status)}</td>

                  {/* Daily Target */}
                  <td className="py-3.5 px-3 text-right font-medium text-slate-900 tabular-nums">
                    {site.dailyTargetTonnage > 0 ? (
                      <span>{site.dailyTargetTonnage.toLocaleString()} MT/day</span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>

                  {/* Loading Pits */}
                  <td className="py-3.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-800 tabular-nums">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {site.activeLoadingPits} {site.activeLoadingPits === 1 ? 'pit' : 'pits'}
                    </span>
                  </td>

                  {/* Rate / Ton */}
                  <td className="py-3.5 px-3 text-right font-medium text-slate-900 tabular-nums">
                    {site.ratePerTon > 0 ? (
                      <span className="text-emerald-700 font-semibold">
                        ₹{site.ratePerTon.toLocaleString()}/t
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Total Hauled */}
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    <div className="font-medium text-slate-900">
                      {(site.totalHauledTons || 0).toLocaleString()} MT
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {site.totalTrips || 0} {(site.totalTrips || 0) === 1 ? 'trip' : 'trips'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td
                    className="py-3.5 pl-3 pr-6 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onEditSite(site)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Mine Site"
                          data-testid={`btn-edit-site-${site.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectSite(site.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="View Site Details"
                        data-testid={`btn-view-site-${site.id}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{mineSites.length}</span>{' '}
          {mineSites.length === 1 ? 'mine site' : 'mine sites'}
        </div>
        <div className="text-[11px] text-slate-400">
          Integrated with Frappe Mine Site DocType & Trip Logs
        </div>
      </div>
    </div>
  );
}

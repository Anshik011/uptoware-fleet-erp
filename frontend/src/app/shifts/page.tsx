'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShiftAllocationModal } from '@/components/shifts/ShiftAllocationModal';
import { VehicleDriverShiftAllocation, ShiftTypeOption, ShiftAllocationStatus } from '@/types/fleet';
import {
  Clock,
  Calendar,
  Truck,
  User,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function ShiftsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Dispatcher', 'Administrator']);

  const [allocations, setAllocations] = useState<VehicleDriverShiftAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/shifts?limit=200&include_test=true');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch shift allocations.');
      }
      setAllocations(json.data || []);
    } catch (err: any) {
      console.error('Error loading shifts:', err);
      setError(err.message || 'Error fetching shifts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const handleUpdateStatus = async (allocId: string, newStatus: string) => {
    try {
      setActionLoading(allocId);
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const res = await fetch(`/api/shifts/${encodeURIComponent(allocId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          allocationEnd: newStatus === 'Completed' ? nowStr : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update shift status.');
      }

      await loadShifts();
    } catch (err: any) {
      alert(err.message || 'Error updating shift.');
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics
  const activeCount = allocations.filter((a) => a.status === 'Active').length;
  const scheduledCount = allocations.filter((a) => a.status === 'Scheduled').length;
  const completedCount = allocations.filter((a) => a.status === 'Completed').length;
  const uniqueVehicles = new Set(allocations.map((a) => a.vehicle)).size;

  // Filtered List
  const filteredAllocations = allocations.filter((alloc) => {
    if (statusFilter !== 'ALL' && alloc.status !== statusFilter) return false;
    if (shiftFilter !== 'ALL' && alloc.shiftType !== shiftFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchVehicle = (alloc.licensePlate || alloc.vehicle).toLowerCase().includes(q);
      const matchDriver = (alloc.driverName || alloc.driver).toLowerCase().includes(q);
      const matchRemarks = alloc.remarks?.toLowerCase().includes(q) || false;
      if (!matchVehicle && !matchDriver && !matchRemarks) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="positive" size="sm">Active Shift</Badge>;
      case 'Scheduled':
        return <Badge variant="info" size="sm">Scheduled</Badge>;
      case 'Completed':
        return <Badge variant="neutral" size="sm">Completed</Badge>;
      case 'Cancelled':
      default:
        return <Badge variant="critical" size="sm">Cancelled</Badge>;
    }
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Shift Allocations & Multi-Driver Scheduling"
          subtitle="Manage multiple drivers assigned to transport vehicles across shifts, prevent overlapping conflict assignments, and track driver-asset continuity."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={loadShifts}
                disabled={isLoading}
              >
                Refresh
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsModalOpen(true)}
                >
                  Allocate Shift
                </Button>
              )}
            </div>
          }
        />

        {/* Operational Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Active Shifts</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Currently operating on road</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Scheduled Shifts</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{scheduledCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Upcoming planned allocations</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Assigned Vehicles</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{uniqueVehicles}</div>
            <p className="text-[11px] text-slate-400 mt-1">Vehicles with scheduled shifts</p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Completed Shifts</span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{completedCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Concluded driver rosters</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vehicle, driver or notes..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {/* Shift Filter */}
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
            >
              <option value="ALL">All Shift Types</option>
              <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
              <option value="Afternoon (14:00 - 22:00)">Afternoon (14:00 - 22:00)</option>
              <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
              <option value="General / Full Day">General / Full Day</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredAllocations.length} of {allocations.length} allocations
          </div>
        </div>

        {/* Content Table */}
        {isLoading ? (
          <div className="p-12 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
            <p className="text-xs text-slate-500">Loading shift allocations and conflict matrix...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-12 rounded-xl border border-dashed border-slate-300 bg-white shadow-sm text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No shift allocations found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || shiftFilter !== 'ALL'
                ? 'Try adjusting your filters or search terms.'
                : 'Click "+ Allocate Shift" to assign a driver to a vehicle for upcoming shifts.'}
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Allocated Driver</th>
                    <th className="py-3 px-4">Shift Slot</th>
                    <th className="py-3 px-4">Schedule Timeline</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-900 shrink-0" />
                          <span>{alloc.licensePlate || alloc.vehicle}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {alloc.vehicle}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{alloc.driverName || alloc.driver}</span>
                          {alloc.isPrimary && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-800 font-semibold rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {alloc.driver}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{alloc.shiftType}</span>
                        </div>
                        {alloc.remarks && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                            {alloc.remarks}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <div>Start: {alloc.allocationStart?.slice(0, 16) || '—'}</div>
                        {alloc.allocationEnd && (
                          <div className="text-slate-400 text-[10px]">
                            End: {alloc.allocationEnd.slice(0, 16)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(alloc.status)}</td>

                      <td className="py-3 px-4 text-right">
                        {canManage && (alloc.status === 'Active' || alloc.status === 'Scheduled') && (
                          <div className="flex items-center justify-end gap-1.5">
                            {alloc.status === 'Scheduled' && (
                              <button
                                type="button"
                                disabled={actionLoading === alloc.id}
                                onClick={() => handleUpdateStatus(alloc.id, 'Active')}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-[11px] font-medium transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={actionLoading === alloc.id}
                              onClick={() => handleUpdateStatus(alloc.id, 'Completed')}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[11px] font-medium transition-colors"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === alloc.id}
                              onClick={() => handleUpdateStatus(alloc.id, 'Cancelled')}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        <ShiftAllocationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadShifts}
        />
      </PageContainer>
    </AppShell>
  );
}

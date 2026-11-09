import React from 'react';
import { MiningTrip } from '@/types/fleet';
import { Truck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface RecentTripsTableProps {
  trips: MiningTrip[];
}

export function RecentTripsTable({ trips }: RecentTripsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Dispatched':
      case 'Weighbridge Confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Mining Dispatches & Deliveries
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of mineral transit, weighbridge loads and trip completions
          </p>
        </div>
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
        >
          <span>View Fleet Vehicles</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="px-6 py-3.5 text-left">Trip ID</th>
              <th scope="col" className="px-6 py-3.5 text-left">Vehicle Plate</th>
              <th scope="col" className="px-6 py-3.5 text-left">Mine Route & Material</th>
              <th scope="col" className="px-6 py-3.5 text-right">Net Weight</th>
              <th scope="col" className="px-6 py-3.5 text-right">Dispatch Time</th>
              <th scope="col" className="px-6 py-3.5 text-right">Operational Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                  No active or completed mining trips recorded.
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 text-left">
                    {trip.id}
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 tracking-wide font-mono">
                        {trip.vehicle}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="font-medium text-slate-900">
                      {trip.mineSite} → {trip.destination}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {trip.materialType}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {trip.netWeightTons ? `${trip.netWeightTons} MT` : '32 MT'}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 font-mono">
                    {formatDate(trip.dispatchDateTime)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(
                        trip.status
                      )}`}
                    >
                      {trip.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


import React from 'react';
import { IndianRupee, TrendingUp, Fuel, Wrench } from 'lucide-react';

interface FinancialSummaryCardProps {
  totalRevenue: number;
  totalOperatingCost: number;
  fuelCost: number;
  maintenanceCost: number;
  netOperatingIncome: number;
  completedTrips: number;
}

export function FinancialSummaryCard({
  totalRevenue,
  totalOperatingCost,
  fuelCost,
  maintenanceCost,
  netOperatingIncome,
  completedTrips,
}: FinancialSummaryCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const marginPercent = totalRevenue > 0 ? Math.round((netOperatingIncome / totalRevenue) * 100) : 0;
  const avgCostPerTrip = completedTrips > 0 ? Math.round(totalOperatingCost / completedTrips) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Fleet Commercial Performance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating revenues vs total fuel and workshop disbursements
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{marginPercent}% Margin</span>
          </div>
        </div>

        {/* Primary Financial Metric Split */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Billed Revenue
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Commercial Mining Invoices
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Total Operating Cost
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalOperatingCost)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Fuel, Repairs & Compliance
            </div>
          </div>
        </div>

        {/* Breakdown Cost Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <Fuel className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Direct Fuel Consumption</span>
            </div>
            <span className="font-semibold text-slate-900">
              {formatCurrency(fuelCost)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Workshop & Maintenance Spares</span>
            </div>
            <span className="font-semibold text-slate-900">
              {formatCurrency(maintenanceCost)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <IndianRupee className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Net Operating Contribution</span>
            </div>
            <span className="font-bold text-emerald-700">
              {formatCurrency(netOperatingIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Average Unit Cost Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500">Average Operational Cost / Delivered Trip</span>
        <span className="font-bold text-slate-900">{formatCurrency(avgCostPerTrip)}</span>
      </div>
    </div>
  );
}


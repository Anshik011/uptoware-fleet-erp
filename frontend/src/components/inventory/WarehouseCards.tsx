import React from 'react';
import { Warehouse } from '@/types/fleet';
import { Warehouse as WarehouseIcon, IndianRupee, Layers } from 'lucide-react';

interface WarehouseCardsProps {
  warehouses: Warehouse[];
  selectedWarehouse: string;
  onSelectWarehouse: (w: string) => void;
  isLoading?: boolean;
}

export function WarehouseCards({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  isLoading = false,
}: WarehouseCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm animate-pulse h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {warehouses.map((wh) => {
        const isSelected = selectedWarehouse === wh.id;
        return (
          <div
            key={wh.id}
            onClick={() => onSelectWarehouse(isSelected ? 'ALL' : wh.id)}
            className={`cursor-pointer bg-white rounded-lg border transition-all p-6 shadow-sm flex flex-col justify-between ${
              isSelected
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300 hover:shadow'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <WarehouseIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{wh.warehouseName}</h4>
                  <p className="text-xs text-slate-500 font-mono">{wh.name}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1" /> Items Stored
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {wh.totalItems.toLocaleString()} items
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 flex items-center justify-end">
                  <IndianRupee className="w-3.5 h-3.5 mr-0.5" /> Stock Value
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
                  ₹{wh.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


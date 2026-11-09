'use client';

import React from 'react';
import { formatCurrency } from '@/config/branding';
import {
  IndianRupee,
  CreditCard,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Fuel,
  Wrench,
  Receipt,
  Scale,
} from 'lucide-react';

interface FinancialKpiCardsProps {
  totalRevenue: number;
  totalCollections: number;
  outstandingReceivables: number;
  totalOperatingCost: number;
  netOperatingIncome: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  operationalExpenses: number;
  operatingMarginPct: number;
  collectionEfficiencyPct: number;
}

export function FinancialKpiCards({
  totalRevenue,
  totalCollections,
  outstandingReceivables,
  totalOperatingCost,
  netOperatingIncome,
  fuelExpenses,
  maintenanceExpenses,
  operationalExpenses,
  operatingMarginPct,
  collectionEfficiencyPct,
}: FinancialKpiCardsProps) {
  const isNetPositive = netOperatingIncome >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Invoiced Revenue */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced Revenue</span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Submitted Invoices</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Net of Returns
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Collections */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Collections</span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalCollections)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Realized Liquidity</span>
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {collectionEfficiencyPct}% Efficiency
            </span>
          </div>
        </div>
      </div>

      {/* 3. Outstanding Receivables */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Receivables</span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(outstandingReceivables)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Credit Exposure</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
              Commercial Debtors
            </span>
          </div>
        </div>
      </div>

      {/* 4. Net Operating Income */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Net Operating Income</span>
          <div className={`p-2 rounded-lg ${isNetPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {isNetPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold tracking-tight ${isNetPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
            {isNetPositive ? formatCurrency(netOperatingIncome) : `-${formatCurrency(Math.abs(netOperatingIncome))}`}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Revenue - Operating Cost</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${isNetPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
              {operatingMarginPct}% Margin
            </span>
          </div>
        </div>
      </div>

      {/* 5. Total Operating Cost */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-600 mb-1">
          <span className="text-xs font-medium">Total Operating Cost</span>
          <Scale className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-lg font-bold text-slate-900">
          {formatCurrency(totalOperatingCost)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Operational analysis (Non-GL)</div>
      </div>

      {/* 6. Fuel Expenses */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-600 mb-1">
          <span className="text-xs font-medium">Fuel Expenses</span>
          <Fuel className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-lg font-bold text-slate-900">
          {formatCurrency(fuelExpenses)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Approved fuel logs only</div>
      </div>

      {/* 7. Maintenance Expenses */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-600 mb-1">
          <span className="text-xs font-medium">Maintenance Expenses</span>
          <Wrench className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-lg font-bold text-slate-900">
          {formatCurrency(maintenanceExpenses)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Parts & workshop labour</div>
      </div>

      {/* 8. Operational Expenses */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-600 mb-1">
          <span className="text-xs font-medium">Approved OpEx (Pre-GL)</span>
          <Receipt className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-lg font-bold text-slate-900">
          {formatCurrency(operationalExpenses)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Weighbridge, tolls & permits</div>
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMine } from '@/context/MineContext';
import {
  exportReportToCSV,
  exportReportToExcel,
  exportReportToPDF,
  formatReportCell,
  isNumericColumn,
  ReportColumnDef,
} from '@/lib/reportExport';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Truck,
  Compass,
  Fuel,
  Users,
  IndianRupee,
  Package,
  ShieldCheck,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export type ReportCategoryId =
  | 'operations'
  | 'fuel'
  | 'hr'
  | 'finance'
  | 'procurement'
  | 'compliance';

export interface UnifiedReportDef {
  id: string;
  name: string;
  category: ReportCategoryId;
  desc: string;
  sourceType: 'finance' | 'procurement' | 'compliance' | 'api';
  apiReportName?: string;
  apiEndpoint?: string;
  originalHref: string;
}

export const REPORT_CATEGORIES: { id: ReportCategoryId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'operations', label: 'Operations & Fleet', icon: Compass },
  { id: 'fuel', label: 'Fuel & HSD', icon: Fuel },
  { id: 'hr', label: 'HR & Attendance', icon: Users },
  { id: 'finance', label: 'Finance & Income', icon: IndianRupee },
  { id: 'procurement', label: 'Spare Parts & Stock', icon: Package },
  { id: 'compliance', label: 'Compliance & Insurance', icon: ShieldCheck },
];

export const UNIFIED_REPORTS: UnifiedReportDef[] = [
  // Operations & Fleet
  {
    id: 'trip-report',
    name: 'Trip Report (Haulage & Dispatch)',
    category: 'operations',
    desc: 'All logged trips with date, shift, vehicle, route/lead, trips count, average tonnage, quantity, rate, and status.',
    sourceType: 'api',
    apiEndpoint: '/api/trips',
    originalHref: '/trips?view=report',
  },
  {
    id: 'vehicle-report',
    name: 'Vehicle Master Report',
    category: 'operations',
    desc: 'Complete fleet register with vehicle type, transport class, assigned driver, capacity, fuel type, status, and compliance health.',
    sourceType: 'api',
    apiEndpoint: '/api/vehicles',
    originalHref: '/vehicles?view=report',
  },
  {
    id: 'lead-report',
    name: 'Lead & Route Rate Report',
    category: 'operations',
    desc: 'Contracted haulage routes with distance (KM), rate per ton, validity dates, and mine site mapping.',
    sourceType: 'api',
    apiEndpoint: '/api/leads',
    originalHref: '/leads?tab=report',
  },
  {
    id: 'breakdown-report',
    name: 'Breakdown Incidents Report',
    category: 'operations',
    desc: 'Vehicle breakdown logs, severity, downtime hours, repair costs, and resolution status.',
    sourceType: 'api',
    apiEndpoint: '/api/breakdowns',
    originalHref: '/breakdowns',
  },
  {
    id: 'expenses-report',
    name: 'Operating Expenses Report',
    category: 'api' === 'api' ? 'operations' : 'operations',
    desc: 'Direct operational expenses by vehicle, category, payment mode, amount, and approval status.',
    sourceType: 'api',
    apiEndpoint: '/api/expenses',
    originalHref: '/expenses',
  },

  // Fuel & HSD
  {
    id: 'hsd-fuel-logs',
    name: 'HSD Fuel Dispensation & Average Report',
    category: 'fuel',
    desc: 'Fuel issuance logs by vehicle, driver, litres, rate per litre, total cost, odometer, and KM/L efficiency.',
    sourceType: 'api',
    apiEndpoint: '/api/fuel',
    originalHref: '/fuel/average',
  },
  {
    id: 'hsd-escalation-report',
    name: 'HSD Escalation / De-Escalation Report',
    category: 'fuel',
    desc: 'HSD benchmark price escalation and de-escalation tracking against contract baseline rates.',
    sourceType: 'finance',
    apiReportName: 'HSD Fuel Price Escalation Report',
    originalHref: '/reports?report=HSD+Fuel+Price+Escalation+Report',
  },

  // HR & Attendance
  {
    id: 'employee-directory-report',
    name: 'Employee Master Directory Report',
    category: 'hr',
    desc: 'All active and exited employees, designations, departments, assigned vehicles, daily wage rates, and contact info.',
    sourceType: 'api',
    apiEndpoint: '/api/employees',
    originalHref: '/employees?tab=directory',
  },
  {
    id: 'attendance-summary-report',
    name: 'Employee Attendance & Payroll Summary',
    category: 'hr',
    desc: 'Monthly attendance summary with present days, half days, leave days, daily rate, and payable salary.',
    sourceType: 'api',
    apiEndpoint: '/api/attendance/summary',
    originalHref: '/employees?tab=summary',
  },
  {
    id: 'attendance-shift-report',
    name: 'Employee Attendance Shift Roster Report',
    category: 'hr',
    desc: 'Authoritative shift-wise attendance and payroll summary from the ERP analytics engine.',
    sourceType: 'finance',
    apiReportName: 'Employee Attendance Summary Report',
    originalHref: '/employees?tab=roster',
  },

  // Finance & Income
  {
    id: 'vehicle-earning-summary',
    name: 'Vehicle Earning Summary Report (Income)',
    category: 'finance',
    desc: 'Vehicle-wise revenue, HSD fuel consumption, repair costs, and net operating profit.',
    sourceType: 'finance',
    apiReportName: 'Vehicle Earning Summary Report',
    originalHref: '/reports?report=Vehicle+Earning+Summary+Report',
  },
  {
    id: 'vehicle-wise-profitability',
    name: 'Vehicle-wise Revenue and Profitability',
    category: 'finance',
    desc: 'Asset P&L: Invoiced revenue, fuel, parts, labour, OpEx, and net margin.',
    sourceType: 'finance',
    apiReportName: 'Vehicle-wise Revenue and Profitability',
    originalHref: '/reports?report=Vehicle-wise+Revenue+and+Profitability',
  },
  {
    id: 'trip-wise-profitability',
    name: 'Trip-wise Revenue and Profitability',
    category: 'finance',
    desc: 'Trip haulage contribution: Indicative vs invoiced revenue and direct costs.',
    sourceType: 'finance',
    apiReportName: 'Trip-wise Revenue and Profitability',
    originalHref: '/reports?report=Trip-wise+Revenue+and+Profitability',
  },
  {
    id: 'mine-site-profitability',
    name: 'Mine Site-wise Revenue and Profitability',
    category: 'finance',
    desc: 'Site-level P&L: Delivered tons, invoiced billing, and operating costs.',
    sourceType: 'finance',
    apiReportName: 'Mine Site-wise Revenue and Profitability',
    originalHref: '/reports?report=Mine+Site-wise+Revenue+and+Profitability',
  },
  {
    id: 'customer-wise-revenue',
    name: 'Customer-wise Revenue',
    category: 'finance',
    desc: 'Customer billing ledger: Invoiced amounts, credit notes, collections, and receivables.',
    sourceType: 'finance',
    apiReportName: 'Customer-wise Revenue',
    originalHref: '/reports?report=Customer-wise+Revenue',
  },
  {
    id: 'monthly-revenue-summary',
    name: 'Monthly Revenue Summary',
    category: 'finance',
    desc: 'Monthly financial trajectory: Invoicing, collections, and realization rates.',
    sourceType: 'finance',
    apiReportName: 'Monthly Revenue Summary',
    originalHref: '/reports?report=Monthly+Revenue+Summary',
  },
  {
    id: 'daily-fleet-income-expense',
    name: 'Daily Fleet Income and Expense Summary',
    category: 'finance',
    desc: 'Daily net operating contribution: Haulage revenue minus fuel, repair, and OpEx costs.',
    sourceType: 'finance',
    apiReportName: 'Daily Fleet Income and Expense Summary',
    originalHref: '/reports?report=Daily+Fleet+Income+and+Expense+Summary',
  },
  {
    id: 'monthly-fleet-income-expense',
    name: 'Monthly Fleet Income and Expense Summary',
    category: 'finance',
    desc: 'Monthly executive P&L: Completed trips, billed tonnage, and revenue vs outflow margins.',
    sourceType: 'finance',
    apiReportName: 'Monthly Fleet Income and Expense Summary',
    originalHref: '/reports?report=Monthly+Fleet+Income+and+Expense+Summary',
  },
  {
    id: 'operating-cost-summary',
    name: 'Operating Cost Summary',
    category: 'finance',
    desc: 'Fleet cost streams: Fuel, maintenance, direct OpEx, and overheads.',
    sourceType: 'finance',
    apiReportName: 'Operating Cost Summary',
    originalHref: '/reports?report=Operating+Cost+Summary',
  },
  {
    id: 'vehicle-operating-cost',
    name: 'Vehicle Operating Cost Analysis',
    category: 'finance',
    desc: 'Per-vehicle cost breakdown: Parts, labour, fuel, OpEx, and cost per KM.',
    sourceType: 'finance',
    apiReportName: 'Vehicle Operating Cost Analysis',
    originalHref: '/reports?report=Vehicle+Operating+Cost+Analysis',
  },
  {
    id: 'revenue-vs-cost',
    name: 'Revenue vs Cost Analysis',
    category: 'finance',
    desc: 'Comparative P&L across assets: Revenue vs total cost & margin ratios.',
    sourceType: 'finance',
    apiReportName: 'Revenue vs Cost Analysis',
    originalHref: '/reports?report=Revenue+vs+Cost+Analysis',
  },
  {
    id: 'fleet-lead-haulage',
    name: 'Fleet Lead Haulage Report',
    category: 'finance',
    desc: 'Lead route performance: Tonnage, contract rates, trip counts, and earned freight.',
    sourceType: 'finance',
    apiReportName: 'Fleet Lead Haulage Report',
    originalHref: '/reports?report=Fleet+Lead+Haulage+Report',
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable & Outstanding Revenue',
    category: 'finance',
    desc: 'Authoritative trade receivables ledger with aging buckets.',
    sourceType: 'finance',
    apiReportName: 'Accounts Receivable',
    originalHref: '/reports?report=Accounts+Receivable',
  },
  {
    id: 'gross-profit',
    name: 'Gross Profit Analysis',
    category: 'finance',
    desc: 'Authoritative gross profit analysis on submitted commercial invoices.',
    sourceType: 'finance',
    apiReportName: 'Gross Profit',
    originalHref: '/reports?report=Gross+Profit',
  },

  // Spare Parts & Stock
  {
    id: 'spare-parts-stock-register',
    name: 'Spare Parts Stock Register',
    category: 'procurement',
    desc: 'Current inventory quantities, valuation, and warehouse distribution across spare parts.',
    sourceType: 'procurement',
    apiReportName: 'Spare Parts Stock Register',
    originalHref: '/spare-parts',
  },
  {
    id: 'stock-movement-history',
    name: 'Stock Movement History',
    category: 'procurement',
    desc: 'Complete audit trail of stock receipts, issues, transfers, and adjustments.',
    sourceType: 'procurement',
    apiReportName: 'Stock Movement History',
    originalHref: '/stock-movements',
  },
  {
    id: 'low-stock-reorder',
    name: 'Low Stock / Reorder Report',
    category: 'procurement',
    desc: 'Items below safety reorder level requiring urgent procurement.',
    sourceType: 'procurement',
    apiReportName: 'Low Stock / Reorder Report',
    originalHref: '/spare-parts',
  },
  {
    id: 'parts-consumption-vehicle',
    name: 'Spare Parts Consumption by Vehicle',
    category: 'procurement',
    desc: 'Vehicle-wise spare parts issued and total parts cost.',
    sourceType: 'procurement',
    apiReportName: 'Spare Parts Consumption by Vehicle',
    originalHref: '/procurement/reports',
  },
  {
    id: 'purchase-order-register',
    name: 'Purchase Order Register',
    category: 'procurement',
    desc: 'All spare part purchase orders with supplier, value, and fulfillment status.',
    sourceType: 'procurement',
    apiReportName: 'Purchase Order Register',
    originalHref: '/purchases?view=report',
  },
  {
    id: 'purchase-invoice-register',
    name: 'Purchase Invoice Register',
    category: 'procurement',
    desc: 'Billed spare part purchases and tax breakdown.',
    sourceType: 'procurement',
    apiReportName: 'Purchase Invoice Register',
    originalHref: '/purchases?view=report',
  },
  {
    id: 'supplier-register',
    name: 'Supplier / Vendor Report',
    category: 'procurement',
    desc: 'Registered spare parts vendors, contacts, and payment terms.',
    sourceType: 'procurement',
    apiReportName: 'Supplier Register',
    originalHref: '/suppliers',
  },
  {
    id: 'supplier-payables',
    name: 'Supplier Outstanding / Payables',
    category: 'procurement',
    desc: 'Pending vendor payables and invoice aging.',
    sourceType: 'procurement',
    apiReportName: 'Supplier Outstanding / Payables',
    originalHref: '/procurement/reports',
  },

  // Compliance & Insurance
  {
    id: 'vehicle-insurance-register',
    name: 'Vehicle Insurance Register',
    category: 'compliance',
    desc: 'Active and historical vehicle insurance policies, insurers, premiums, and validity.',
    sourceType: 'compliance',
    apiReportName: 'Vehicle Insurance Register',
    originalHref: '/insurance',
  },
  {
    id: 'insurance-expiry-report',
    name: 'Insurance Expiry Report',
    category: 'compliance',
    desc: 'Vehicles with expiring or expired insurance policies.',
    sourceType: 'compliance',
    apiReportName: 'Insurance Expiry Report',
    originalHref: '/compliance/reports',
  },
  {
    id: 'document-expiry-report',
    name: 'Vehicle Document Expiry Report (RC/Fitness/PUC/Permit)',
    category: 'compliance',
    desc: 'Statutory compliance dates for Fitness, PUC, Road Tax, and Permits.',
    sourceType: 'compliance',
    apiReportName: 'Vehicle Document Expiry Report',
    originalHref: '/compliance/reports',
  },
  {
    id: 'upcoming-renewals',
    name: 'Upcoming Renewals',
    category: 'compliance',
    desc: 'Statutory documents and policies due for renewal within 30 days.',
    sourceType: 'compliance',
    apiReportName: 'Upcoming Renewals',
    originalHref: '/compliance/reports',
  },
  {
    id: 'expired-docs',
    name: 'Expired Insurance & Documents',
    category: 'compliance',
    desc: 'Critical non-compliant vehicles with expired statutory coverage.',
    sourceType: 'compliance',
    apiReportName: 'Expired Insurance & Documents',
    originalHref: '/compliance/reports',
  },
];

function extractDateOnly(val: any): string {
  if (!val) return '';
  const str = String(val);
  const match = str.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizeOperationalReport(
  reportId: string,
  payload: any
): { columns: ReportColumnDef[]; rows: Record<string, any>[] } {
  if (reportId === 'trip-report') {
    const list: any[] = payload.trips || payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Trip ID', fieldtype: 'Data' },
      { fieldname: 'date', label: 'Date', fieldtype: 'Date' },
      { fieldname: 'shift', label: 'Shift', fieldtype: 'Data' },
      { fieldname: 'vehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'driver', label: 'Driver / Operator', fieldtype: 'Data' },
      { fieldname: 'route', label: 'Route / Lead', fieldtype: 'Data' },
      { fieldname: 'tripCount', label: 'Trips', fieldtype: 'Int' },
      { fieldname: 'avgTonnage', label: 'Avg (MT)', fieldtype: 'Float' },
      { fieldname: 'quantity', label: 'Qty (MT)', fieldtype: 'Float' },
      { fieldname: 'rate', label: 'Rate/Ton', fieldtype: 'Currency' },
      { fieldname: 'amount', label: 'Amount', fieldtype: 'Currency' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((t) => ({
      id: t.id,
      date: extractDateOnly(t.dispatchDateTime),
      shift: t.shift || '—',
      vehicle: t.vehicle,
      driver: t.driverName || t.driver || '—',
      route: t.lead || t.destination || '—',
      tripCount: Number(t.tripCount || 1),
      avgTonnage: Number(t.averageTonnage || 0),
      quantity: Number(t.calculatedQuantity || t.netWeightTons || 0),
      rate: Number(t.leadRate || t.ratePerTon || 0),
      amount: Number(t.calculatedAmount || t.grossRevenue || 0),
      status: t.tripStatus || t.workflowState || t.status || '—',
      mineSite: t.mineSiteName || t.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'vehicle-report') {
    const list: any[] = payload.vehicles || payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'licensePlate', label: 'Vehicle No', fieldtype: 'Data' },
      { fieldname: 'vehicleType', label: 'Type', fieldtype: 'Data' },
      { fieldname: 'transportType', label: 'Class', fieldtype: 'Data' },
      { fieldname: 'makeModel', label: 'Make / Model', fieldtype: 'Data' },
      { fieldname: 'driver', label: 'Assigned Driver', fieldtype: 'Data' },
      { fieldname: 'capacity', label: 'Capacity (T)', fieldtype: 'Float' },
      { fieldname: 'fuelType', label: 'Fuel', fieldtype: 'Data' },
      { fieldname: 'compliance', label: 'Compliance', fieldtype: 'Data' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((v) => ({
      licensePlate: v.licensePlate || v.name || v.id,
      vehicleType: v.vehicleType || '—',
      transportType: v.customTransportType || 'Transport',
      makeModel: [v.make, v.model].filter(Boolean).join(' ') || '—',
      driver: v.assignedDriverName || v.assignedDriverId || 'Unassigned',
      capacity: Number(v.payloadCapacityTons || 0),
      fuelType: v.fuelType || 'Diesel',
      compliance: v.statutory?.overall || '—',
      status: v.status || '—',
      mineSite: v.customMineSite || v.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'lead-report') {
    const list: any[] = payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Lead ID', fieldtype: 'Data' },
      { fieldname: 'leadName', label: 'Route / Lead Name', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
      { fieldname: 'leadKm', label: 'Distance (KM)', fieldtype: 'Float' },
      { fieldname: 'leadRate', label: 'Rate / Ton', fieldtype: 'Currency' },
      { fieldname: 'validFrom', label: 'Valid From', fieldtype: 'Date' },
      { fieldname: 'validTo', label: 'Valid To', fieldtype: 'Date' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
    ];
    const rows = list.map((l) => ({
      id: l.id,
      leadName: l.leadName,
      mineSite: l.mineSite || '—',
      leadKm: Number(l.leadKm || 0),
      leadRate: Number(l.leadRate || 0),
      validFrom: extractDateOnly(l.validFrom),
      validTo: extractDateOnly(l.validTo),
      status: l.isActive ? 'Active' : 'Inactive',
    }));
    return { columns, rows };
  }

  if (reportId === 'breakdown-report') {
    const list: any[] = payload.breakdowns || payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Incident ID', fieldtype: 'Data' },
      { fieldname: 'date', label: 'Date', fieldtype: 'Date' },
      { fieldname: 'vehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'driver', label: 'Driver', fieldtype: 'Data' },
      { fieldname: 'category', label: 'Category', fieldtype: 'Data' },
      { fieldname: 'severity', label: 'Severity', fieldtype: 'Data' },
      { fieldname: 'downtimeHours', label: 'Downtime (Hrs)', fieldtype: 'Float' },
      { fieldname: 'totalCost', label: 'Total Cost', fieldtype: 'Currency' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((b) => ({
      id: b.id,
      date: extractDateOnly(b.reportedDateTime || b.breakdownDate),
      vehicle: b.vehicle || '—',
      driver: b.driverName || b.driver || '—',
      category: b.category || b.issueCategory || '—',
      severity: b.severity || '—',
      downtimeHours: Number(b.downtimeHours || 0),
      totalCost: Number(b.totalCost || b.estimatedCost || 0),
      status: b.status || b.workflowState || '—',
      mineSite: b.mineSiteName || b.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'expenses-report') {
    const list: any[] = payload.expenses || payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Expense ID', fieldtype: 'Data' },
      { fieldname: 'date', label: 'Date', fieldtype: 'Date' },
      { fieldname: 'vehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'category', label: 'Category', fieldtype: 'Data' },
      { fieldname: 'description', label: 'Description', fieldtype: 'Data' },
      { fieldname: 'paymentMethod', label: 'Payment Mode', fieldtype: 'Data' },
      { fieldname: 'amount', label: 'Amount', fieldtype: 'Currency' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((e) => ({
      id: e.id,
      date: extractDateOnly(e.expenseDate),
      vehicle: e.vehicle || 'General',
      category: e.expenseCategory || e.category || '—',
      description: e.description || e.remarks || '—',
      paymentMethod: e.paymentMethod || '—',
      amount: Number(e.amount || 0),
      status: e.approvalStatus || e.status || '—',
      mineSite: e.mineSiteName || e.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'hsd-fuel-logs') {
    const list: any[] = payload.logs || payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Log ID', fieldtype: 'Data' },
      { fieldname: 'date', label: 'Fuel Date', fieldtype: 'Date' },
      { fieldname: 'vehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'driver', label: 'Driver', fieldtype: 'Data' },
      { fieldname: 'source', label: 'Fuel Source', fieldtype: 'Data' },
      { fieldname: 'quantityLitres', label: 'Qty (LT)', fieldtype: 'Float' },
      { fieldname: 'ratePerLitre', label: 'Rate / LT', fieldtype: 'Currency' },
      { fieldname: 'totalCost', label: 'Total Cost', fieldtype: 'Currency' },
      { fieldname: 'odometerReading', label: 'Odometer', fieldtype: 'Int' },
      { fieldname: 'kmPerLitre', label: 'KM/L', fieldtype: 'Float' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((f) => ({
      id: f.id,
      date: extractDateOnly(f.fuelDate),
      vehicle: f.vehicle,
      driver: f.driverName || f.driver || '—',
      source: f.fuelSource || '—',
      quantityLitres: Number(f.quantityLitres || 0),
      ratePerLitre: Number(f.ratePerLitre || 0),
      totalCost: Number(f.totalCost || 0),
      odometerReading: Number(f.odometerReading || 0),
      kmPerLitre: Number(f.kmPerLitre || 0),
      status: f.approvalStatus || f.workflowState || '—',
      mineSite: f.mineSiteName || f.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'employee-directory-report') {
    const list: any[] = payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'id', label: 'Emp ID', fieldtype: 'Data' },
      { fieldname: 'employeeName', label: 'Employee Name', fieldtype: 'Data' },
      { fieldname: 'designation', label: 'Designation', fieldtype: 'Data' },
      { fieldname: 'department', label: 'Department', fieldtype: 'Data' },
      { fieldname: 'assignedVehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'cellNumber', label: 'Phone', fieldtype: 'Data' },
      { fieldname: 'dailySalary', label: 'Rate / Day', fieldtype: 'Currency' },
      { fieldname: 'dateOfJoining', label: 'DOJ', fieldtype: 'Date' },
      { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((e) => ({
      id: e.id,
      employeeName: e.employeeName,
      designation: e.designation || '—',
      department: e.department || '—',
      assignedVehicle: e.assignedVehicle || '—',
      cellNumber: e.cellNumber || '—',
      dailySalary: Number(e.dailySalary || 0),
      dateOfJoining: extractDateOnly(e.dateOfJoining),
      status: e.status || '—',
      mineSite: e.customMineSite || e.mineSite || '—',
    }));
    return { columns, rows };
  }

  if (reportId === 'attendance-summary-report') {
    const list: any[] = payload.data || [];
    const columns: ReportColumnDef[] = [
      { fieldname: 'employee', label: 'Emp ID', fieldtype: 'Data' },
      { fieldname: 'employeeName', label: 'Employee Name', fieldtype: 'Data' },
      { fieldname: 'designation', label: 'Designation', fieldtype: 'Data' },
      { fieldname: 'assignedVehicle', label: 'Vehicle', fieldtype: 'Data' },
      { fieldname: 'presentDays', label: 'Present Days', fieldtype: 'Float' },
      { fieldname: 'halfDays', label: 'Half Days', fieldtype: 'Float' },
      { fieldname: 'leaveDays', label: 'Leaves', fieldtype: 'Float' },
      { fieldname: 'dailySalaryRate', label: 'Rate / Day', fieldtype: 'Currency' },
      { fieldname: 'totalCalculatedSalary', label: 'Payable Salary', fieldtype: 'Currency' },
      { fieldname: 'mineSite', label: 'Mine Site', fieldtype: 'Data' },
    ];
    const rows = list.map((a) => ({
      employee: a.employee,
      employeeName: a.employeeName,
      designation: a.designation || '—',
      assignedVehicle: a.assignedVehicle || '—',
      presentDays: Number(a.presentDays || 0),
      halfDays: Number(a.halfDays || 0),
      leaveDays: Number(a.leaveDays || 0),
      dailySalaryRate: Number(a.dailySalaryRate || 0),
      totalCalculatedSalary: Number(a.totalCalculatedSalary || 0),
      mineSite: a.mineSite || '—',
    }));
    return { columns, rows };
  }

  return { columns: [], rows: [] };
}

export function AllReportsHub() {
  const searchParams = useSearchParams();
  const { currentMine, mineOptions } = useMine();

  const paramCat = searchParams.get('category') as ReportCategoryId | null;
  const paramReport = searchParams.get('report');

  const initialReport = useMemo(() => {
    if (paramReport) {
      const found = UNIFIED_REPORTS.find(
        (r) => r.id === paramReport || r.name === paramReport || r.apiReportName === paramReport
      );
      if (found) return found;
    }
    if (paramCat) {
      const catFound = UNIFIED_REPORTS.find((r) => r.category === paramCat);
      if (catFound) return catFound;
    }
    return UNIFIED_REPORTS[0];
  }, [paramCat, paramReport]);

  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryId>(initialReport.category);
  const [selectedReportId, setSelectedReportId] = useState<string>(initialReport.id);

  useEffect(() => {
    if (paramReport) {
      const found = UNIFIED_REPORTS.find(
        (r) => r.id === paramReport || r.name === paramReport || r.apiReportName === paramReport
      );
      if (found) {
        setSelectedCategory(found.category);
        setSelectedReportId(found.id);
        return;
      }
    }
    if (paramCat && REPORT_CATEGORIES.some((c) => c.id === paramCat)) {
      setSelectedCategory(paramCat);
      const firstInCat = UNIFIED_REPORTS.find((r) => r.category === paramCat);
      if (firstInCat) setSelectedReportId(firstInCat.id);
    }
  }, [paramCat, paramReport]);

  const activeReport = useMemo(
    () => UNIFIED_REPORTS.find((r) => r.id === selectedReportId) || UNIFIED_REPORTS[0],
    [selectedReportId]
  );

  // Reference lists for dropdown filters
  const [vehicleOptions, setVehicleOptions] = useState<string[]>([]);
  const [driverOptions, setDriverOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadRefLists = async () => {
      try {
        const [vRes, eRes] = await Promise.all([fetch('/api/vehicles'), fetch('/api/employees')]);
        if (vRes.ok) {
          const vJson = await vRes.json();
          const list: any[] = vJson.vehicles || vJson.data || [];
          const plates = Array.from(
            new Set(list.map((v) => v.licensePlate || v.name || v.id).filter(Boolean))
          ).sort();
          setVehicleOptions(plates);
        }
        if (eRes.ok) {
          const eJson = await eRes.json();
          const list: any[] = eJson.data || [];
          const names = Array.from(
            new Set(list.map((e) => e.employeeName).filter(Boolean))
          ).sort();
          setDriverOptions(names);
        }
      } catch {
        // Ignore reference list failures gracefully
      }
    };
    loadRefLists();
  }, []);

  // Universal Filters
  const todayIso = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [mineFilter, setMineFilter] = useState(currentMine || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [extraFilter, setExtraFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMineFilter(currentMine || 'ALL');
  }, [currentMine]);

  // Report Data State
  const [columns, setColumns] = useState<ReportColumnDef[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(todayIso);
      setToDate(todayIso);
    } else if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      setFromDate(fmt(start));
      setToDate(todayIso);
    } else if (preset === 'month') {
      setFromDate(fmt(new Date(y, m, 1)));
      setToDate(fmt(new Date(y, m + 1, 0)));
    } else if (preset === 'lastMonth') {
      setFromDate(fmt(new Date(y, m - 1, 1)));
      setToDate(fmt(new Date(y, m, 0)));
    } else if (preset === 'year') {
      setFromDate(`${y}-01-01`);
      setToDate(`${y}-12-31`);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  const clearAllFilters = () => {
    setFromDate(`${currentYear}-01-01`);
    setToDate(`${currentYear}-12-31`);
    setVehicleFilter('ALL');
    setDriverFilter('ALL');
    setMineFilter(currentMine || 'ALL');
    setStatusFilter('ALL');
    setExtraFilter('');
    setSearchTerm('');
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setSortField(null);

    try {
      const activeMine = mineFilter && mineFilter !== 'ALL' ? mineFilter : undefined;

      if (activeReport.sourceType === 'api' && activeReport.apiEndpoint) {
        const params = new URLSearchParams();
        if (activeMine) params.set('mine_site', activeMine);
        if (activeReport.id === 'attendance-summary-report') {
          const refDate = toDate ? new Date(toDate) : new Date();
          params.set('month', String(refDate.getMonth() + 1));
          params.set('year', String(refDate.getFullYear()));
        }
        const url = `${activeReport.apiEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to load ${activeReport.name}`);
        }
        const normalized = normalizeOperationalReport(activeReport.id, json);
        setColumns(normalized.columns);
        setRawRows(normalized.rows);
      } else {
        const endpoint =
          activeReport.sourceType === 'finance'
            ? '/api/finance/reports'
            : activeReport.sourceType === 'procurement'
            ? '/api/procurement/reports'
            : '/api/compliance/reports';

        const filters: Record<string, any> = {
          from_date: fromDate || `${currentYear}-01-01`,
          to_date: toDate || `${currentYear}-12-31`,
        };
        if (activeMine) filters.mine_site = activeMine;
        if (vehicleFilter && vehicleFilter !== 'ALL') filters.vehicle = vehicleFilter;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_name: activeReport.apiReportName || activeReport.name,
            filters,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to execute ${activeReport.name}`);
        }
        setColumns(json.columns || []);
        setRawRows(json.result || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading report');
      setColumns([]);
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeReport, fromDate, toDate, mineFilter, vehicleFilter, currentYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Extract dynamic status values from loaded rows
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    rawRows.forEach((row) => {
      const s = row.status || row.workflow_state || row.trip_status || row.approval_status;
      if (s && typeof s === 'string' && s !== '—') statuses.add(s);
    });
    return Array.from(statuses).sort();
  }, [rawRows]);

  // Client-side comprehensive filtering across Date, Vehicle, Driver, Mine, Status, Extra, Search
  const filteredRows = useMemo(() => {
    return rawRows.filter((row) => {
      const rowValuesStr = Object.values(row)
        .map((v) => String(v ?? ''))
        .join(' ')
        .toLowerCase();

      if (searchTerm && !rowValuesStr.includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (extraFilter && !rowValuesStr.includes(extraFilter.toLowerCase())) {
        return false;
      }
      if (vehicleFilter !== 'ALL') {
        const vCell = String(row.vehicle || row.licensePlate || row.assignedVehicle || '').toLowerCase();
        if (vCell) {
          if (!vCell.includes(vehicleFilter.toLowerCase())) return false;
        } else if (!rowValuesStr.includes(vehicleFilter.toLowerCase())) {
          return false;
        }
      }
      if (driverFilter !== 'ALL') {
        const dCell = String(row.driver || row.employeeName || row.driver_name || '').toLowerCase();
        if (dCell) {
          if (!dCell.includes(driverFilter.toLowerCase())) return false;
        } else if (!rowValuesStr.includes(driverFilter.toLowerCase())) {
          return false;
        }
      }
      if (mineFilter && mineFilter !== 'ALL') {
        const mCell = String(row.mineSite || row.mine_site || '').toLowerCase();
        if (mCell && mCell !== '—' && !mCell.includes(mineFilter.toLowerCase())) {
          return false;
        }
      }
      if (statusFilter !== 'ALL') {
        const sCell = String(
          row.status || row.workflow_state || row.trip_status || row.approval_status || ''
        ).toLowerCase();
        if (sCell !== statusFilter.toLowerCase()) return false;
      }

      // Date-wise filtering for operational rows
      if (fromDate || toDate) {
        const rowDate = extractDateOnly(
          row.date || row.dispatchDateTime || row.fuelDate || row.posting_date || row.dateOfJoining
        );
        if (rowDate) {
          if (fromDate && rowDate < fromDate) return false;
          if (toDate && rowDate > toDate) return false;
        }
      }

      return true;
    });
  }, [rawRows, searchTerm, extraFilter, vehicleFilter, driverFilter, mineFilter, statusFilter, fromDate, toDate]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
        return sortAsc ? na - nb : nb - na;
      }
      return sortAsc
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''));
    });
  }, [filteredRows, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Totals for numeric columns (excluding percentages and rates)
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    columns.forEach((col) => {
      if (
        (col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int') &&
        !col.fieldname.toLowerCase().includes('rate') &&
        !col.fieldname.toLowerCase().includes('avg') &&
        !col.fieldname.toLowerCase().includes('odometer')
      ) {
        totals[col.fieldname] = sortedRows.reduce((acc, row) => {
          const n = Number(row[col.fieldname]);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
      }
    });
    return totals;
  }, [columns, sortedRows]);

  const exportMeta = {
    fromDate,
    toDate,
    vehicle: vehicleFilter,
    mineSite: mineFilter,
    driver: driverFilter,
    status: statusFilter,
    search: searchTerm,
  };

  const reportsInCategory = useMemo(
    () => UNIFIED_REPORTS.filter((r) => r.category === selectedCategory),
    [selectedCategory]
  );

  return (
    <div className="space-y-6">
      {/* Category Selector Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {REPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = UNIFIED_REPORTS.filter((r) => r.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  const first = UNIFIED_REPORTS.find((r) => r.category === cat.id);
                  if (first) setSelectedReportId(first.id);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-white text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Selector + Action Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Report ({reportsInCategory.length} available in category)
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {reportsInCategory.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">{activeReport.desc}</p>
          </div>

          {/* View, Excel, PDF, CSV, Original Link Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'View / Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportReportToExcel(activeReport.name, columns, sortedRows, exportMeta)}
              disabled={sortedRows.length === 0 || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={() => exportReportToPDF(activeReport.name, columns, sortedRows, exportMeta)}
              disabled={sortedRows.length === 0 || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => exportReportToCSV(activeReport.name, columns, sortedRows)}
              disabled={sortedRows.length === 0 || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <Link
              href={activeReport.originalHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Original</span>
            </Link>
          </div>
        </div>

        {/* Comprehensive Filter Panel */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-blue-700" />
              <span>Universal Filters (Date, Vehicle, Driver, Mine, Status & Search)</span>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Quick Dates:
              </span>
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'Last 7 Days' },
                { key: 'month', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
                { key: 'year', label: 'This Year' },
                { key: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyDatePreset(p.key as any)}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors ml-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Global Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search ID, route, customer..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Wise</label>
              <select
                value={vehicleFilter}
                onChange={(e) => {
                  setVehicleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Vehicles</option>
                {vehicleOptions.map((plate) => (
                  <option key={plate} value={plate}>
                    {plate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mine Site Wise</label>
              <select
                value={mineFilter}
                onChange={(e) => {
                  setMineFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Mine Sites</option>
                {mineOptions
                  .filter((m) => m.value !== 'ALL')
                  .map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Driver / Staff Wise</label>
              <select
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Drivers & Staff</option>
                {driverOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status Wise</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Statuses</option>
                {availableStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Shift / Route / Keyword</label>
              <input
                type="text"
                value={extraFilter}
                onChange={(e) => {
                  setExtraFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="e.g. Shift A, CHP, Diesel..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-700" />
            <span className="text-sm font-bold text-slate-900">{activeReport.name}</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {sortedRows.length} of {rawRows.length} records
          </div>
        </div>

        {error && (
          <div className="p-4 m-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={col.fieldname}
                    onClick={() => {
                      if (sortField === col.fieldname) {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortField(col.fieldname);
                        setSortAsc(true);
                      }
                    }}
                    className={`py-3 px-4 text-[11px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:bg-slate-200/70 transition-colors ${
                      isNumericColumn(col) ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{col.label || col.fieldname}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-700" />
                      <span>Fetching live records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="py-12 text-center text-slate-500">
                    No records match the current filters. Try widening your date range or resetting filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.fieldname}
                        className={`py-2.5 px-4 whitespace-nowrap ${
                          isNumericColumn(col) ? 'text-right font-mono tabular-nums' : 'text-left'
                        }`}
                      >
                        {formatReportCell(row[col.fieldname], col)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {!loading && sortedRows.length > 0 && Object.keys(columnTotals).length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                  {columns.map((col, idx) => (
                    <td
                      key={col.fieldname}
                      className={`py-3 px-4 whitespace-nowrap ${
                        isNumericColumn(col) ? 'text-right font-mono tabular-nums' : 'text-left'
                      }`}
                    >
                      {idx === 0
                        ? `TOTAL (${sortedRows.length} rows)`
                        : columnTotals[col.fieldname] !== undefined
                        ? formatReportCell(columnTotals[col.fieldname], col)
                        : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

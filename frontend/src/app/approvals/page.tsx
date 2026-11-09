'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { ApprovalItem, ApprovalMetrics, ApprovalDocType } from '@/types/fleet';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Truck,
  Fuel,
  Wrench,
  Receipt,
  ShoppingCart,
  Shield,
  Eye,
  X,
  FileText,
  AlertCircle,
  User,
  ShieldAlert,
} from 'lucide-react';

const TABS: { id: string; label: string; doctype?: ApprovalDocType }[] = [
  { id: 'ALL', label: 'All Pending' },
  { id: 'Mining Trip', label: 'Mining Trips', doctype: 'Mining Trip' },
  { id: 'Fuel Log', label: 'Fuel Dispensation', doctype: 'Fuel Log' },
  { id: 'Vehicle Breakdown', label: 'Breakdowns & Repairs', doctype: 'Vehicle Breakdown' },
  { id: 'Operational Expense', label: 'Operating Expenses', doctype: 'Operational Expense' },
  { id: 'Purchase Order', label: 'Purchase Orders', doctype: 'Purchase Order' },
  { id: 'Vehicle Insurance Policy', label: 'Insurance Policies', doctype: 'Vehicle Insurance Policy' },
];

export default function ApprovalsPage() {
  const { user, role } = useAuth();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [metrics, setMetrics] = useState<ApprovalMetrics>({
    totalPending: 0,
    pendingTrips: 0,
    pendingFuel: 0,
    pendingBreakdowns: 0,
    pendingExpenses: 0,
    pendingPurchases: 0,
    pendingInsurance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Drawer State
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);

  // Reject Modal State
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('doctype', activeTab);
      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to fetch pending approval items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const handleApprove = async (item: ApprovalItem) => {
    if (item.isCurrentUserOwner) {
      alert('Anti-Self-Approval Enforcement: You cannot approve records that you created.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const actionName = item.allowedActions.includes('Approve')
        ? 'Approve'
        : item.allowedActions[0] || 'Approve';

      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctype: item.doctype,
          id: item.id,
          action: actionName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from list
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setMetrics((prev) => ({
          ...prev,
          totalPending: Math.max(0, prev.totalPending - 1),
        }));
        if (selectedItem?.id === item.id) setSelectedItem(null);
      } else {
        alert(data.error || 'Failed to execute approval action.');
      }
    } catch (err) {
      console.error('Approval action error:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenRejectModal = (item: ApprovalItem) => {
    setRejectingItem(item);
    setRejectionReason('');
  };

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;

    if (!rejectionReason.trim()) {
      alert('A valid rejection reason is strictly mandatory.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctype: rejectingItem.doctype,
          id: rejectingItem.id,
          action: 'Reject',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from list
        setItems((prev) => prev.filter((i) => i.id !== rejectingItem.id));
        setMetrics((prev) => ({
          ...prev,
          totalPending: Math.max(0, prev.totalPending - 1),
        }));
        setRejectingItem(null);
        if (selectedItem?.id === rejectingItem.id) setSelectedItem(null);
      } else {
        alert(data.error || 'Failed to reject item.');
      }
    } catch (err) {
      console.error('Rejection submission error:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getDocTypeIcon = (doctype: ApprovalDocType) => {
    switch (doctype) {
      case 'Mining Trip':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'Fuel Log':
        return <Fuel className="w-4 h-4 text-amber-600" />;
      case 'Vehicle Breakdown':
        return <Wrench className="w-4 h-4 text-rose-600" />;
      case 'Operational Expense':
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      case 'Purchase Order':
        return <ShoppingCart className="w-4 h-4 text-purple-600" />;
      case 'Vehicle Insurance Policy':
        return <Shield className="w-4 h-4 text-cyan-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getDocTypeBadge = (doctype: ApprovalDocType) => {
    switch (doctype) {
      case 'Mining Trip':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Mining Trip
          </span>
        );
      case 'Fuel Log':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Fuel Log
          </span>
        );
      case 'Vehicle Breakdown':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Breakdown
          </span>
        );
      case 'Operational Expense':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            OpEx Claim
          </span>
        );
      case 'Purchase Order':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Purchase Order
          </span>
        );
      case 'Vehicle Insurance Policy':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            Insurance Policy
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {doctype}
          </span>
        );
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      (item.vehicle && item.vehicle.toLowerCase().includes(q)) ||
      item.submitter.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      headerTitle="Operational Approval Center"
      headerSubtitle="Multi-module authorization inbox with dual-custody anti-self-approval enforcement"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Anti-Self-Approval Policy Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold text-amber-950">Dual-Custody Anti-Self-Approval Active: </span>
            In compliance with corporate fleet governance rules, operational managers cannot approve their own submissions. Items you created will show an authorization lock and must be reviewed by another designated manager.
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Pending Inbox
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.totalPending.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Awaiting manager action</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Trips & Fuel
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {(metrics.pendingTrips + metrics.pendingFuel).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {metrics.pendingTrips} trips · {metrics.pendingFuel} fuel
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Workshop & Repairs
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {metrics.pendingBreakdowns.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Breakdowns & completions</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Financial & Procurement
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {(metrics.pendingExpenses + metrics.pendingPurchases + metrics.pendingInsurance).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {metrics.pendingExpenses} OpEx · {metrics.pendingPurchases} POs · {metrics.pendingInsurance} Ins
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Module Tabs & Search Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          {/* Module Tabs Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              let count = metrics.totalPending;
              if (tab.doctype === 'Mining Trip') count = metrics.pendingTrips;
              else if (tab.doctype === 'Fuel Log') count = metrics.pendingFuel;
              else if (tab.doctype === 'Vehicle Breakdown') count = metrics.pendingBreakdowns;
              else if (tab.doctype === 'Operational Expense') count = metrics.pendingExpenses;
              else if (tab.doctype === 'Purchase Order') count = metrics.pendingPurchases;
              else if (tab.doctype === 'Vehicle Insurance Policy') count = metrics.pendingInsurance;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, vehicle plate, or submitter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={fetchApprovals}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Refresh pending approvals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Approvals Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Pending Authorizations</span>
              <span className="text-xs font-medium text-slate-500">
                ({filteredItems.length} items)
              </span>
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs">Fetching pending records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">No pending approvals</p>
              <p className="text-xs text-slate-500">
                All records have been authorized or reviewed. Your inbox is clean.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Item & Module</th>
                    <th className="py-3 px-4">Submitter</th>
                    <th className="py-3 px-4">Asset / Entity</th>
                    <th className="py-3 px-4 text-right">Magnitude / Cost</th>
                    <th className="py-3 px-4">Current State</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map((item) => {
                    const isSelf = item.isCurrentUserOwner;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelf ? 'bg-amber-50/15' : ''
                        }`}
                      >
                        {/* Item & Module */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-100 flex-shrink-0 mt-0.5">
                              {getDocTypeIcon(item.doctype)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-tight">
                                {item.id}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {item.title}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {getDocTypeBadge(item.doctype)}
                                {isSelf && (
                                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Self-Created
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Submitter & Date */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-800">{item.submitter}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.submissionDate?.substring(0, 10) || 'Recent'}</span>
                          </div>
                        </td>

                        {/* Asset / Entity */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {item.vehicle ? (
                            <Link
                              href="/vehicles"
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>{item.vehicle}</span>
                            </Link>
                          ) : item.mineSite ? (
                            <span className="font-medium text-slate-800">{item.mineSite}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {item.driver && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Driver: {item.driver}
                            </div>
                          )}
                        </td>

                        {/* Magnitude / Cost (Right Aligned) */}
                        <td className="py-3.5 px-4 text-right">
                          {item.amount != null && item.amount > 0 ? (
                            <div className="font-bold text-slate-900 font-mono">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </div>
                          ) : item.quantity != null && item.quantity > 0 ? (
                            <div className="font-bold text-slate-900 font-mono">
                              {item.quantity} {item.doctype === 'Mining Trip' ? 'Tons' : 'Units'}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Current State */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {item.currentState}
                          </span>
                        </td>

                        {/* Actions (Right Aligned) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Details Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Review details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Reject Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(item)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Reject record"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>

                            {/* Approve Button */}
                            <button
                              type="button"
                              onClick={() => handleApprove(item)}
                              disabled={isSelf || isSubmittingAction}
                              className={`px-3 py-1 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs ${
                                isSelf
                                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                                  : 'bg-blue-900 hover:bg-blue-800'
                              }`}
                              title={
                                isSelf
                                  ? 'Anti-Self-Approval: You cannot authorize your own submission.'
                                  : 'Approve this item'
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Slide-over / Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedItem.doctype} Review</span>
                  {getDocTypeBadge(selectedItem.doctype)}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedItem.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedItem.isCurrentUserOwner && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    You created this record. Anti-self-approval rule forbids you from authorizing it.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Summary
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900">
                  {selectedItem.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium">Submitter</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedItem.submitter}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-medium">Submission Date</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedItem.submissionDate || 'Recent'}
                  </div>
                </div>
                {selectedItem.vehicle && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-400 font-medium">Target Vehicle</div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {selectedItem.vehicle}
                    </div>
                  </div>
                )}
                {selectedItem.amount != null && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-400 font-medium">Financial Value</div>
                    <div className="font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{selectedItem.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>

              {selectedItem.details && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Record Details
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                    {Object.entries(selectedItem.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-medium text-slate-900">{String(v ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const it = selectedItem;
                    setSelectedItem(null);
                    handleOpenRejectModal(it);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Reject...
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedItem)}
                  disabled={selectedItem.isCurrentUserOwner || isSubmittingAction}
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs ${
                    selectedItem.isCurrentUserOwner
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-blue-900 hover:bg-blue-800'
                  }`}
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  <span>Reject {rejectingItem.doctype}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {rejectingItem.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReject} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                You are rejecting this record. A documented reason is mandatory for audit compliance and will be returned to the submitter ({rejectingItem.submitter}).
              </div>

              <div>
                <label
                  htmlFor="rejectionReasonInput"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  id="rejectionReasonInput"
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide explicit operational or financial rationale for rejecting this record..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !rejectionReason.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingAction ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}


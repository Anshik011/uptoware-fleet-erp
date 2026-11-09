'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { FleetAlert, AlertMetrics } from '@/types/fleet';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  RefreshCw,
  CheckCheck,
  Shield,
  Truck,
  Fuel,
  Wrench,
  Package,
  ShoppingCart,
  IndianRupee,
  Compass,
  ArrowRight,
  X,
} from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'Vehicle & Driver',
  'Trip Operations',
  'Fuel',
  'Maintenance & Workshop',
  'Inventory',
  'Procurement',
  'Insurance & Compliance',
  'Revenue & Financial',
] as const;

const SEVERITIES = ['ALL', 'Critical', 'High', 'Medium', 'Low'] as const;

export default function AlertsPage() {
  const { user, role } = useAuth();

  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [metrics, setMetrics] = useState<AlertMetrics>({
    totalAlerts: 0,
    unreadAlerts: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    resolvedAlerts: 0,
    byCategory: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Unread' | 'Resolved'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Resolve Modal State
  const [resolvingAlert, setResolvingAlert] = useState<FleetAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (selectedSeverity !== 'ALL') params.set('severity', selectedSeverity);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('limit', '100');

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to fetch operational alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedCategory, selectedSeverity, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAlerts();
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, status: 'Read' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: 'Read' } : a))
        );
        setMetrics((prev) => ({
          ...prev,
          unreadAlerts: Math.max(0, prev.unreadAlerts - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.status === 'Unread' ? { ...a, status: 'Read' } : a))
        );
        setMetrics((prev) => ({
          ...prev,
          unreadAlerts: 0,
        }));
      }
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleOpenResolveModal = (alert: FleetAlert) => {
    setResolvingAlert(alert);
    setResolutionNote('');
  };

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsSubmittingResolve(true);

    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resolvingAlert.id,
          status: 'Resolved',
          resolution_note: resolutionNote.trim() || 'Resolved via Fleet Alert Console',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === resolvingAlert.id
              ? {
                  ...a,
                  status: 'Resolved',
                  resolutionNote: resolutionNote.trim() || 'Resolved via Fleet Alert Console',
                  resolvedBy: user?.email || 'Administrator',
                }
              : a
          )
        );
        setMetrics((prev) => ({
          ...prev,
          resolvedAlerts: prev.resolvedAlerts + 1,
          unreadAlerts:
            resolvingAlert.status === 'Unread'
              ? Math.max(0, prev.unreadAlerts - 1)
              : prev.unreadAlerts,
        }));
        setResolvingAlert(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Failed to resolve alert.');
      }
    } catch (err) {
      console.error('Error submitting resolve action:', err);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Vehicle & Driver':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'Trip Operations':
        return <Compass className="w-4 h-4 text-indigo-600" />;
      case 'Fuel':
        return <Fuel className="w-4 h-4 text-amber-600" />;
      case 'Maintenance & Workshop':
        return <Wrench className="w-4 h-4 text-rose-600" />;
      case 'Inventory':
        return <Package className="w-4 h-4 text-cyan-600" />;
      case 'Procurement':
        return <ShoppingCart className="w-4 h-4 text-purple-600" />;
      case 'Insurance & Compliance':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'Revenue & Financial':
        return <IndianRupee className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Unread':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Unread
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Acknowledged
          </span>
        );
      case 'Read':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Read
          </span>
        );
    }
  };

  return (
    <AppShell
      headerTitle="Operational Alerts & Notifications"
      headerSubtitle="Real-time statutory compliance, breakdown escalations, fuel approvals and financial triggers"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Tracked
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics.totalAlerts.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Across all fleet operations</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Bell className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Unread Alerts
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {metrics.unreadAlerts.toLocaleString()}
              </p>
              <p className="text-xs text-rose-500 mt-0.5">Require manager attention</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Critical & High
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {(metrics.criticalAlerts + metrics.highAlerts).toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {metrics.criticalAlerts} critical · {metrics.highAlerts} high
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Resolved
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {metrics.resolvedAlerts.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Audited & closed</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          {/* Top Row: Categories Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'ALL'
                  ? metrics.totalAlerts
                  : metrics.byCategory[cat] || 0;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat === 'ALL' ? 'All Alerts' : cat}</span>
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

          {/* Bottom Row: Search, Dropdowns, and Action Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alerts by title, vehicle, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {/* Severity Dropdown */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Status Toggle */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="Unread">Unread Only</option>
                <option value="Resolved">Resolved Only</option>
              </select>

              {/* Mark All Read Button */}
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll || metrics.unreadAlerts === 0}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 text-blue-600" />
                <span>{isMarkingAll ? 'Marking...' : 'Mark All Read'}</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchAlerts}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Refresh alerts"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Operational Incident & Warning Feed</span>
              <span className="text-xs font-medium text-slate-500">
                ({alerts.length} displayed)
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
              <p className="text-xs">Loading operational alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">No alerts found</p>
              <p className="text-xs text-slate-500">
                All statutory, maintenance, dispatch and financial indicators are normal.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => {
                const isUnread = alert.status === 'Unread';
                return (
                  <div
                    key={alert.id}
                    className={`p-4 sm:p-5 transition-colors hover:bg-slate-50/80 ${
                      isUnread ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Tags Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {getCategoryIcon(alert.category)}
                            <span>{alert.category}</span>
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {alert.id}
                          </span>
                        </div>

                        {/* Title & Message */}
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {alert.title}
                        </h3>
                        {alert.message && (
                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            {alert.message}
                          </p>
                        )}

                        {/* Action Required Box */}
                        {alert.actionRequired && (
                          <div className="mt-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">Action Required: </span>
                              <span>{alert.actionRequired}</span>
                            </div>
                          </div>
                        )}

                        {/* Metadata Row: Vehicle, Driver, Timestamps, Resolution */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500">
                          {alert.vehicle && (
                            <Link
                              href={`/vehicles`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{alert.vehicle}</span>
                            </Link>
                          )}
                          {alert.driver && (
                            <span className="text-slate-600">
                              Driver: <span className="font-medium">{alert.driver}</span>
                            </span>
                          )}
                          {alert.sourceName && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              Doc: {alert.sourceName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{alert.timestamp || 'Just now'}</span>
                          </span>
                          {alert.resolvedBy && (
                            <span className="text-emerald-700 font-medium">
                              Resolved by {alert.resolvedBy}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0">
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        {alert.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(alert)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resolve Alert Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Resolve Operational Alert
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {resolvingAlert.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alert Summary
                </label>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200">
                  {resolvingAlert.title}
                </div>
              </div>

              <div>
                <label
                  htmlFor="resolutionNote"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Resolution Note / Action Taken
                </label>
                <textarea
                  id="resolutionNote"
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Detail the remedial actions taken (e.g. Policy renewed, parts issued, driver reassigned)..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingResolve ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Resolution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}


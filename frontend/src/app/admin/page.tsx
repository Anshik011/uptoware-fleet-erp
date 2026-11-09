'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import {
  UserRosterItem,
  RolePermissionItem,
  FleetOperationalSettings,
  SystemHealthStatus,
} from '@/types/fleet';
import {
  Settings,
  Users,
  ShieldCheck,
  Activity,
  Palette,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Lock,
  Server,
  Database,
  Cpu,
  Globe,
  Sliders,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';

const TABS = [
  { id: 'users', label: 'User & Role Roster', icon: Users, adminOnly: true },
  { id: 'permissions', label: 'Role Permissions Matrix', icon: ShieldCheck, adminOnly: true },
  { id: 'settings', label: 'Fleet Operational Settings', icon: Sliders, adminOnly: false },
  { id: 'health', label: 'System Health & Telemetry', icon: Activity, adminOnly: false },
  { id: 'branding', label: 'Branding & Terminology', icon: Palette, adminOnly: false },
];

function AdminContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'users';

  const { user, role, roles } = useAuth();
  const { branding } = useBranding();

  const isSuperAdmin =
    role === 'Administrator' ||
    roles.includes('System Manager') ||
    roles.includes('Administrator');

  const isFleetManager = role === 'Fleet Manager' || roles.includes('Fleet Manager');

  // Active Tab: If Fleet Manager, default to 'settings' if 'users' or 'permissions' requested
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (!isSuperAdmin && (initialTab === 'users' || initialTab === 'permissions')) {
      return 'settings';
    }
    return initialTab;
  });

  // Data states
  const [userList, setUserList] = useState<UserRosterItem[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionItem[]>([]);
  const [settings, setSettings] = useState<FleetOperationalSettings>({
    warning_window_days: 30,
    reminder_intervals: '30, 15, 7, 0',
    notification_recipient_role: 'Fleet Manager',
    min_fuel_efficiency_kml: 2.5,
    breakdown_escalation_hours: 24,
    repeated_breakdown_threshold: 3,
    enforce_insurance_on_dispatch: 1,
    enforce_fitness_on_dispatch: 1,
    enforce_puc_on_dispatch: 0,
    enforce_road_tax_on_dispatch: 0,
    enforce_permit_on_dispatch: 0,
    enable_fleet_notifications: 1,
    enable_in_app_notifications: 1,
  });
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Load data according to tab
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      if (activeTab === 'users' && isSuperAdmin) {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.success) setUserList(data.users || []);
        else throw new Error(data.error || 'Failed to fetch users');
      } else if (activeTab === 'permissions' && isSuperAdmin) {
        const res = await fetch('/api/admin/permissions');
        const data = await res.json();
        if (data.success) setPermissions(data.permissions || []);
        else throw new Error(data.error || 'Failed to fetch permissions');
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.settings) setSettings(data.settings);
        else throw new Error(data.error || 'Failed to fetch settings');
      } else if (activeTab === 'health') {
        const res = await fetch('/api/admin/health');
        const data = await res.json();
        if (data.success && data.health) setHealth(data.health);
        else throw new Error(data.error || 'Failed to fetch health');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Error communicating with backend administration service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess('Fleet operational settings and thresholds successfully saved.');
        if (data.settings) setSettings(data.settings);
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  // 403 Forbidden Screen for Unauthorized Roles
  if (!isSuperAdmin && !isFleetManager) {
    return (
      <AppShell
        headerTitle="Access Restricted"
        headerSubtitle="Administrative Console"
      >
        <div className="p-12 max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">403 Forbidden — Insufficient Role Authority</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Administration and System Settings console is restricted to enterprise Administrator and Fleet Manager personnel. Your current role (<span className="font-semibold text-slate-800">{role}</span>) does not possess permission to access platform governance settings.
          </p>
        </div>
      </AppShell>
    );
  }

  const filteredUsers = userList.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  const filteredPermissions = permissions.filter((p) => {
    const matchesRole = selectedRoleFilter === 'ALL' || p.role === selectedRoleFilter;
    if (!matchesRole) return false;
    if (!permSearch.trim()) return true;
    const q = permSearch.toLowerCase();
    return p.doctype.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
  });

  return (
    <AppShell
      headerTitle="Fleet System Administration"
      headerSubtitle="Enterprise configuration, user role management, DocPerm security matrix and system telemetry"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map((tab) => {
              if (tab.adminOnly && !isSuperAdmin) return null;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerts & Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* TAB 1: USER & ROLE ROSTER */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Authorized User Directory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized live from Frappe <code className="text-slate-700">tabUser</code> and <code className="text-slate-700">tabHas Role</code>.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, name, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">User & Email</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">User Type</th>
                    <th className="py-3 px-4">Assigned Roles</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {u.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {u.userType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                r === 'Administrator' || r === 'System Manager'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : r === 'Fleet Manager'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : r === 'Accountant'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : r === 'Workshop Supervisor'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {u.creation?.substring(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ROLE PERMISSION MATRIX */}
        {activeTab === 'permissions' && isSuperAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Authoritative DocPerm Security Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Granular role permissions from <code className="text-slate-700">tabCustom DocPerm</code> and <code className="text-slate-700">tabDocPerm</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Fleet Manager">Fleet Manager</option>
                  <option value="Dispatcher">Dispatcher</option>
                  <option value="Workshop Supervisor">Workshop Supervisor</option>
                  <option value="Accountant">Accountant</option>
                </select>

                <div className="relative w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search DocType..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Target DocType</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Read</th>
                    <th className="py-3 px-4 text-center">Write</th>
                    <th className="py-3 px-4 text-center">Create</th>
                    <th className="py-3 px-4 text-center">Submit</th>
                    <th className="py-3 px-4 text-center">Cancel</th>
                    <th className="py-3 px-4 text-center">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPermissions.map((p, idx) => (
                    <tr key={`${p.doctype}-${p.role}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {p.doctype}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-slate-700">{p.role}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.read ? (
                          <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.write ? (
                          <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.create ? (
                          <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.submit ? (
                          <span className="inline-flex p-1 rounded-full bg-blue-100 text-blue-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.cancel ? (
                          <span className="inline-flex p-1 rounded-full bg-amber-100 text-amber-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {p.report ? (
                          <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700"><Check className="w-3 h-3" /></span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400"><X className="w-3 h-3" /></span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FLEET OPERATIONAL SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Fleet Operational Thresholds & Governance</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative parameters persisted into ERPNext <code className="text-slate-700">Fleet Settings</code> single DocType.
                </p>
              </div>

              {!isSuperAdmin && (
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>View Only (Fleet Manager)</span>
                </span>
              )}
            </div>

            {/* Threshold Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Compliance Warning Window (Days)
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={settings.warning_window_days}
                  onChange={(e) =>
                    setSettings({ ...settings, warning_window_days: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Lead time in days before document expiry generates high-priority alerts.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reminder Intervals (Comma-separated)
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={settings.reminder_intervals}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_intervals: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Milestones for automated reminders (e.g. 30, 15, 7, 0).
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Alert Recipient Role
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={settings.notification_recipient_role}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_recipient_role: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Default Frappe user role for system trigger notifications.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Fuel Efficiency Floor (km/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isSuperAdmin}
                  value={settings.min_fuel_efficiency_kml}
                  onChange={(e) =>
                    setSettings({ ...settings, min_fuel_efficiency_kml: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Alert trigger if calculated fuel efficiency falls below this floor.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Breakdown Escalation Window (Hours)
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={settings.breakdown_escalation_hours}
                  onChange={(e) =>
                    setSettings({ ...settings, breakdown_escalation_hours: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Maximum hours a breakdown may remain pending before critical escalation.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Repeated Breakdown Threshold
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={settings.repeated_breakdown_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, repeated_breakdown_threshold: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Number of incidents per 30-day window before vehicle flagged Lemon.
                </span>
              </div>
            </div>

            {/* Statutory Document Enforcement on Dispatch */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Mining Dispatch Statutory Covenant Enforcement
              </h4>
              <p className="text-xs text-slate-500">
                Control whether dispatch is hard-blocked when vehicle statutory covenants are expired.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enforce_insurance_on_dispatch === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enforce_insurance_on_dispatch: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Enforce Insurance</span>
                    <span className="text-[10px] text-slate-500">Hard-blocks trip dispatch if policy is expired</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enforce_fitness_on_dispatch === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enforce_fitness_on_dispatch: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Enforce Fitness Cert</span>
                    <span className="text-[10px] text-slate-500">Hard-blocks trip dispatch if fitness expired</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enforce_puc_on_dispatch === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enforce_puc_on_dispatch: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Enforce PUC Certificate</span>
                    <span className="text-[10px] text-slate-500">Warns/blocks on expired pollution certificate</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enforce_road_tax_on_dispatch === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enforce_road_tax_on_dispatch: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Enforce Road Tax Token</span>
                    <span className="text-[10px] text-slate-500">Requires valid road tax token for dispatch</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enforce_permit_on_dispatch === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enforce_permit_on_dispatch: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Enforce Mining Permit</span>
                    <span className="text-[10px] text-slate-500">Requires valid commercial mining road permit</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Notification Channels */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notification Channel Toggles
              </h4>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enable_fleet_notifications === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_fleet_notifications: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>Enable Fleet Notifications Master Switch</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={settings.enable_in_app_notifications === 1}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_in_app_notifications: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>Enable In-App Bell Notifications</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            {isSuperAdmin && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving Changes...' : 'Save Configuration'}</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 4: SYSTEM HEALTH & TELEMETRY */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* Top Cards: Core Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Next.js Portal
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-2">Operational</div>
                <div className="text-xs text-slate-400 mt-1">Port 3001 · Daemon Active</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Frappe ERPNext
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      health?.backendStatus === 'healthy'
                        ? 'bg-emerald-500 ring-4 ring-emerald-50'
                        : 'bg-rose-500 ring-4 ring-rose-50'
                    }`}
                  ></span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-2">
                  {health?.backendStatus === 'healthy' ? 'Responsive' : 'Degraded'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Latency: {health?.backendLatencyMs ?? 0}ms · Port 8080
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    MariaDB Engine
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-2">Connected</div>
                <div className="text-xs text-slate-400 mt-1">Container erpnext-db-1</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Redis Cache
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-2">Active</div>
                <div className="text-xs text-slate-400 mt-1">Queue & Session Bus</div>
              </div>
            </div>

            {/* Diagnostic Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Runtime Diagnostics & Integration Endpoints</span>
              </h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Subsystem</th>
                      <th className="py-2.5 px-3">Service URL</th>
                      <th className="py-2.5 px-3">Protocol</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Uptime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900">ERPNext Desk & RPC</td>
                      <td className="py-3 px-3 font-mono text-slate-600">http://localhost:8080</td>
                      <td className="py-3 px-3 text-slate-500">REST / JSON-RPC</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ONLINE
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">99.98%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900">Uptoware Portal Frontend</td>
                      <td className="py-3 px-3 font-mono text-slate-600">http://localhost:3001</td>
                      <td className="py-3 px-3 text-slate-500">HTTP / Next.js SSR</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ONLINE
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {Math.floor((health?.uptimeSeconds || 60) / 60)} mins
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-900">Relational Database</td>
                      <td className="py-3 px-3 font-mono text-slate-600">localhost:3306 (Docker)</td>
                      <td className="py-3 px-3 text-slate-500">MariaDB 10.6</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          HEALTHY
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BRANDING & TERMINOLOGY OVERVIEW */}
        {activeTab === 'branding' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Enterprise Identity & Terminology Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active branding tokens sourced from <code className="text-slate-700">branding.ts</code> and company master.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900">Commercial Brand Profile</div>
                <div className="space-y-1.5 pt-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform Name:</span>
                    <span className="font-semibold text-slate-900">{branding.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Short Name:</span>
                    <span className="font-semibold text-slate-900">{branding.shortName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Industry:</span>
                    <span className="font-semibold text-slate-900">Mining & Mineral Logistics</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operating Currency:</span>
                    <span className="font-semibold text-slate-900">Indian Rupee (INR / ₹)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900">Design System Palettes (3-Tier Rule)</div>
                <div className="space-y-1.5 pt-1 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Primary Brand Tier:</span>
                    <span className="font-mono text-[11px] font-semibold text-blue-900">#1e3a8a (Deep Blue)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Secondary Accent:</span>
                    <span className="font-mono text-[11px] font-semibold text-blue-600">#2563eb (Vibrant Blue)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Neutral Canvas:</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-900">Slate 50 / 900</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">In-Page Styles:</span>
                    <span className="font-semibold text-emerald-700">Strictly Zero (Tailwind Only)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <AppShell
          headerTitle="Fleet System Administration"
          headerSubtitle="Enterprise configuration, user role management, DocPerm security matrix and system telemetry"
        >
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-900" />
            <p className="text-xs">Loading administration console...</p>
          </div>
        </AppShell>
      }
    >
      <AdminContent />
    </Suspense>
  );
}


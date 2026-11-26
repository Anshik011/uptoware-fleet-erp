'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import { useMine } from '@/context/MineContext';
import { getFilteredNavigationSections, administrationNavSection } from '@/config/navigation';
import { UNIFIED_REPORTS } from '@/components/reports/AllReportsHub';
import {
  Menu,
  Bell,
  Search,
  Activity,
  User,
  ChevronDown,
  Shield,
  LogOut,
  MapPin,
  X,
  Truck,
  Compass,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  unreadAlertsCount?: number;
  onOpenMobileNav?: () => void;
}

export function Header({
  title,
  subtitle,
  unreadAlertsCount = 0,
  onOpenMobileNav,
}: HeaderProps) {
  const { branding } = useBranding();
  const { user, role, roles, logout } = useAuth();
  const {
    currentMine,
    setCurrentMine,
    allowedMines,
    isAllMines,
    isSingleMine,
    isUnassigned,
    mineOptions,
    activeMineLabel,
  } = useMine();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [liveAlertsCount, setLiveAlertsCount] = useState<number>(unreadAlertsCount);

  // Global Header Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasFetchedSearchData, setHasFetchedSearchData] = useState(false);
  const [liveVehicles, setLiveVehicles] = useState<any[]>([]);
  const [liveEmployees, setLiveEmployees] = useState<any[]>([]);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [liveLeads, setLiveLeads] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensureSearchDataLoaded = async () => {
    if (hasFetchedSearchData || isSearchLoading || !user) return;
    setIsSearchLoading(true);
    try {
      const [vRes, eRes, tRes, lRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/employees'),
        fetch('/api/trips'),
        fetch('/api/leads'),
      ]);
      if (vRes.ok) {
        const vj = await vRes.json();
        setLiveVehicles(vj.vehicles || vj.data || []);
      }
      if (eRes.ok) {
        const ej = await eRes.json();
        setLiveEmployees(ej.data || []);
      }
      if (tRes.ok) {
        const tj = await tRes.json();
        setLiveTrips(tj.trips || tj.data || []);
      }
      if (lRes.ok) {
        const lj = await lRes.json();
        setLiveLeads(lj.data || []);
      }
      setHasFetchedSearchData(true);
    } catch {
      // Ignore search preload errors
    } finally {
      setIsSearchLoading(false);
    }
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    interface SearchResultItem {
      id: string;
      category: 'Module' | 'Report' | 'Vehicle' | 'Employee' | 'Trip' | 'Lead';
      title: string;
      subtitle: string;
      href: string;
    }

    const items: SearchResultItem[] = [];

    // 1. Role-filtered Navigation Modules & Sub-items
    const isRestrictedRole =
      user?.role === 'Maintenance Stores User' ||
      user?.role === 'Site Supervisor User' ||
      user?.role === 'Reconcile Incharge User';
    const allowedSections = getFilteredNavigationSections(user?.role);

    allowedSections.forEach((sec) => {
      if (sec.title.toLowerCase().includes(q) || sec.shortTitle.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${sec.id}`,
          category: 'Module',
          title: sec.title,
          subtitle: 'Navigation Section',
          href: sec.href,
        });
      }
      sec.items?.forEach((sub, idx) => {
        if (sub.name.toLowerCase().includes(q)) {
          items.push({
            id: `nav-${sec.id}-${idx}`,
            category: 'Module',
            title: sub.name,
            subtitle: sec.shortTitle,
            href: sub.href,
          });
        }
      });
      sec.groups?.forEach((grp) => {
        grp.items.forEach((sub, idx) => {
          if (sub.name.toLowerCase().includes(q) || grp.title.toLowerCase().includes(q)) {
            items.push({
              id: `nav-${sec.id}-${grp.title}-${idx}`,
              category: 'Module',
              title: sub.name,
              subtitle: `${sec.shortTitle} • ${grp.title}`,
              href: sub.href,
            });
          }
        });
      });
    });

    if (!isRestrictedRole) {
      administrationNavSection.items.forEach((adm, idx) => {
        if (adm.name.toLowerCase().includes(q)) {
          items.push({
            id: `adm-${idx}`,
            category: 'Module',
            title: adm.name,
            subtitle: 'Technical & Workshop Controls',
            href: adm.href,
          });
        }
      });

      // 2. All Unified Reports
      UNIFIED_REPORTS.forEach((rep) => {
        if (rep.name.toLowerCase().includes(q) || rep.desc.toLowerCase().includes(q)) {
          items.push({
            id: `rep-${rep.id}`,
            category: 'Report',
            title: rep.name,
            subtitle: 'All Reports Center (Excel / PDF / View)',
            href: `/all-reports?report=${encodeURIComponent(rep.id)}`,
          });
        }
      });
    }

    // 3. Live Vehicles
    liveVehicles.forEach((v) => {
      const plate = v.licensePlate || v.name || v.id || '';
      const driver = v.assignedDriverName || '';
      const vType = v.vehicleType || '';
      if (
        plate.toLowerCase().includes(q) ||
        driver.toLowerCase().includes(q) ||
        vType.toLowerCase().includes(q)
      ) {
        items.push({
          id: `veh-${v.id || plate}`,
          category: 'Vehicle',
          title: plate,
          subtitle: `${vType || 'Vehicle'}${driver ? ` • Driver: ${driver}` : ''} • ${v.status || ''}`,
          href: `/vehicles?q=${encodeURIComponent(plate)}`,
        });
      }
    });

    // 4. Live Employees
    liveEmployees.forEach((emp) => {
      const name = emp.employeeName || '';
      const id = emp.id || '';
      const desig = emp.designation || '';
      const veh = emp.assignedVehicle || '';
      if (
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        desig.toLowerCase().includes(q) ||
        veh.toLowerCase().includes(q)
      ) {
        items.push({
          id: `emp-${id}`,
          category: 'Employee',
          title: `${name} (${id})`,
          subtitle: `${desig || 'Staff'}${veh ? ` • Vehicle: ${veh}` : ''} • ${emp.status || ''}`,
          href: `/employees?tab=directory`,
        });
      }
    });

    // 5. Live Trips
    liveTrips.forEach((t) => {
      const tid = t.id || '';
      const veh = t.vehicle || '';
      const route = t.lead || t.destination || '';
      const drv = t.driverName || t.driver || '';
      if (
        tid.toLowerCase().includes(q) ||
        veh.toLowerCase().includes(q) ||
        route.toLowerCase().includes(q) ||
        drv.toLowerCase().includes(q)
      ) {
        items.push({
          id: `trip-${tid}`,
          category: 'Trip',
          title: `${tid} — ${veh}`,
          subtitle: `${route || 'Trip'} • ${t.tripStatus || t.status || ''}`,
          href: `/trips?q=${encodeURIComponent(tid)}`,
        });
      }
    });

    // 6. Live Leads / Routes
    liveLeads.forEach((l) => {
      const name = l.leadName || '';
      const site = l.mineSite || '';
      if (name.toLowerCase().includes(q) || site.toLowerCase().includes(q)) {
        items.push({
          id: `lead-${l.id}`,
          category: 'Lead',
          title: name,
          subtitle: `Route Lead • ${site || 'Mine'} • ₹${l.leadRate || 0}/T`,
          href: `/leads?tab=report`,
        });
      }
    });

    return items.slice(0, 14);
  }, [searchQuery, liveVehicles, liveEmployees, liveTrips, liveLeads]);

  const handleSelectSearchResult = (href: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  useEffect(() => {
    if (unreadAlertsCount > 0) {
      setLiveAlertsCount(unreadAlertsCount);
    }
  }, [unreadAlertsCount]);

  useEffect(() => {
    let isMounted = true;
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/alerts?count_only=1');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && typeof data.unreadCount === 'number') {
            setLiveAlertsCount(data.unreadCount);
          }
        }
      } catch {
        // Silently ignore background polling error
      }
    }

    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex-shrink-0 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Section: Mobile Menu Trigger + Logo / Title */}
        <div className="flex items-center gap-3">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition-colors"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Logo View (when sidebar hidden) */}
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-7 h-7 flex-shrink-0">
                <Image
                  src={branding.assets.icon}
                  alt={branding.name}
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                {branding.shortName}
              </span>
            </Link>
          </div>

          {/* Desktop / Tablet Title View */}
          {title && (
            <div className="hidden lg:block">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Controls, Status, Search, Alerts, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mine Context Selector / Static Badge */}
          {user && (
            <div className="flex items-center">
              {isSingleMine ? (
                <div
                  data-testid="header-mine-badge"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900"
                  title={`Assigned Operating Mine: ${activeMineLabel}`}
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">{activeMineLabel}</span>
                </div>
              ) : isUnassigned ? (
                <div
                  data-testid="header-mine-unassigned-badge"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span>Unassigned</span>
                </div>
              ) : (
                <div className="relative flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
                  <select
                    data-testid="header-mine-select"
                    value={currentMine}
                    onChange={(e) => setCurrentMine(e.target.value)}
                    className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors cursor-pointer appearance-none max-w-[150px] sm:max-w-[220px] truncate"
                    aria-label="Select Operating Mine Site"
                  >
                    {isAllMines && <option value="ALL">All Mines (Enterprise)</option>}
                    {mineOptions
                      .filter((opt) => isAllMines || allowedMines.includes(opt.value))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Operational Status Pill (Desktop only) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet & Dispatch Live</span>
          </div>

          {/* Functional Global Search Bar */}
          <div ref={searchContainerRef} className="relative hidden md:block w-56 lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setIsSearchOpen(true);
                ensureSearchDataLoaded();
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSearchIdx(0);
                setIsSearchOpen(true);
                ensureSearchDataLoaded();
              }}
              onKeyDown={(e) => {
                if (!isSearchOpen || searchResults.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSearchIdx((prev) => (prev + 1) % searchResults.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSearchIdx((prev) => (prev - 1 + searchResults.length) % searchResults.length);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const target = searchResults[activeSearchIdx];
                  if (target) handleSelectSearchResult(target.href);
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
              placeholder="Search fleet, plates, trips, reports..."
              aria-label="Global fleet search"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Global Search Results</span>
                  {isSearchLoading && (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Syncing live records...</span>
                    </span>
                  )}
                </div>

                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    No matching vehicles, trips, employees, or reports for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((item, idx) => {
                      const isActive = idx === activeSearchIdx;
                      const Icon =
                        item.category === 'Vehicle'
                          ? Truck
                          : item.category === 'Employee'
                          ? Users
                          : item.category === 'Report'
                          ? FileSpreadsheet
                          : Compass;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSearchResult(item.href)}
                          onMouseEnter={() => setActiveSearchIdx(idx)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-blue-900 flex-shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                <span className="font-semibold text-blue-700 mr-1.5">[{item.category}]</span>
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alerts Bell Notification Trigger */}
          <Link
            href="/alerts"
            data-testid="header-alerts-bell"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="View fleet alerts"
          >
            <Bell className="w-5 h-5" />
            {liveAlertsCount > 0 && (
              <span
                data-testid="header-alerts-badge"
                className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
              >
                {liveAlertsCount > 99 ? '99+' : liveAlertsCount}
              </span>
            )}
          </Link>

          {/* Authenticated User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              data-testid="btn-user-profile"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 hover:opacity-80 transition-opacity"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div
                  data-testid="header-user-name"
                  className="text-xs font-semibold text-slate-900 leading-tight"
                >
                  {user?.name || 'Operator'}
                </div>
                <div
                  data-testid="header-user-role"
                  className="text-[10px] font-medium text-slate-500 leading-tight"
                >
                  {role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Popover */}
            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{user?.email}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block border border-blue-200">
                      {role}
                    </span>
                    {user?.department && (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                        {user.department}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned User Roles List */}
                <div className="px-4 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span>Assigned System Roles</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-0.5">
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-md"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No roles mapped</span>
                    )}
                  </div>
                </div>

                {/* Sign Out Action */}
                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    data-testid="btn-sign-out"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of Fleet Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

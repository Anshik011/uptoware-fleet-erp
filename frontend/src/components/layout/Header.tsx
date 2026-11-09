'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  Bell,
  Search,
  Activity,
  User,
  ChevronDown,
  Shield,
  LogOut,
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [liveAlertsCount, setLiveAlertsCount] = useState<number>(unreadAlertsCount);

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
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Operational Status Pill (Desktop only) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet & Dispatch Live</span>
          </div>

          {/* Search Bar (Hidden on small mobile) */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search fleet, plates, trips..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
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

                {/* Assigned Frappe Roles List (Read-only, genuine from Frappe session) */}
                <div className="px-4 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span>Assigned Frappe Roles</span>
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

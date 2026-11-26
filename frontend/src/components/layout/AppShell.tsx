'use client';

import React, { useState, ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/context/AuthContext';
import { isRouteAllowedForRole } from '@/config/navigation';

interface AppShellProps {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  unreadAlertsCount?: number;
}

function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  if (!isLoading && user && !isRouteAllowedForRole(user.role, pathname, searchParams)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-[70vh]">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Your role (<span className="font-semibold text-slate-700">{user.role}</span>) does not have permission to access this module. Please use your assigned operational workspace.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Home Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
  unreadAlertsCount = 0,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen h-full flex antialiased bg-slate-50 text-slate-900 overflow-hidden">
      {/* Desktop / Laptop Sidebar */}
      <Suspense fallback={<aside className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col min-h-screen text-slate-300" />}>
        <Sidebar />
      </Suspense>

      {/* Mobile / Tablet Navigation Drawer */}
      <Suspense fallback={null}>
        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />
      </Suspense>

      {/* Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          unreadAlertsCount={unreadAlertsCount}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={children}>
            <RouteGuard>{children}</RouteGuard>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

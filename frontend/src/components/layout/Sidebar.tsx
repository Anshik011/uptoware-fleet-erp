'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { navigationSections } from '@/config/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import { ChevronRight, ShieldCheck, Activity } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

let inMemorySidebarScroll = 0;

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const { branding } = useBranding();
  const { hasRole } = useAuth();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isRestoringRef = React.useRef(true);

  // Helper to persist scroll position on link click
  const saveScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const top = scrollRef.current.scrollTop;
      if (top > 0) {
        inMemorySidebarScroll = top;
        try {
          sessionStorage.setItem('uptoware_sidebar_scroll', String(top));
        } catch {
          // ignore storage errors
        }
      }
      // Lock scroll event handling across route transition
      isRestoringRef.current = true;
    }
  }, []);

  // Restore sidebar scroll position on route changes
  React.useEffect(() => {
    isRestoringRef.current = true;

    const restoreScroll = () => {
      if (!scrollRef.current) return;
      let target = inMemorySidebarScroll;
      try {
        const saved = sessionStorage.getItem('uptoware_sidebar_scroll');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) target = parsed;
        }
      } catch {
        // ignore storage errors
      }

      if (target > 0) {
        scrollRef.current.scrollTop = target;
      }

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 150);
    };

    restoreScroll();
    const t = setTimeout(restoreScroll, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isRestoringRef.current) return;
    const top = e.currentTarget.scrollTop;
    if (top > 0) {
      inMemorySidebarScroll = top;
      try {
        sessionStorage.setItem('uptoware_sidebar_scroll', String(top));
      } catch {
        // ignore storage errors
      }
    }
  };

  return (
    <aside
      className={`w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col min-h-screen text-slate-300 ${className}`}
    >
      {/* Brand & Organization Area with Official Uptoware Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex flex-col gap-2" onClick={saveScroll}>
          <div className="relative w-44 h-10">
            <Image
              src={branding.assets.logoDark}
              alt={branding.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 200px"
              className="object-contain object-left"
            />
          </div>
          <div className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">
            Fleet Management ERP
          </div>
        </Link>

        {/* Operational Status Pill */}
        <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Enterprise Engine</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-4 py-5 space-y-6 overflow-y-auto"
      >
        {navigationSections.map((section, sIdx) => {
          const accessibleItems = section.items.filter((item) => hasRole(item.roles));
          if (accessibleItems.length === 0) return null;

          return (
            <div key={sIdx}>
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {section.title}
              </div>
              <nav className="space-y-1">
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none opacity-80"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={saveScroll}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* SLA / Cloud Health Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200">{branding.company}</div>
            <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
              Mining & Bulk Transport Operations Platform
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

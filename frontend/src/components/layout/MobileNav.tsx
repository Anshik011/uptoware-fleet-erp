'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { navigationSections } from '@/config/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import { X, ChevronRight, ShieldCheck } from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { branding } = useBranding();
  const { hasRole } = useAuth();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 backdrop-blur-xs flex"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full flex flex-col text-slate-300 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand & Close Button */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 p-1">
              <Image
                src={branding.assets.icon}
                alt={branding.name}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-sm leading-tight">
                {branding.shortName}
              </div>
              <div className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Customer Portal
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
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
                        onClick={onClose}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.name}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-[11px]">Uptoware Cloud Architecture v16</span>
          </div>
        </div>
      </div>
    </div>
  );
}


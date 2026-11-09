'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate items if not explicitly provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    if (pathname === '/') {
      return [{ label: 'Executive Dashboard' }];
    }
    const segments = pathname.split('/').filter(Boolean);
    const generated: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];

    let currentPath = '';
    segments.forEach((seg, idx) => {
      currentPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const formattedLabel = seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

      generated.push({
        label: formattedLabel,
        href: isLast ? undefined : currentPath,
      });
    });

    return generated;
  })();

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center text-xs text-slate-500 font-medium">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-slate-800 transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span className="sr-only">Home</span>
      </Link>

      {breadcrumbItems.map((item, idx) => {
        const isLast = idx === breadcrumbItems.length - 1;

        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1.5 flex-shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-slate-800 transition-colors truncate max-w-[140px] sm:max-w-none"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-semibold truncate max-w-[160px] sm:max-w-none">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}


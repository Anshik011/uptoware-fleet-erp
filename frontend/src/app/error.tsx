'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  const handleClearSessionAndLogin = () => {
    // Clear any potentially corrupted or expired session cookies
    document.cookie = 'uptoware_sid=; Max-Age=0; path=/;';
    document.cookie = 'sid=; Max-Age=0; path=/;';
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-rose-400" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          Temporary System Notice
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          The requested operational view encountered a temporary loading error. This can occur if your session expired or if connection parameters were refreshed.
        </p>

        {error.message && (
          <div className="w-full p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-left mb-6 overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Diagnostic Details
            </span>
            <p className="text-xs text-rose-300 font-mono break-all line-clamp-3">
              {error.message}
            </p>
          </div>
        )}

        <div className="w-full flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={reset}
            icon={RefreshCw}
          >
            Reload Page
          </Button>

          <Button
            type="button"
            variant="primary"
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            onClick={handleClearSessionAndLogin}
            icon={LogIn}
          >
            Re-authenticate
          </Button>
        </div>
      </div>
    </div>
  );
}

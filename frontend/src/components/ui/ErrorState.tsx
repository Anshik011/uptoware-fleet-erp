import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'System Notice',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
        <div>
          <div className="text-xs font-bold leading-tight">{title}</div>
          <div className="text-xs text-rose-700 mt-0.5">{message}</div>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={RefreshCw}
          className="border-rose-300 text-rose-800 hover:bg-rose-100 flex-shrink-0"
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
}


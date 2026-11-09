import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  label = 'Loading operational data...',
  size = 'md',
  className = '',
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`py-12 flex flex-col items-center justify-center gap-3 text-slate-500 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-blue-600`} />
      {label && <span className="text-xs font-medium">{label}</span>}
    </div>
  );
}


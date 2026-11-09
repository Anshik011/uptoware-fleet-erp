import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'default' | 'full' | 'narrow';
}

export function PageContainer({
  children,
  className = '',
  maxWidth = 'default',
}: PageContainerProps) {
  const maxWidths = {
    default: 'max-w-7xl',
    full: 'max-w-full',
    narrow: 'max-w-5xl',
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 ${maxWidths[maxWidth]} ${className}`}
    >
      {children}
    </div>
  );
}


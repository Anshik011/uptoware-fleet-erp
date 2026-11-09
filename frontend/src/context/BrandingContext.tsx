'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { branding as defaultBranding, BrandingConfig } from '@/config/branding';

interface BrandingContextType {
  branding: BrandingConfig;
  updateBranding: (updates: Partial<BrandingConfig>) => void;
  resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  updateBranding: () => {},
  resetBranding: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrandingConfig>(defaultBranding);

  const updateBranding = (updates: Partial<BrandingConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      assets: { ...prev.assets, ...(updates.assets || {}) },
      colors: { ...prev.colors, ...(updates.colors || {}) },
      formatting: { ...prev.formatting, ...(updates.formatting || {}) },
      terminology: { ...prev.terminology, ...(updates.terminology || {}) },
    }));
  };

  const resetBranding = () => {
    setConfig(defaultBranding);
  };

  return (
    <BrandingContext.Provider value={{ branding: config, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      branding: defaultBranding,
      updateBranding: () => {},
      resetBranding: () => {},
    };
  }
  return context;
}


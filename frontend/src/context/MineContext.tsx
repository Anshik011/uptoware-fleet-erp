'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { formatMineSiteDisplay } from '@/lib/displayFormatters';

export interface MineOption {
  value: string;
  label: string;
}

interface MineContextType {
  currentMine: string; // 'ALL' or specific mine name
  setCurrentMine: (mine: string) => void;
  allowedMines: string[];
  isAllMines: boolean;
  isSingleMine: boolean;
  isUnassigned: boolean;
  mineOptions: MineOption[];
  activeMineLabel: string;
  isLoading: boolean;
}

const STORAGE_KEY = 'uptoware_selected_mine';

const MineContext = createContext<MineContextType>({
  currentMine: 'ALL',
  setCurrentMine: () => {},
  allowedMines: [],
  isAllMines: false,
  isSingleMine: false,
  isUnassigned: false,
  mineOptions: [],
  activeMineLabel: 'All Mines',
  isLoading: true,
});

export function MineProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentMine, setCurrentMineState] = useState<string>('ALL');
  const [mineOptions, setMineOptions] = useState<MineOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAllMines = Boolean(user?.isAllMines);
  const allowedMines = useMemo(() => user?.allowedMines || [], [user?.allowedMines]);
  const isSingleMine = !isAllMines && allowedMines.length === 1;
  const isUnassigned = Boolean(user?.isUnassigned) || (!isAllMines && allowedMines.length === 0);

  // Fetch all registered mine sites for labels and options
  const fetchMineSites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/mine-sites', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const sites = json.mineSites || json.data || [];
        if (Array.isArray(sites)) {
          const opts: MineOption[] = sites.map((s: any) => ({
            value: s.name || s.id,
            label: formatMineSiteDisplay(
              s.name || s.id,
              s.siteName || s.mine_name || s.mineName
            ),
          }));
          setMineOptions(opts);
        }
      }
    } catch (err) {
      console.warn('MineContext: Failed to load mine sites:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchMineSites();
  }, [fetchMineSites]);

  // Resolve active mine on user or auth change
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setCurrentMineState('ALL');
      setIsLoading(false);
      return;
    }

    if (isUnassigned) {
      setCurrentMineState('UNASSIGNED');
      setIsLoading(false);
      return;
    }

    if (isSingleMine) {
      // Strictly lock single-mine user to their allowed mine
      const single = allowedMines[0];
      setCurrentMineState(single);
      try {
        localStorage.setItem(STORAGE_KEY, single);
      } catch {
        // Ignore local storage error
      }
      setIsLoading(false);
      return;
    }

    // For multi-mine or All-Mines users: load persisted or default
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Ignore
    }

    // Track current user ID to clear stored state on logout/user switch
    if (stored) {
      const storedUserKey = `${STORAGE_KEY}_user`;
      const lastUser = localStorage.getItem(storedUserKey);
      const currentUser = user.id || user.email;
      if (lastUser && lastUser !== currentUser) {
        // Stale user storage detected, invalidate
        stored = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(storedUserKey, currentUser);
        } catch {
          // Ignore
        }
      } else if (!lastUser) {
        try {
          localStorage.setItem(storedUserKey, currentUser);
        } catch {
          // Ignore
        }
      }
    }

    if (isAllMines) {
      const isManual = typeof window !== 'undefined' && localStorage.getItem(`${STORAGE_KEY}_manual`) === 'true';
      if (stored && isManual) {
        setCurrentMineState(stored);
      } else {
        setCurrentMineState('ALL');
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
    } else {
      // Multi-mine user: strictly verify stored selection is in allowedMines ONLY (prevent ALL tampering)
      if (stored && stored !== 'ALL' && allowedMines.includes(stored)) {
        setCurrentMineState(stored);
      } else {
        const fallback = allowedMines[0] || 'UNASSIGNED';
        setCurrentMineState(fallback);
        try {
          localStorage.setItem(STORAGE_KEY, fallback);
        } catch {
          // Ignore
        }
      }
    }
    setIsLoading(false);
  }, [authLoading, isAuthenticated, user, isAllMines, allowedMines, isSingleMine, isUnassigned]);

  const setCurrentMine = useCallback(
    (mine: string) => {
      if (isSingleMine) {
        // Cannot change mine for single-mine user
        return;
      }

      if (mine === 'ALL') {
        if (!isAllMines) {
          console.warn('Unauthorized mine selection rejected: Only enterprise All-Mines users can select ALL.');
          return;
        }
      } else if (!isAllMines && !allowedMines.includes(mine)) {
        console.warn(`Unauthorized mine selection rejected: ${mine}`);
        return;
      }

      setCurrentMineState(mine);
      try {
        localStorage.setItem(STORAGE_KEY, mine);
        localStorage.setItem(`${STORAGE_KEY}_manual`, 'true');
        if (user?.id || user?.email) {
          localStorage.setItem(`${STORAGE_KEY}_user`, user.id || user.email);
        }
      } catch {
        // Ignore
      }
    },
    [isSingleMine, isAllMines, allowedMines, user]
  );

  const activeMineLabel = useMemo(() => {
    if (isUnassigned) return 'Unassigned';
    if (currentMine === 'ALL') return 'All Mines';
    const found = mineOptions.find((o) => o.value === currentMine);
    return found ? found.label : formatMineSiteDisplay(currentMine);
  }, [currentMine, mineOptions, isUnassigned]);

  const value = useMemo(
    () => ({
      currentMine,
      setCurrentMine,
      allowedMines,
      isAllMines,
      isSingleMine,
      isUnassigned,
      mineOptions,
      activeMineLabel,
      isLoading: authLoading || isLoading,
    }),
    [
      currentMine,
      setCurrentMine,
      allowedMines,
      isAllMines,
      isSingleMine,
      isUnassigned,
      mineOptions,
      activeMineLabel,
      authLoading,
      isLoading,
    ]
  );

  return <MineContext.Provider value={value}>{children}</MineContext.Provider>;
}

export function useMine() {
  return useContext(MineContext);
}


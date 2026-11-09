'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  role: string;
  roles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles?: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'Guest',
  roles: [],
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Validate authenticated session against Frappe backend
  const verifySession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setUser(json.user);
          return;
        }
      } else {
        await res.text().catch(() => {});
      }

      // If unauthenticated or expired
      setUser(null);
      if (pathname !== '/login') {
        router.push('/login');
      }
    } catch (err) {
      console.error('Session verification error:', err);
      setUser(null);
      if (pathname !== '/login') {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Authentication failed. Please verify credentials.');
      }

      setUser(json.user);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      });
      setUser(null);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!user) return false;

    // Platform administrators have unrestricted access
    if (
      user.role === 'Administrator' ||
      user.roles.includes('Administrator') ||
      user.roles.includes('System Manager')
    ) {
      return true;
    }

    return requiredRoles.some(
      (r) => user.roles.includes(r) || user.role === r
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'Guest',
        roles: user?.roles || [],
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Lock, Mail } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { branding } = useBranding();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email.trim()) {
        throw new Error('Please enter your operational email address.');
      }
      if (!password) {
        throw new Error('Please enter your account password.');
      }
      const success = await login(email.trim(), password);
      if (success) {
        window.location.href = redirectPath;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 z-10">
        <div className="relative w-56 h-12 mx-auto mb-4">
          <Image
            src={branding.assets.logoDark}
            alt={branding.name}
            fill
            priority
            sizes="250px"
            className="object-contain"
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Enterprise Fleet Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
          Fleet operations, dispatch authorization & statutory compliance
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                data-testid="login-error-message"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                {error}
              </div>
            )}

            <Input
              label="Operator Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              placeholder="operator@uptoware.com"
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-600"
                />
                <span>Remember this terminal</span>
              </label>
              <span className="text-slate-400">Single Sign-On Enabled</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full justify-center"
            >
              Access Fleet Portal
            </Button>
          </form>

          {/* Security & Version Footnote */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Frappe v16 Business Engine</span>
            </div>
            <span>TLS 256-bit Encrypted</span>
          </div>
        </div>

        {/* Brand Copyright Notice */}
        <p className="mt-6 text-center text-xs text-slate-500 font-medium">
          © 2026 {branding.company}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

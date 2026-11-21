'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  Truck,
  Wrench,
  Calculator,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface DemoUser {
  id: string;
  name: string;
  roleTitle: string;
  roleBadge: string;
  email: string;
  description: string;
  isPrimaryAdmin?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-admin',
    name: 'Demo Admin',
    roleTitle: 'Demo Admin (Operations)',
    roleBadge: 'Full Operations · No Code',
    email: 'demo.admin@uptoware.com',
    description: 'Read, write & delete across fleet records. Code & server settings restricted.',
    isPrimaryAdmin: true,
    icon: ShieldCheck,
  },
  {
    id: 'fleet-manager',
    name: 'Fleet Manager',
    roleTitle: 'Fleet Manager',
    roleBadge: 'Approvals & Sites',
    email: 'fleet.manager@uptoware.com',
    description: 'Trip approvals, weighbridge verification & vehicle compliance.',
    icon: Truck,
  },
  {
    id: 'dispatcher',
    name: 'Trip Dispatcher',
    roleTitle: 'Trip Dispatcher',
    roleBadge: 'Dispatch & Delivery',
    email: 'dispatcher@uptoware.com',
    description: 'Trip dispatch, driver shift allocation & Stage 5 delivery completion.',
    icon: UserCheck,
  },
  {
    id: 'workshop-supervisor',
    name: 'Workshop Supervisor',
    roleTitle: 'Workshop Supervisor',
    roleBadge: 'Maintenance & Parts',
    email: 'workshop.supervisor@uptoware.com',
    description: 'Vehicle work orders, breakdown logs & spare parts inventory.',
    icon: Wrench,
  },
  {
    id: 'accountant',
    name: 'Financial Accountant',
    roleTitle: 'Financial Accountant',
    roleBadge: 'Finance & Invoicing',
    email: 'accountant@uptoware.com',
    description: 'Sales invoicing, expense settlement & trip revenue audits.',
    icon: Calculator,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const { branding } = useBranding();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authenticatingUser, setAuthenticatingUser] = useState<string | null>(null);
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

  const handleQuickLogin = async (userEmail: string) => {
    setError(null);
    setEmail(userEmail);
    setPassword('admin');
    setAuthenticatingUser(userEmail);
    setIsLoading(true);

    try {
      const success = await login(userEmail, 'admin');
      if (success) {
        window.location.href = redirectPath;
      }
    } catch (err: any) {
      setError(err.message || `Quick login failed for ${userEmail}. Please verify credentials.`);
      setIsLoading(false);
      setAuthenticatingUser(null);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-900 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Responsive Card Container */}
      <div className="w-full max-w-4xl mx-auto my-auto z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Brand Header & Manual Credentials Form */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
              <div>
                <div className="relative w-48 h-10 mb-4">
                  <Image
                    src={branding.assets.logoDark}
                    alt={branding.name}
                    fill
                    priority
                    sizes="200px"
                    className="object-contain object-left"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Enterprise Fleet Portal
                </h1>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Fleet operations, dispatch authorization & statutory compliance
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {error && (
                    <div
                      data-testid="login-error-message"
                      className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
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

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-600"
                      />
                      <span>Remember terminal</span>
                    </label>
                    <span className="text-slate-400">SSO Enabled</span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading && !authenticatingUser}
                    disabled={isLoading}
                    className="w-full justify-center mt-2"
                  >
                    Access Fleet Portal
                  </Button>
                </form>
              </div>

              {/* Security Footnote */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Frappe v16 Business Engine</span>
                </div>
                <span>TLS 256-bit Encrypted</span>
              </div>
            </div>

            {/* Right Column: Quick Demo Access (1-Click Login) */}
            <div className="lg:col-span-6 p-6 sm:p-8 bg-slate-50/75 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Quick Demo Access
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    1-Click Login
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Select an operational role to authenticate immediately:
                </p>

                <div className="space-y-2">
                  {DEMO_USERS.map((demo) => {
                    const Icon = demo.icon;
                    const isThisUserAuthenticating = authenticatingUser === demo.email;

                    return (
                      <button
                        key={demo.id}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickLogin(demo.email)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                          demo.isPrimaryAdmin
                            ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                            : 'bg-white border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                        } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`p-1.5 rounded-lg flex-shrink-0 ${
                              demo.isPrimaryAdmin
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                                {demo.name}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                  demo.isPrimaryAdmin
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {demo.roleBadge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {demo.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex-shrink-0 ml-1">
                          {isThisUserAuthenticating ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informational Hint */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Demo Admin: View, Edit & Delete</span>
                <span>Code management locked</span>
              </div>
            </div>

          </div>
        </div>

        {/* Brand Copyright Notice */}
        <p className="mt-4 text-center text-xs text-slate-500 font-medium">
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
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

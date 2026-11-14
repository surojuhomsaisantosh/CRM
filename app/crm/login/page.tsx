'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/branding/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFillDemo = () => {
    setEmail('admin@crm.internal');
    setPassword('admin123');
    toast.info('Demo credentials filled: admin@crm.internal / admin123');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Instant Demo Bypass Check (Works out-of-the-box before Supabase connection)
      const cleanEmail = email.trim().toLowerCase();
      if (
        (cleanEmail === 'admin@crm.internal' || cleanEmail === 'admin@crm.com' || cleanEmail === 'demo@crm.internal') &&
        password === 'admin123'
      ) {
        document.cookie = 'crm_demo_session=admin; path=/; max-age=86400; SameSite=Lax';
        toast.success('Demo login successful! Logged in as Super Admin.');
        router.push('/crm');
        router.refresh();
        return;
      }

      // 2. Standard Supabase Auth Check (when Supabase credentials are configured)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error(error.message);
        return;
      }

      if (data?.user) {
        toast.success('Login successful!');
        router.push('/crm');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d33] tracking-tight">
            C<span style={{ color: 'var(--crm-accent, #c4a55a)' }}>RM</span>
          </h1>
          <p className="text-sm text-[#5a6a82]">
            Enter your credentials to access the internal dashboard.
          </p>
        </div>

        {/* Demo Credentials Quick-Card */}
        <div className="rounded-xl border border-[#c4a55a]/40 bg-[#fffdfa] p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8a7238]">
                <Sparkles className="w-3.5 h-3.5" /> Demo Access Ready
              </span>
              <p className="text-xs text-[#5a6a82]">
                Email: <code className="font-mono text-[#0f1d33] font-semibold">admin@crm.internal</code>
                <br />
                Password: <code className="font-mono text-[#0f1d33] font-semibold">admin123</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#0f1d33] transition-colors shadow-2xs hover:opacity-90"
              style={{ backgroundColor: 'var(--crm-accent, #c4a55a)' }}
            >
              Fill Demo
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 sm:p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0f1d33] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a99ad]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-[#d8e0ea] bg-[#fbfcfd] pl-10 pr-4 py-2.5 text-sm text-[#0f1d33] placeholder-[#94a3b8] focus:border-[#0f1d33] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1d33] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#0f1d33] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a99ad]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#d8e0ea] bg-[#fbfcfd] pl-10 pr-11 py-2.5 text-sm text-[#0f1d33] placeholder-[#94a3b8] focus:border-[#0f1d33] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1d33] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8a99ad] hover:text-[#0f1d33] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1d33] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b47] focus:outline-none focus:ring-2 focus:ring-[#0f1d33] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-[#8a99ad]">
          Protected enterprise portal &bull; Authorized personnel only
        </p>
      </div>
    </div>
  );
}

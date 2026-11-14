'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Universal';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0f1d33] to-[#1e3a5f] shadow-lg shadow-[#0f1d33]/10 text-[#c4a55a] mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d33] tracking-tight">
            C<span className="text-[#c4a55a]">RM</span>
          </h1>
          <p className="text-sm text-[#5a6a82]">
            Enter your credentials to access the internal dashboard.
          </p>
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

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLogo } from '@/app/crm/settings/brand-settings/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Authenticate via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        setIsLoggingIn(true);
        toast.success('Login successful!');
        router.push('/crm');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      toast.error('Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/crm/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      // OWASP guidelines: Prevent user enumeration by returning a generic confirmation
      if (error && error.status === 429) {
        setErrorMessage('Too many requests. Please wait a moment and try again.');
        toast.error('Too many requests. Please wait a moment.');
        return;
      }

      setForgotSuccess(true);
      toast.success('If the email exists, a password reset link has been sent.');
    } catch {
      setForgotSuccess(true);
      toast.success('If the email exists, a password reset link has been sent.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center mb-1">
            <BrandLogo size="2xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d33] tracking-tight">
            Login to C<span style={{ color: 'var(--crm-accent, #c4a55a)' }}>RM</span>
          </h1>
          {mode === 'forgot' && (
            <p className="text-sm text-[#5a6a82]">
              Recover your account access via your registered email.
            </p>
          )}
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 sm:p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {mode === 'signin' ? (
            /* Sign In Form */
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
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                      setForgotSuccess(false);
                    }}
                    className="text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8a99ad] hover:text-[#0f1d33] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isLoggingIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1d33] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b47] focus:outline-none focus:ring-2 focus:ring-[#0f1d33] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : isLoading ? (
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
          ) : (
            /* Forgot Password Form */
            <div>
              {forgotSuccess ? (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#0f1d33]">Check Your Email</h3>
                    <p className="text-xs text-[#5a6a82] leading-relaxed">
                      If an account exists for <strong className="text-[#0f1d33]">{email}</strong>, a password reset link has been sent. Please check your inbox and spam folder.
                    </p>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setForgotSuccess(false);
                      }}
                      className="text-xs font-semibold text-[#0f1d33] hover:underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0f1d33] uppercase tracking-wider">
                      Your Registered Email
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1d33] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b47] focus:outline-none focus:ring-2 focus:ring-[#0f1d33] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending recovery link...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Recovery Link</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMessage('');
                      }}
                      className="text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] transition-colors cursor-pointer"
                    >
                      Remember your password? Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

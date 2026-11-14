'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLogo } from '@/app/crm/settings/brand-settings/BrandLogo';
import { PasswordChecklist } from '@/lib/auth/PasswordChecklist';
import { validatePasswordPolicy } from '@/lib/auth/password-policy';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if there is an active session or recovery token
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        // Also listen for auth state changes (e.g. from hash token in URL)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
            setHasSession(true);
          }
        });
        return () => subscription.unsubscribe();
      }
    }
    checkSession();
  }, [supabase]);

  const policy = validatePasswordPolicy(password);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!policy.isValid) {
      setErrorMessage('Please ensure your password satisfies all policy requirements (12-20 characters, 1 uppercase, 1 number, 1 special character).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        router.push('/crm');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
      toast.error('Error updating password.');
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
            Set New Password
          </h1>
          <p className="text-sm text-[#5a6a82]">
            Enter and confirm your new secure password below.
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 sm:p-8 shadow-sm">
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0f1d33]">Password Updated!</h3>
              <p className="text-xs text-[#5a6a82]">
                Your password has been changed successfully. Redirecting you to the dashboard...
              </p>
              <div className="pt-2">
                <Link
                  href="/crm"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f1d33] hover:underline"
                >
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0f1d33] uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a99ad]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      maxLength={20}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password (12-20 characters)"
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
                  {/* Live Password Requirements Checklist */}
                  <PasswordChecklist password={password} confirmPassword={confirmPassword} className="mt-2" />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0f1d33] uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#8a99ad]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-xl border border-[#d8e0ea] bg-[#fbfcfd] pl-10 pr-11 py-2.5 text-sm text-[#0f1d33] placeholder-[#94a3b8] focus:border-[#0f1d33] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1d33] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8a99ad] hover:text-[#0f1d33] transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Real-time Password Match Indicator */}
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1.5 transition-colors ${
                      password === confirmPassword ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {password === confirmPassword ? (
                        <>
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          </div>
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-2.5 h-2.5 text-red-600 stroke-[3]" />
                          </div>
                          <span>Passwords do not match yet</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !policy.isValid || !confirmPassword || password !== confirmPassword}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1d33] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b47] focus:outline-none focus:ring-2 focus:ring-[#0f1d33] focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-[#f1f4f8] text-center">
            <Link
              href="/crm/login"
              className="text-xs font-semibold text-[#5a6a82] hover:text-[#0f1d33] transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

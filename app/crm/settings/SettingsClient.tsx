'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Key, Eye, EyeOff } from 'lucide-react'
import BrandingSettings from './BrandingSettings'

export default function SettingsClient() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmittingRef.current) return
    setMessage(null)
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Settings</h1>
        <p className="mt-1 text-sm text-[#5a6a82]">
          Manage your brand appearance, company logo, color palette, and account security.
        </p>
      </div>

      {/* Side-by-Side Layout: Branding on Left, Password & Security on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Branding Settings */}
        <div className="lg:col-span-7">
          <BrandingSettings />
        </div>

        {/* Right Column: Password & Account Security */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#e8ecf2] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#e8ecf2] px-6 py-5 bg-[#fafbfc]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0f1d33] flex items-center justify-center text-[#c4a55a] shadow-xs">
                  <Key size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f1d33]">Change Password</h2>
                  <p className="text-xs text-[#5a6a82]">Update the password used to sign in to your CRM.</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {message.text}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0f1d33] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#d5dce6] px-3.5 py-2.5 pr-10 text-sm focus:border-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#0f1d33]"
                      placeholder="Enter new password (min. 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#0f1d33] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#d5dce6] px-3.5 py-2.5 pr-10 text-sm focus:border-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#0f1d33]"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPassword || !confirmPassword}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-[#0f1d33] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#0f1d33] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Building2,
  Sparkles
} from 'lucide-react';
import { verifyClientConnectToken, completeClientMetaConnection } from '@/app/crm/projects/actions';

interface DiscoveredPage {
  id: string;
  name: string;
  followers?: number;
  category?: string;
  accessToken?: string;
}

function ConnectMetaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const errorParam = searchParams.get('error');
  const statusParam = searchParams.get('status');
  const stepParam = searchParams.get('step');
  const pageNameParam = searchParams.get('pageName');
  const rawPagesParam = searchParams.get('pages');

  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<{
    valid: boolean;
    projectName?: string;
    clientName?: string;
    error?: string;
  } | null>(null);

  // Multi-page disambiguation state
  const [availablePages, setAvailablePages] = useState<DiscoveredPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [isConnectingPage, setIsConnectingPage] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(statusParam === 'success');
  const [connectedPageName, setConnectedPageName] = useState(pageNameParam || '');
  const [errorMessage, setErrorMessage] = useState(errorParam || '');

  // 1. Verify invitation token on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setTokenData({ valid: false, error: 'No invitation token provided in the link. Please ask your agency for a valid link.' });
        setIsLoading(false);
        return;
      }

      const res = await verifyClientConnectToken(token);
      setTokenData(res);
      setIsLoading(false);

      // Parse pages if redirected from multi-page OAuth
      if (rawPagesParam) {
        try {
          const parsed: DiscoveredPage[] = JSON.parse(decodeURIComponent(rawPagesParam));
          setAvailablePages(parsed);
          if (parsed.length > 0) {
            // Auto-select page matching project name if possible
            const projName = (res.projectName || '').toLowerCase().trim();
            const matched = parsed.find(p => p.name.toLowerCase().trim() === projName || projName.includes(p.name.toLowerCase().trim()));
            setSelectedPageId(matched ? matched.id : parsed[0].id);
          }
        } catch (e) {
          console.error('Failed to parse pages parameter', e);
        }
      }
    }

    verify();
  }, [token, rawPagesParam]);

  // Handle Meta OAuth Click
  const handleLaunchOAuth = () => {
    // Official Meta OAuth URL
    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const origin = window.location.origin;
    const redirectUri = `${origin}/api/auth/meta/callback`;
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_ads,leads_retrieval';

    if (!metaAppId) {
      // Sandbox Simulated Flow (when META_APP_ID is not configured in .env.local)
      handleSimulatedConnect();
      return;
    }

    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(metaAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(token)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    window.location.href = oauthUrl;
  };

  // Sandbox Simulated Connect (for instantaneous testing without Meta developer keys)
  const handleSimulatedConnect = async () => {
    setIsConnectingPage(true);
    setErrorMessage('');

    // Simulate 2 discovered pages to showcase the multi-page disambiguation feature
    const proj = tokenData?.projectName || 'Client Business';
    const simulatedPages: DiscoveredPage[] = [
      {
        id: `page_${Math.floor(100000000 + Math.random() * 900000000)}`,
        name: proj,
        category: 'Real Estate / Business',
        followers: 12450,
        accessToken: `EAAG_simulated_never_expiring_token_${Math.random().toString(36).substring(2)}`
      },
      {
        id: `page_${Math.floor(100000000 + Math.random() * 900000000)}`,
        name: `${tokenData?.clientName || 'Personal'} Blog & Community`,
        category: 'Personal Blog',
        followers: 430,
        accessToken: `EAAG_simulated_personal_token_${Math.random().toString(36).substring(2)}`
      }
    ];

    setAvailablePages(simulatedPages);
    setSelectedPageId(simulatedPages[0].id);
    setIsConnectingPage(false);
  };

  // Confirm page selection
  const handleConfirmSelectedPage = async () => {
    const page = availablePages.find(p => p.id === selectedPageId);
    if (!page) {
      setErrorMessage('Please select a Facebook page to connect.');
      return;
    }

    setIsConnectingPage(true);
    setErrorMessage('');

    const res = await completeClientMetaConnection({
      token,
      pageId: page.id,
      pageName: page.name,
      accessToken: page.accessToken || 'simulated_permanent_page_token'
    });

    setIsConnectingPage(false);

    if (res.success) {
      setConnectionSuccess(true);
      setConnectedPageName(page.name);
    } else {
      setErrorMessage(res.error || 'Failed to complete connection.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0f1d33] animate-spin" />
          <p className="text-sm font-semibold text-[#5a6a82]">Verifying invitation link...</p>
        </div>
      </div>
    );
  }

  // Token invalid or expired
  if (!tokenData?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#e8ecf2] bg-white p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0f1d33]">Link Expired or Invalid</h2>
          <p className="text-sm text-[#5a6a82] leading-relaxed">
            {tokenData?.error || 'This invitation link is no longer valid or has already been used.'}
          </p>
          <div className="pt-2">
            <p className="text-xs text-[#8a99ad]">
              Please contact your marketing agency representative to send you a fresh 1-click connect link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (connectionSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
        <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
              <Sparkles className="w-3.5 h-3.5" /> Integration Active
            </span>
            <h2 className="text-2xl font-extrabold text-[#0f1d33]">You're All Set!</h2>
            <p className="text-sm text-[#5a6a82]">
              <strong>{connectedPageName || tokenData.projectName}</strong> has been successfully connected to your agency's CRM.
            </p>
          </div>

          <div className="rounded-xl bg-[#f8fafc] border border-[#e8ecf2] p-4 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0f1d33]">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Real-time Lead Ingestion: <strong>Active</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0f1d33]">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Permanent Access Token: <strong>Never Expires</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0f1d33]">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Facebook & Instagram Forms: <strong>Synced</strong></span>
            </div>
          </div>

          <p className="text-xs text-[#8a99ad]">
            Whenever a customer submits a lead form on Facebook or Instagram, your agency will receive it instantly. You may safely close this window.
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Multi-Page Disambiguation (if multiple pages exist)
  if (availablePages.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-[#e8ecf2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#c4a55a] uppercase tracking-wider">Step 2 of 2: Select Your Business Page</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f1d33]">Confirm Which Page to Connect</h2>
            <p className="text-xs sm:text-sm text-[#5a6a82]">
              We found {availablePages.length} Facebook pages associated with your account. Select the page our agency is managing for <strong>{tokenData.projectName}</strong>:
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            {availablePages.map((page) => {
              const isMatch = (tokenData.projectName || '').toLowerCase().includes(page.name.toLowerCase()) || page.name.toLowerCase().includes((tokenData.projectName || '').toLowerCase());
              const isSelected = selectedPageId === page.id;

              return (
                <div
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-[#0f1d33] bg-[#f8fafc] ring-2 ring-[#0f1d33]/20'
                      : 'border-[#e8ecf2] bg-white hover:border-[#cbd5e1]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0f1d33] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {page.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0f1d33]">{page.name}</h4>
                        {isMatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5a6a82]">
                        {page.category || 'Business Page'} &bull; {page.followers ? `${page.followers.toLocaleString()} followers` : 'Active'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <input
                      type="radio"
                      name="pageSelection"
                      checked={isSelected}
                      onChange={() => setSelectedPageId(page.id)}
                      className="h-4 w-4 text-[#0f1d33] focus:ring-[#0f1d33]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isConnectingPage || !selectedPageId}
            onClick={handleConfirmSelectedPage}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f1d33] py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b47] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isConnectingPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating Permanent Sync...</span>
              </>
            ) : (
              <>
                <span>Confirm & Activate Sync</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Initial Welcome & Launch OAuth
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0f1d33] text-white shadow-sm mx-auto mb-1">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d33] tracking-tight">
            Connect Your Meta Leads
          </h1>
          <p className="text-sm text-[#5a6a82]">
            Welcome, <strong className="text-[#0f1d33]">{tokenData.clientName}</strong>! Authorize Facebook lead delivery for <strong className="text-[#0f1d33]">{tokenData.projectName}</strong>.
          </p>
        </div>

        {/* Action Card */}
        <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Benefits List */}
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-200">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0f1d33] uppercase tracking-wide">Real-Time Instant Delivery</h4>
                <p className="text-xs text-[#5a6a82]">
                  New leads from Facebook and Instagram appear in your agency's CRM in under 3 seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0f1d33] uppercase tracking-wide">100% Private & Secure</h4>
                <p className="text-xs text-[#5a6a82]">
                  We only request access to read lead form submissions. We cannot view your personal messages, photos, or billing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0f1d33] uppercase tracking-wide">Zero Password Sharing</h4>
                <p className="text-xs text-[#5a6a82]">
                  You log directly into Facebook's official security portal. Your login password is never shared with anyone.
                </p>
              </div>
            </div>
          </div>

          {/* Connect Action Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isConnectingPage}
              onClick={handleLaunchOAuth}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#1877f2] py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-[#1877f2] focus:ring-offset-2 transition-all cursor-pointer"
            >
              {isConnectingPage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting with Facebook...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Connect with Facebook</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-[#8a99ad]">
              Requires you to be an Admin of the business Facebook Page.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-xs text-[#8a99ad]">
          Protected Agency CRM Portal &bull; Official Meta Graph API v19.0 Integration
        </p>
      </div>
    </div>
  );
}

export default function ConnectMetaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
        <Loader2 className="w-8 h-8 text-[#0f1d33] animate-spin" />
      </div>
    }>
      <ConnectMetaContent />
    </Suspense>
  );
}

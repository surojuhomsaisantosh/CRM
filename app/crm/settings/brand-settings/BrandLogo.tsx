'use client';

import React, { useEffect, useState } from 'react';
import {
  getStoredBrandSettings,
  BrandSettings,
  DEFAULT_BRAND_SETTINGS,
  COLOR_PALETTES,
} from '@/lib/branding';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showContainer?: boolean;
}

export function BrandLogo({
  className = '',
  size = 'md',
  showContainer = true,
}: BrandLogoProps) {
  const [branding, setBranding] = useState<BrandSettings>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBrandSettings();
    }
    return DEFAULT_BRAND_SETTINGS;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBranding(getStoredBrandSettings());

    const handleUpdate = () => {
      setBranding(getStoredBrandSettings());
    };

    window.addEventListener('crm-branding-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('crm-branding-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const palette = COLOR_PALETTES.find((p) => p.id === branding.paletteId) || COLOR_PALETTES[0];
  const accentColor = branding.customAccent || palette.accent;

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg',
  };

  // If user uploaded a custom logo image
  if (branding.customLogoUrl) {
    if (!showContainer) {
      return (
        <img
          src={branding.customLogoUrl}
          alt="CRM Logo"
          className={`object-contain max-h-full ${className}`}
        />
      );
    }

    const isLarge = size === 'lg' || size === 'xl';

    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white border border-[#e8ecf2] shadow-sm overflow-hidden shrink-0 transition-transform ${
          isLarge
            ? 'h-16 max-w-[240px] px-3.5 py-1.5'
            : `${sizeClasses[size]} p-1`
        } ${className}`}
      >
        <img
          src={branding.customLogoUrl}
          alt="CRM Logo"
          className="object-contain w-auto h-auto max-h-12 max-w-full"
        />
      </div>
    );
  }

  // Clean, professional default CRM brand monogram
  const defaultMark = (
    <div className="flex items-center justify-center font-extrabold tracking-wider font-mono select-none" style={{ color: accentColor }}>
      CRM
    </div>
  );

  if (!showContainer) {
    return defaultMark;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f1d33] to-[#1e3a5f] border border-white/10 shadow-md shadow-[#0f1d33]/15 shrink-0 transition-transform ${sizeClasses[size]} ${className}`}
    >
      {defaultMark}
    </div>
  );
}

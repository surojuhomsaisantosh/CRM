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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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

  const sizeClasses: Record<string, string> = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
    '3xl': 'w-32 h-32 text-3xl',
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

    const containerStyle = {
      '3xl': 'h-32 max-w-[360px] px-6 py-3 rounded-2xl',
      '2xl': 'h-24 max-w-[320px] px-5 py-2.5 rounded-2xl',
      xl: 'h-20 max-w-[280px] px-4 py-2 rounded-2xl',
      lg: 'h-16 max-w-[240px] px-3.5 py-1.5 rounded-2xl',
      md: `${sizeClasses.md} p-1 rounded-xl`,
      sm: `${sizeClasses.sm} p-0.5 rounded-lg`,
    }[size] || 'h-24 max-w-[320px] px-5 py-2.5 rounded-2xl';

    const imgMaxHeight = {
      '3xl': 'max-h-24',
      '2xl': 'max-h-20',
      xl: 'max-h-16',
      lg: 'max-h-12',
      md: 'max-h-8',
      sm: 'max-h-6',
    }[size] || 'max-h-20';

    return (
      <div
        className={`flex items-center justify-center bg-white border border-[#e8ecf2] shadow-sm overflow-hidden shrink-0 transition-transform ${containerStyle} ${className}`}
      >
        <img
          src={branding.customLogoUrl}
          alt="CRM Logo"
          className={`object-contain w-auto h-auto ${imgMaxHeight} max-w-full`}
        />
      </div>
    );
  }

  // Clean, professional default CRM brand monogram
  const defaultMark = (
    <div
      className={`flex items-center justify-center font-extrabold tracking-wider font-mono select-none ${
        size === '3xl'
          ? 'text-3xl'
          : size === '2xl'
          ? 'text-2xl'
          : size === 'xl'
          ? 'text-lg'
          : size === 'lg'
          ? 'text-sm'
          : 'text-xs'
      }`}
      style={{ color: accentColor }}
    >
      CRM
    </div>
  );

  if (!showContainer) {
    return defaultMark;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f1d33] to-[#1e3a5f] border border-white/10 shadow-lg shadow-[#0f1d33]/15 shrink-0 transition-transform ${sizeClasses[size] || sizeClasses['2xl']} ${className}`}
    >
      {defaultMark}
    </div>
  );
}

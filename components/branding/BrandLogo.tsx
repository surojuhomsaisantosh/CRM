'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Crown,
  Shield,
  Diamond,
  Zap,
  Sparkles,
  Layers,
  Rocket,
} from 'lucide-react';
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
  const [branding, setBranding] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
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
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 40,
  };

  const renderIcon = () => {
    const s = iconSizes[size];
    switch (branding.selectedIcon) {
      case 'Crown':
        return <Crown size={s} style={{ color: accentColor }} />;
      case 'Shield':
        return <Shield size={s} style={{ color: accentColor }} />;
      case 'Diamond':
        return <Diamond size={s} style={{ color: accentColor }} />;
      case 'Zap':
        return <Zap size={s} style={{ color: accentColor }} />;
      case 'Sparkles':
        return <Sparkles size={s} style={{ color: accentColor }} />;
      case 'Layers':
        return <Layers size={s} style={{ color: accentColor }} />;
      case 'Rocket':
        return <Rocket size={s} style={{ color: accentColor }} />;
      case 'Building2':
      default:
        return <Building2 size={s} style={{ color: accentColor }} />;
    }
  };

  // If user uploaded a custom logo image
  if (branding.logoType === 'image' && branding.customLogoUrl) {
    if (!showContainer) {
      return (
        <img
          src={branding.customLogoUrl}
          alt="CRM Logo"
          className={`object-contain max-h-full ${className}`}
        />
      );
    }
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white border border-[#e8ecf2] shadow-sm overflow-hidden p-1 ${sizeClasses[size]} ${className}`}
      >
        <img
          src={branding.customLogoUrl}
          alt="CRM Logo"
          className="object-contain w-full h-full max-h-full"
        />
      </div>
    );
  }

  // Otherwise render icon with dynamic styling
  if (!showContainer) {
    return renderIcon();
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f1d33] to-[#1e3a5f] shadow-md shadow-[#0f1d33]/10 shrink-0 transition-transform ${sizeClasses[size]} ${className}`}
    >
      {renderIcon()}
    </div>
  );
}

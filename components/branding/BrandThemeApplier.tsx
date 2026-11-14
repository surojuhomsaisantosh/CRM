'use client';

import { useEffect } from 'react';
import { getStoredBrandSettings, applyBrandCSSVariables } from '@/lib/branding';

export function BrandThemeApplier() {
  useEffect(() => {
    const apply = () => {
      const settings = getStoredBrandSettings();
      applyBrandCSSVariables(settings);
    };

    apply();
    window.addEventListener('crm-branding-updated', apply);
    window.addEventListener('storage', apply);

    return () => {
      window.removeEventListener('crm-branding-updated', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  return null;
}

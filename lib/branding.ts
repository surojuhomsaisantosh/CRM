export interface ColorPalette {
  id: string;
  name: string;
  primary: string;      // Main dark tone (sidebar, headers)
  accent: string;       // Accent tone (gold, blue, green, etc.)
  accentHover: string;
  accentBg: string;     // Soft light background
  previewGradient: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'gold',
    name: 'Executive Gold',
    primary: '#0f1d33',
    accent: '#c4a55a',
    accentHover: '#b39449',
    accentBg: '#fffdfa',
    previewGradient: 'from-[#0f1d33] to-[#c4a55a]',
  },
  {
    id: 'emerald',
    name: 'Emerald Wealth',
    primary: '#064e3b',
    accent: '#10b981',
    accentHover: '#059669',
    accentBg: '#ecfdf5',
    previewGradient: 'from-[#064e3b] to-[#10b981]',
  },
  {
    id: 'sapphire',
    name: 'Royal Sapphire',
    primary: '#1e3a8a',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentBg: '#eff6ff',
    previewGradient: 'from-[#1e3a8a] to-[#3b82f6]',
  },
  {
    id: 'violet',
    name: 'Electric Violet',
    primary: '#3b0764',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentBg: '#f5f3ff',
    previewGradient: 'from-[#3b0764] to-[#8b5cf6]',
  },
  {
    id: 'crimson',
    name: 'Ruby Crimson',
    primary: '#4c0519',
    accent: '#e11d48',
    accentHover: '#be123c',
    accentBg: '#fff1f2',
    previewGradient: 'from-[#4c0519] to-[#e11d48]',
  },
  {
    id: 'amber',
    name: 'Midnight Amber',
    primary: '#18181b',
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentBg: '#fffbeb',
    previewGradient: 'from-[#18181b] to-[#f59e0b]',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    primary: '#134e4a',
    accent: '#14b8a6',
    accentHover: '#0d9488',
    accentBg: '#f0fdfa',
    previewGradient: 'from-[#134e4a] to-[#14b8a6]',
  },
  {
    id: 'slate',
    name: 'Titanium Slate',
    primary: '#0f172a',
    accent: '#0284c7',
    accentHover: '#0369a1',
    accentBg: '#f8fafc',
    previewGradient: 'from-[#0f172a] to-[#0284c7]',
  },
];

export const PRESET_ICONS = [
  'Building2',
  'Crown',
  'Shield',
  'Diamond',
  'Zap',
  'Sparkles',
  'Layers',
  'Rocket'
] as const;

export type PresetIconName = typeof PRESET_ICONS[number];

export interface BrandSettings {
  paletteId: string;
  customAccent?: string;
  customPrimary?: string;
  logoType: 'icon' | 'image';
  selectedIcon: PresetIconName;
  customLogoUrl?: string; // Base64 dataURL or public URL
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  paletteId: 'gold',
  logoType: 'icon',
  selectedIcon: 'Building2',
};

export const BRAND_STORAGE_KEY = 'crm_custom_branding';

export function getStoredBrandSettings(): BrandSettings {
  if (typeof window === 'undefined') return DEFAULT_BRAND_SETTINGS;
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_SETTINGS;
    return { ...DEFAULT_BRAND_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRAND_SETTINGS;
  }
}

export function saveStoredBrandSettings(settings: BrandSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(settings));
    // Also save in cookie for server / initial renders
    document.cookie = `${BRAND_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(settings))}; path=/; max-age=31536000; SameSite=Lax`;
    applyBrandCSSVariables(settings);
    // Dispatch custom event so all open tabs / components update live
    window.dispatchEvent(new Event('crm-branding-updated'));
  } catch (err) {
    console.error('Failed to save branding:', err);
  }
}

export function applyBrandCSSVariables(settings: BrandSettings) {
  if (typeof document === 'undefined') return;
  const palette = COLOR_PALETTES.find((p) => p.id === settings.paletteId) || COLOR_PALETTES[0];
  const accent = settings.customAccent || palette.accent;
  const primary = settings.customPrimary || palette.primary;
  const accentBg = palette.accentBg;

  const root = document.documentElement;
  root.style.setProperty('--crm-accent', accent);
  root.style.setProperty('--crm-primary', primary);
  root.style.setProperty('--crm-accent-bg', accentBg);
}

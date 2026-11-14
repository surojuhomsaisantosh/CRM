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

// Color Search Map: Named colors mapping to HEX codes
export const NAMED_COLOR_MAP: Record<string, { hex: string; label: string }> = {
  gold: { hex: '#c4a55a', label: 'Executive Gold' },
  golden: { hex: '#ffd700', label: 'Bright Gold' },
  yellow: { hex: '#eab308', label: 'Warm Yellow' },
  amber: { hex: '#f59e0b', label: 'Amber Orange' },
  orange: { hex: '#f97316', label: 'Vibrant Orange' },
  coral: { hex: '#fb7185', label: 'Soft Coral' },
  red: { hex: '#ef4444', label: 'Vivid Red' },
  crimson: { hex: '#e11d48', label: 'Ruby Crimson' },
  ruby: { hex: '#be123c', label: 'Deep Ruby' },
  rose: { hex: '#f43f5e', label: 'Rose Pink' },
  pink: { hex: '#ec4899', label: 'Neon Pink' },
  magenta: { hex: '#d946ef', label: 'Magenta' },
  purple: { hex: '#a855f7', label: 'Vibrant Purple' },
  violet: { hex: '#8b5cf6', label: 'Electric Violet' },
  indigo: { hex: '#6366f1', label: 'Classic Indigo' },
  blue: { hex: '#3b82f6', label: 'Royal Sapphire' },
  sky: { hex: '#0ea5e9', label: 'Sky Blue' },
  cyan: { hex: '#06b6d4', label: 'Electric Cyan' },
  teal: { hex: '#14b8a6', label: 'Ocean Teal' },
  emerald: { hex: '#10b981', label: 'Emerald Wealth' },
  green: { hex: '#22c55e', label: 'Spring Green' },
  lime: { hex: '#84cc16', label: 'Lime Green' },
  bronze: { hex: '#cd7f32', label: 'Metallic Bronze' },
  navy: { hex: '#1e3a8a', label: 'Deep Navy' },
  charcoal: { hex: '#334155', label: 'Modern Charcoal' },
  black: { hex: '#0f172a', label: 'Midnight Black' },
};

export interface BrandSettings {
  paletteId: string;
  customAccent?: string;
  customPrimary?: string;
  customLogoUrl?: string; // Uploaded custom logo image dataURL / URL
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  paletteId: 'gold',
  customAccent: '#c4a55a',
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

// Convert HSL to Hex
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Convert Hex to HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { h: 42, s: 50, l: 56 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Search a color string (name, hex, or rgb)
export function parseColorSearch(query: string): { hex: string; label: string } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Direct match in named dictionary
  if (NAMED_COLOR_MAP[q]) {
    return NAMED_COLOR_MAP[q];
  }

  // Partial match in named dictionary (e.g. "purp" -> purple)
  for (const [name, info] of Object.entries(NAMED_COLOR_MAP)) {
    if (name.includes(q) || info.label.toLowerCase().includes(q)) {
      return info;
    }
  }

  // Hex format check (#fff or #ffffff)
  const hexRegex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (hexRegex.test(q)) {
    let clean = q.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    return { hex: `#${clean.toLowerCase()}`, label: `Hex #${clean.toUpperCase()}` };
  }

  // RGB format check: rgb(255, 0, 128) or 255, 0, 128
  const rgbMatch = q.match(/^(?:rgb\s*\(\s*)?(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*\)?$/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10));
    const g = Math.min(255, parseInt(rgbMatch[2], 10));
    const b = Math.min(255, parseInt(rgbMatch[3], 10));
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return { hex, label: `RGB(${r}, ${g}, ${b})` };
  }

  return null;
}

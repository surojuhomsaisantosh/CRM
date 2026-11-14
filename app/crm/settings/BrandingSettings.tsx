'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Palette,
  Upload,
  RotateCcw,
  Sparkles,
  Save,
  CheckCircle2,
  Trash2,
  Search,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  COLOR_PALETTES,
  BrandSettings,
  DEFAULT_BRAND_SETTINGS,
  getStoredBrandSettings,
  saveStoredBrandSettings,
  hslToHex,
  hexToHsl,
  parseColorSearch,
  NAMED_COLOR_MAP,
} from '@/lib/branding';

const WHEEL_SIZE = 200;
const RADIUS = WHEEL_SIZE / 2;

export default function BrandingSettings() {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [currentHex, setCurrentHex] = useState('#c4a55a');
  const [hsl, setHsl] = useState({ h: 42, s: 50, l: 56 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize from storage
  useEffect(() => {
    const stored = getStoredBrandSettings();
    setSettings(stored);
    const initialHex = stored.customAccent || '#c4a55a';
    setCurrentHex(initialHex);
    setHsl(hexToHsl(initialHex));
  }, []);

  // Draw the RGB circular color wheel on canvas
  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = imgData.data;

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - RADIUS;
        const dy = y - RADIUS;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * WHEEL_SIZE + x) * 4;

        if (dist <= RADIUS - 2) {
          // Angle in degrees 0..360
          const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          const sat = Math.min(1, dist / (RADIUS - 2));
          const light = hsl.l / 100;

          // HSL to RGB
          const c = (1 - Math.abs(2 * light - 1)) * sat;
          const hPrime = angle / 60;
          const xVal = c * (1 - Math.abs((hPrime % 2) - 1));
          let r1 = 0, g1 = 0, b1 = 0;

          if (hPrime >= 0 && hPrime < 1) { r1 = c; g1 = xVal; }
          else if (hPrime >= 1 && hPrime < 2) { r1 = xVal; g1 = c; }
          else if (hPrime >= 2 && hPrime < 3) { g1 = c; b1 = xVal; }
          else if (hPrime >= 3 && hPrime < 4) { g1 = xVal; b1 = c; }
          else if (hPrime >= 4 && hPrime < 5) { r1 = xVal; b1 = c; }
          else { r1 = c; b1 = xVal; }

          const m = light - c / 2;
          data[idx] = Math.round((r1 + m) * 255);
          data[idx + 1] = Math.round((g1 + m) * 255);
          data[idx + 2] = Math.round((b1 + m) * 255);
          // Antialiased edge
          const alpha = dist > RADIUS - 4 ? Math.round((1 - (dist - (RADIUS - 4)) / 2) * 255) : 255;
          data[idx + 3] = alpha;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [hsl.l]);

  useEffect(() => {
    drawColorWheel();
  }, [drawColorWheel]);

  // Handle color selection on the wheel
  const handleWheelPick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - RADIUS;
    const y = clientY - rect.top - RADIUS;
    const dist = Math.min(RADIUS - 2, Math.sqrt(x * x + y * y));
    const angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    const sat = Math.round((dist / (RADIUS - 2)) * 100);

    const newHsl = { h: Math.round(angle), s: sat, l: hsl.l };
    setHsl(newHsl);
    const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setCurrentHex(hex);
    applyColor(hex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingWheel(true);
    handleWheelPick(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingWheel) return;
    handleWheelPick(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDraggingWheel(false);
  };

  // Touch event support for tablets
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleWheelPick(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Cursor position on the color wheel
  const getCursorPos = () => {
    const angleRad = (hsl.h * Math.PI) / 180;
    const dist = (hsl.s / 100) * (RADIUS - 2);
    return {
      x: RADIUS + dist * Math.cos(angleRad),
      y: RADIUS + dist * Math.sin(angleRad),
    };
  };

  const cursorPos = getCursorPos();

  // Apply color to settings
  const applyColor = (hex: string) => {
    setSettings((prev) => ({
      ...prev,
      customAccent: hex,
    }));
    document.documentElement.style.setProperty('--crm-accent', hex);
    setIsSaved(false);
  };

  // Search color handler
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const matched = parseColorSearch(searchQuery);
    if (matched) {
      setCurrentHex(matched.hex);
      const newHsl = hexToHsl(matched.hex);
      setHsl(newHsl);
      applyColor(matched.hex);
      toast.success(`Applied ${matched.label} (${matched.hex})`);
    } else {
      toast.error(`Color "${searchQuery}" not recognized. Try a color name (gold, blue, ruby) or hex (#ff5500).`);
    }
  };

  // Preset quick tags click
  const handlePresetClick = (hex: string) => {
    setCurrentHex(hex);
    const newHsl = hexToHsl(hex);
    setHsl(newHsl);
    applyColor(hex);
  };

  // Lightness slider change
  const handleLightnessChange = (newL: number) => {
    const updatedHsl = { ...hsl, l: newL };
    setHsl(updatedHsl);
    const hex = hslToHex(updatedHsl.h, updatedHsl.s, newL);
    setCurrentHex(hex);
    applyColor(hex);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        customLogoUrl: result,
      }));
      setIsSaved(false);
      toast.success('Company logo uploaded! Click "Save Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => {
      const next = { ...prev };
      delete next.customLogoUrl;
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsSaved(false);
    toast.info('Custom logo removed. Default CRM mark will be used.');
  };

  // Save changes
  const handleSaveAll = () => {
    saveStoredBrandSettings(settings);
    setIsSaved(true);
    toast.success('Branding saved! Updated across the CRM and Login page.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Reset to default
  const handleResetDefaults = () => {
    setSettings(DEFAULT_BRAND_SETTINGS);
    setCurrentHex('#c4a55a');
    setHsl(hexToHsl('#c4a55a'));
    saveStoredBrandSettings(DEFAULT_BRAND_SETTINGS);
    setIsSaved(true);
    toast.info('Reset branding to default executive theme');
  };

  // Popular search color tags
  const popularColors = [
    { name: 'Gold', hex: '#c4a55a' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Sapphire', hex: '#3b82f6' },
    { name: 'Ruby', hex: '#e11d48' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Coral', hex: '#fb7185' },
    { name: 'Teal', hex: '#14b8a6' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e8ecf2] p-6 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#f1f4f8]">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: currentHex }}
            >
              <Palette size={18} />
            </div>
            <h2 className="text-xl font-bold text-[#0f1d33]">Branding & Appearance</h2>
          </div>
          <p className="text-sm text-[#5a6a80] mt-1">
            Customize your company logo and choose your RGB color palette applied across the entire software.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5a6a80] hover:text-[#0f1d33] bg-[#f8fafc] hover:bg-[#edf2f7] rounded-lg border border-[#e2e8f0] transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: currentHex }}
          >
            {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {isSaved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* SECTION 1: CHOOSE YOUR LOGO */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f1d33] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentHex }} />
            Choose Your Logo
          </h3>
          <p className="text-xs text-[#5a6a80] mt-0.5">
            Upload your company logo. It will be displayed on the login page above the CRM title and in the sidebar header.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative border-2 border-dashed border-[#d5dce6] hover:border-[#0f1d33] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#fafbfc] hover:bg-white"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3 shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: currentHex }}
            >
              <Upload size={22} />
            </div>
            <p className="text-sm font-semibold text-[#0f1d33]">
              {settings.customLogoUrl ? 'Replace Company Logo' : 'Upload Company Logo'}
            </p>
            <p className="text-xs text-[#5a6a80] mt-1">
              Supports SVG, PNG, JPG, or WebP (transparent recommended, max 2MB)
            </p>
          </div>

          {/* Current Logo Preview card */}
          <div className="border border-[#e8ecf2] rounded-2xl p-5 flex flex-col justify-between bg-[#f8fafc]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a6a80]">
                Active Logo Preview
              </span>
              {settings.customLogoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
            </div>

            <div className="flex items-center justify-center py-4 bg-white rounded-xl border border-[#e8ecf2] shadow-inner min-h-[110px]">
              {settings.customLogoUrl ? (
                <img
                  src={settings.customLogoUrl}
                  alt="Custom Company Logo"
                  className="max-h-20 max-w-[200px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm border shadow-sm"
                    style={{
                      backgroundColor: '#0f1d33',
                      color: currentHex,
                      borderColor: currentHex,
                    }}
                  >
                    CRM
                  </div>
                  <span className="text-xs text-[#5a6a80]">Default CRM Mark (No file uploaded)</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#5a6a80] mt-2">
              {settings.customLogoUrl
                ? 'Your custom logo will render in place of the default CRM emblem.'
                : 'Upload a logo file to display your brand icon on the login screen.'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHOOSE YOUR COLOR PALETTE (RGB WHEEL + COLOR SEARCH BAR) */}
      <div className="space-y-5 pt-4 border-t border-[#f1f4f8]">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f1d33] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentHex }} />
            Choose Your Color Palette
          </h3>
          <p className="text-xs text-[#5a6a80] mt-0.5">
            Select a color using the interactive RGB circle with your mouse, or search any color name, hex code, or RGB value.
          </p>
        </div>

        {/* Color Search Bar */}
        <div className="space-y-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3.5 text-[#8c9ba5]" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                const match = parseColorSearch(e.target.value);
                if (match) {
                  setCurrentHex(match.hex);
                  setHsl(hexToHsl(match.hex));
                  applyColor(match.hex);
                }
              }}
              placeholder="Search color name (e.g. gold, sapphire, emerald, ruby, violet, cyan) or Hex/RGB..."
              className="w-full pl-10 pr-24 py-2.5 text-sm bg-[#f8fafc] border border-[#d5dce6] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1d33] transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm"
              style={{ backgroundColor: currentHex }}
            >
              Search
            </button>
          </form>

          {/* Popular Color Search Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#5a6a80] font-medium mr-1">Quick Picks:</span>
            {popularColors.map((color) => {
              const isActive = currentHex.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handlePresetClick(color.hex)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    isActive
                      ? 'border-[#0f1d33] bg-[#0f1d33] text-white shadow-xs font-bold'
                      : 'border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* RGB Circle & Interactive Sliders Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f8fafc] border border-[#e8ecf2] rounded-2xl p-5">
          {/* Column 1: Interactive RGB Circle */}
          <div className="flex flex-col items-center justify-center select-none">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6a80] mb-3">
              Interactive RGB Color Circle
            </span>

            <div
              className="relative cursor-crosshair rounded-full shadow-md p-1 bg-white border border-[#e2e8f0]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchMove={handleTouchMove}
            >
              <canvas
                ref={canvasRef}
                width={WHEEL_SIZE}
                height={WHEEL_SIZE}
                className="rounded-full block"
              />

              {/* Glowing Pointer Cursor */}
              <div
                className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform"
                style={{
                  left: cursorPos.x + 4,
                  top: cursorPos.y + 4,
                  backgroundColor: currentHex,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)',
                }}
              />
            </div>
            <p className="text-[11px] text-[#5a6a80] mt-3">
              Click or drag inside the circle to choose any hue & saturation.
            </p>
          </div>

          {/* Column 2: Brightness Slider, Active Hex & Values */}
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a6a80]">
                Lightness & Tone
              </span>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#5a6a80]">
                  <span>Dark</span>
                  <span className="font-mono font-semibold text-[#0f1d33]">{hsl.l}%</span>
                  <span>Bright</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="85"
                  value={hsl.l}
                  onChange={(e) => handleLightnessChange(Number(e.target.value))}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-black via-current to-white"
                  style={{
                    color: hslToHex(hsl.h, hsl.s, 50),
                  }}
                />
              </div>
            </div>

            {/* Active Color Preview & Code Display */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl shadow-inner border border-black/10 shrink-0"
                  style={{ backgroundColor: currentHex }}
                />
                <div>
                  <div className="text-xs text-[#5a6a80] uppercase font-bold tracking-wider">
                    Selected Accent Color
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#0f1d33] uppercase">
                    {currentHex}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#f8fafc] px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-[#5a6a80]">
                  <span className="text-[#8c9ba5] block text-[10px] uppercase font-sans">Hue / Sat / Light</span>
                  {hsl.h}° / {hsl.s}% / {hsl.l}%
                </div>
                <div className="bg-[#f8fafc] px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-[#5a6a80]">
                  <span className="text-[#8c9ba5] block text-[10px] uppercase font-sans">CSS Variable</span>
                  var(--crm-accent)
                </div>
              </div>
            </div>

            {/* Live UI Test Badges */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a6a80]">
                Live Preview Across CRM Elements
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm"
                  style={{ backgroundColor: currentHex }}
                >
                  Primary Button
                </button>
                <div
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border"
                  style={{
                    backgroundColor: `${currentHex}15`,
                    color: currentHex,
                    borderColor: `${currentHex}40`,
                  }}
                >
                  Active Status
                </div>
                <span
                  className="text-xs font-bold underline cursor-pointer"
                  style={{ color: currentHex }}
                >
                  Text Link
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

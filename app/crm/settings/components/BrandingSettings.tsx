'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Building2,
  Crown,
  Shield,
  Diamond,
  Zap,
  Layers,
  Rocket,
  Image as ImageIcon,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  COLOR_PALETTES,
  PRESET_ICONS,
  PresetIconName,
  BrandSettings,
  DEFAULT_BRAND_SETTINGS,
  getStoredBrandSettings,
  saveStoredBrandSettings,
} from '@/lib/branding';

const ICON_MAP: Record<PresetIconName, React.ComponentType<any>> = {
  Building2,
  Crown,
  Shield,
  Diamond,
  Zap,
  Sparkles,
  Layers,
  Rocket,
};

export default function BrandingSettings() {
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [previewAccent, setPreviewAccent] = useState('#c4a55a');
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = getStoredBrandSettings();
    setSettings(stored);
    const pal = COLOR_PALETTES.find((p) => p.id === stored.paletteId) || COLOR_PALETTES[0];
    setPreviewAccent(stored.customAccent || pal.accent);
  }, []);

  const handlePaletteSelect = (paletteId: string) => {
    const pal = COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0];
    const newSettings: BrandSettings = {
      ...settings,
      paletteId,
      customAccent: undefined,
      customPrimary: undefined,
    };
    setSettings(newSettings);
    setPreviewAccent(pal.accent);
    saveStoredBrandSettings(newSettings);
    toast.success(`Theme updated to ${pal.name}!`);
  };

  const handleCustomColorChange = (color: string) => {
    setPreviewAccent(color);
    const newSettings: BrandSettings = {
      ...settings,
      customAccent: color,
    };
    setSettings(newSettings);
    saveStoredBrandSettings(newSettings);
  };

  const handleIconSelect = (icon: PresetIconName) => {
    const newSettings: BrandSettings = {
      ...settings,
      logoType: 'icon',
      selectedIcon: icon,
    };
    setSettings(newSettings);
    saveStoredBrandSettings(newSettings);
    toast.success(`Logo icon updated to ${icon}!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const newSettings: BrandSettings = {
          ...settings,
          logoType: 'image',
          customLogoUrl: result,
        };
        setSettings(newSettings);
        saveStoredBrandSettings(newSettings);
        toast.success('Custom logo uploaded & applied successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = () => {
    setSettings(DEFAULT_BRAND_SETTINGS);
    setPreviewAccent(COLOR_PALETTES[0].accent);
    saveStoredBrandSettings(DEFAULT_BRAND_SETTINGS);
    toast.info('Branding reset to default.');
  };

  return (
    <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e8ecf2] px-6 py-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[#c4a55a]" />
            <h2 className="text-lg font-semibold text-[#0f1d33]">Brand & Appearance Settings</h2>
          </div>
          <p className="mt-1 text-sm text-[#5a6a82]">
            Personalize your software logo and accent color palette. Changes apply across the entire application immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          title="Reset to default theme"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5a6a82] hover:text-[#0f1d33] bg-[#f7f8fa] hover:bg-[#edf0f5] border border-[#e8ecf2] rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* SECTION 1: CHOOSE YOUR LOGO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f1d33]">
                1. Choose Your Logo
              </h3>
              <p className="text-xs text-[#5a6a82]">
                Upload your company logo or select a modern icon symbol.
              </p>
            </div>

            {/* Logo mode toggle */}
            <div className="inline-flex rounded-lg border border-[#e8ecf2] p-1 bg-[#f7f8fa] text-xs">
              <button
                type="button"
                onClick={() => {
                  const updated: BrandSettings = { ...settings, logoType: 'image' };
                  setSettings(updated);
                  saveStoredBrandSettings(updated);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  settings.logoType === 'image'
                    ? 'bg-white text-[#0f1d33] shadow-xs'
                    : 'text-[#5a6a82] hover:text-[#0f1d33]'
                }`}
              >
                Custom Image
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated: BrandSettings = { ...settings, logoType: 'icon' };
                  setSettings(updated);
                  saveStoredBrandSettings(updated);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  settings.logoType === 'icon'
                    ? 'bg-white text-[#0f1d33] shadow-xs'
                    : 'text-[#5a6a82] hover:text-[#0f1d33]'
                }`}
              >
                Preset Icons
              </button>
            </div>
          </div>

          {/* Custom Image Upload Area */}
          {settings.logoType === 'image' ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-dashed border-[#cbd5e1] bg-[#fafbfc]">
              <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-[#e8ecf2] shadow-sm p-2 shrink-0">
                {settings.customLogoUrl ? (
                  <img
                    src={settings.customLogoUrl}
                    alt="Uploaded Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#94a3b8]" />
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0f1d33] text-white hover:bg-[#1e3a5f] transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Image Logo
                  </button>
                  {settings.customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated: BrandSettings = { ...settings, customLogoUrl: undefined, logoType: 'icon' };
                        setSettings(updated);
                        saveStoredBrandSettings(updated);
                        toast.info('Custom logo cleared');
                      }}
                      className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#8a99ad]">
                  Recommended format: SVG, transparent PNG or WebP. Max file size: 2MB.
                </p>
              </div>
            </div>
          ) : (
            /* Preset Icon Selection Grid */
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {PRESET_ICONS.map((iconName) => {
                const IconComp = ICON_MAP[iconName];
                const isSelected = settings.selectedIcon === iconName && settings.logoType === 'icon';

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleIconSelect(iconName)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#0f1d33] bg-[#0f1d33] text-white shadow-sm ring-2 ring-[#0f1d33]/20'
                        : 'border-[#e8ecf2] bg-white text-[#5a6a82] hover:border-[#0f1d33] hover:text-[#0f1d33]'
                    }`}
                  >
                    <IconComp
                      size={24}
                      className={isSelected ? 'text-[#c4a55a]' : 'text-[#5a6a82]'}
                    />
                    <span className="text-[10px] mt-1.5 font-medium truncate w-full text-center">
                      {iconName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: CHOOSE YOUR COLOR PALETTE */}
        <div className="space-y-4 pt-4 border-t border-[#e8ecf2]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f1d33]">
                2. Choose Your Color Palette
              </h3>
              <p className="text-xs text-[#5a6a82]">
                Select an enterprise preset or specify a custom brand color.
              </p>
            </div>

            {/* Custom Hex Picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5a6a82]">Custom Color:</span>
              <div className="flex items-center gap-1.5 border border-[#e8ecf2] rounded-lg px-2 py-1 bg-white">
                <input
                  type="color"
                  value={previewAccent}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono text-xs uppercase text-[#0f1d33]">
                  {previewAccent}
                </span>
              </div>
            </div>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLOR_PALETTES.map((palette) => {
              const isSelected = settings.paletteId === palette.id && !settings.customAccent;

              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handlePaletteSelect(palette.id)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#0f1d33] bg-[#fafbfc] ring-2 ring-[#0f1d33]/20 shadow-xs'
                      : 'border-[#e8ecf2] bg-white hover:border-[#cbd5e1]'
                  }`}
                >
                  {/* Swatch circle */}
                  <div
                    className="w-8 h-8 rounded-lg shrink-0 shadow-2xs border border-black/10 flex items-center justify-center"
                    style={{ backgroundColor: palette.accent }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#0f1d33] truncate">
                      {palette.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: palette.primary }}
                        title="Primary tone"
                      />
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: palette.accent }}
                        title="Accent tone"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: LIVE PREVIEW BANNER */}
        <div className="rounded-xl border border-[#e8ecf2] bg-[#fbfcfd] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: '#0f1d33' }}
            >
              {settings.logoType === 'image' && settings.customLogoUrl ? (
                <img
                  src={settings.customLogoUrl}
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                React.createElement(ICON_MAP[settings.selectedIcon] || Building2, {
                  size: 24,
                  style: { color: previewAccent },
                })
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#0f1d33]">
                  C<span style={{ color: previewAccent }}>RM</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Preview
                </span>
              </div>
              <p className="text-xs text-[#5a6a82]">
                This logo & color styling is active on your login page, sidebar, and export documents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                saveStoredBrandSettings(settings);
                toast.success('Branding preferences successfully applied across CRM!');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f1d33] text-white text-xs font-semibold hover:bg-[#1a2b47] transition-all shadow-xs"
            >
              <Save className="w-3.5 h-3.5" /> Save Branding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

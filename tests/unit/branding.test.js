const test = require('node:test');
const assert = require('node:assert');
require('../setup');

const {
  COLOR_PALETTES,
  DEFAULT_BRAND_SETTINGS,
  getStoredBrandSettings,
  saveStoredBrandSettings,
  hslToHex,
  hexToHsl,
  parseColorSearch,
} = require('@/lib/branding.ts');

test('Branding: Palette registry integrity', () => {
  assert.strictEqual(COLOR_PALETTES.length, 8);
  COLOR_PALETTES.forEach((p) => {
    assert.ok(p.id, 'Palette must have id');
    assert.ok(p.name, 'Palette must have name');
    assert.match(p.primary, /^#[0-9a-fA-F]{6}$/, `${p.id} primary must be hex`);
    assert.match(p.accent, /^#[0-9a-fA-F]{6}$/, `${p.id} accent must be hex`);
    assert.ok(p.accentBg, 'Palette must have accentBg');
  });
});

test('Branding: Default brand settings fallback', () => {
  global.localStorage.clear();
  const settings = getStoredBrandSettings();
  assert.strictEqual(settings.paletteId, DEFAULT_BRAND_SETTINGS.paletteId);
  assert.strictEqual(settings.customAccent, DEFAULT_BRAND_SETTINGS.customAccent);
});

test('Branding: Storage persistence and retrieval', () => {
  const updated = {
    paletteId: 'sapphire',
    customAccent: '#3b82f6',
    customLogoUrl: 'data:image/png;base64,mocklogo',
  };
  saveStoredBrandSettings(updated);

  const retrieved = getStoredBrandSettings();
  assert.strictEqual(retrieved.paletteId, 'sapphire');
  assert.strictEqual(retrieved.customAccent, '#3b82f6');
  assert.strictEqual(retrieved.customLogoUrl, 'data:image/png;base64,mocklogo');
});

test('Branding: HSL to HEX and HEX to HSL conversion', () => {
  // Pure Red: Hex #ff0000 -> H: 0, S: 100, L: 50
  const redHsl = hexToHsl('#ff0000');
  assert.strictEqual(redHsl.h, 0);
  assert.strictEqual(redHsl.s, 100);
  assert.strictEqual(redHsl.l, 50);

  const redHex = hslToHex(0, 100, 50);
  assert.strictEqual(redHex.toLowerCase(), '#ff0000');

  // Short 3-char hex: #fff
  const whiteHsl = hexToHsl('#fff');
  assert.strictEqual(whiteHsl.l, 100);
});

test('Branding: parseColorSearch handles named, hex, and rgb inputs', () => {
  // Named color
  const gold = parseColorSearch('gold');
  assert.ok(gold);
  assert.strictEqual(gold.hex.toLowerCase(), '#c4a55a');

  // Partial match
  const purp = parseColorSearch('purp');
  assert.ok(purp);
  assert.ok(purp.label.toLowerCase().includes('purple'));

  // Hex query with and without hash
  const hex1 = parseColorSearch('#10b981');
  assert.ok(hex1);
  assert.strictEqual(hex1.hex, '#10b981');

  const hex2 = parseColorSearch('3b82f6');
  assert.ok(hex2);
  assert.strictEqual(hex2.hex, '#3b82f6');

  // RGB syntax
  const rgb = parseColorSearch('rgb(255, 0, 128)');
  assert.ok(rgb);
  assert.strictEqual(rgb.hex.toLowerCase(), '#ff0080');

  // Invalid query
  const invalid = parseColorSearch('not-a-valid-color-xyz123');
  assert.strictEqual(invalid, null);
});

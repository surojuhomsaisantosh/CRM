/**
 * Phone number normalization and Indian phone utilities
 */

export const ALL_WA_REPORT_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

/**
 * Strips all non-digit characters and extracts standard canonical format
 */
export function canonicalPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return digits;
}

export function extractTenDigitWaPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

export function normalizeIndianPhoneInput(input: string): string {
  return input.replace(/[^\d+]/g, '');
}

export function normalizeWaRecipientPhone(phone: string): { valid: boolean; phone: string; error?: string } {
  if (!phone) {
    return { valid: false, phone: '', error: 'Phone number is required.' };
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return { valid: true, phone: `91${digits}` };
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { valid: true, phone: digits };
  }
  if (digits.length < 10) {
    return { valid: false, phone: digits, error: 'Phone number must have at least 10 digits.' };
  }
  return { valid: true, phone: digits };
}

export function normalizeWaReportTimings(timings: any): string[] {
  if (!Array.isArray(timings)) return ['09:00', '18:00'];
  return timings.filter(t => typeof t === 'string' && t.includes(':'));
}

export function toggleWaReportTiming(currentTimings: string[], slot: string): string[] {
  const set = new Set(currentTimings || []);
  if (set.has(slot)) {
    set.delete(slot);
  } else {
    set.add(slot);
  }
  return Array.from(set).sort();
}

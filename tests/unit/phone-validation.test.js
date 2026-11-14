const test = require('node:test');
const assert = require('node:assert');
require('../setup');

// Phone validation logic used across ProjectsClient and database actions
function isValid10DigitMobile(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly);
}

function validateProjectPhoneNumbers(numbers) {
  if (!Array.isArray(numbers)) return { valid: false, error: 'Phone numbers must be an array' };
  if (numbers.length === 0) return { valid: false, error: 'At least one phone number is required' };
  if (numbers.length > 5) return { valid: false, error: 'Maximum 5 contact numbers allowed per project' };

  for (let i = 0; i < numbers.length; i++) {
    const raw = numbers[i];
    if (!isValid10DigitMobile(raw)) {
      return {
        valid: false,
        error: `Phone number ${i + 1} (${raw}) is invalid. Must be exactly 10 digits starting with 6, 7, 8, or 9.`
      };
    }
  }

  return { valid: true, error: null };
}

test('Phone Validation: Valid 10-digit Indian mobile numbers', () => {
  const validNumbers = [
    '9876543210',
    '8123456789',
    '7001234567',
    '6998877665',
    '98765-43210',
    '98765 43210',
  ];

  validNumbers.forEach((num) => {
    assert.strictEqual(isValid10DigitMobile(num), true, `Failed on valid number: ${num}`);
  });
});

test('Phone Validation: Rejects invalid formats (<10, >10, letters, wrong prefix)', () => {
  const invalidNumbers = [
    '1234567890',  // starts with 1
    '0987654321',  // starts with 0
    '5987654321',  // starts with 5
    '987654321',   // 9 digits
    '98765432100', // 11 digits
    '98765abcde',  // letters
    '',            // empty
    null,          // null
    undefined,     // undefined
    '           ', // whitespace
  ];

  invalidNumbers.forEach((num) => {
    assert.strictEqual(isValid10DigitMobile(num), false, `Should have rejected: ${num}`);
  });
});

test('Project Phone Numbers: Enforces min 1 and max 5 limit', () => {
  // Empty array -> invalid
  assert.strictEqual(validateProjectPhoneNumbers([]).valid, false);

  // 1 to 5 valid numbers -> valid
  assert.strictEqual(validateProjectPhoneNumbers(['9876543210']).valid, true);
  assert.strictEqual(validateProjectPhoneNumbers([
    '9876543210',
    '8123456789',
    '7001234567',
    '6998877665',
    '9123456780',
  ]).valid, true);

  // 6 numbers -> rejected
  const overLimit = validateProjectPhoneNumbers([
    '9876543210',
    '8123456789',
    '7001234567',
    '6998877665',
    '9123456780',
    '9876543211',
  ]);
  assert.strictEqual(overLimit.valid, false);
  assert.match(overLimit.error, /Maximum 5/);
});

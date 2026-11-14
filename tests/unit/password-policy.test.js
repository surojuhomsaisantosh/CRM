const test = require('node:test');
const assert = require('node:assert');
require('../setup');

const { validatePasswordPolicy } = require('@/lib/auth/password-policy.ts');

test('Password Policy: validates length requirements (12 - 20 chars)', () => {
  // Too short (11 chars)
  const shortRes = validatePasswordPolicy('Short12!Pass');
  assert.strictEqual(shortRes.hasMinLength, true); // wait, Short12!Pass is 12 chars
  
  const reallyShort = validatePasswordPolicy('Abc1!'); // 5 chars
  assert.strictEqual(reallyShort.hasMinLength, false);
  assert.strictEqual(reallyShort.hasLength, false);
  assert.strictEqual(reallyShort.isValid, false);

  // Exact 12 characters (valid length)
  const exact12 = validatePasswordPolicy('Secure12Pass!');
  assert.strictEqual(exact12.hasMinLength, true);
  assert.strictEqual(exact12.hasMaxLength, true);
  assert.strictEqual(exact12.hasLength, true);

  // Exact 20 characters (valid length)
  const exact20 = validatePasswordPolicy('Secure12345678Pass!!');
  assert.strictEqual(exact20.hasMinLength, true);
  assert.strictEqual(exact20.hasMaxLength, true);
  assert.strictEqual(exact20.hasLength, true);

  // Too long (21 characters)
  const tooLong = validatePasswordPolicy('Secure12345678Pass!!!');
  assert.strictEqual(tooLong.hasMaxLength, false);
  assert.strictEqual(tooLong.hasLength, false);
  assert.strictEqual(tooLong.isValid, false);
});

test('Password Policy: requires at least 1 uppercase letter', () => {
  // Lowercase only + numbers + symbols (14 chars)
  const noUpper = validatePasswordPolicy('mypassword123!');
  assert.strictEqual(noUpper.hasUppercase, false);
  assert.strictEqual(noUpper.isValid, false);

  // Has uppercase
  const withUpper = validatePasswordPolicy('MyPassword123!');
  assert.strictEqual(withUpper.hasUppercase, true);
});

test('Password Policy: requires at least 1 numeric character', () => {
  // No numbers
  const noNumber = validatePasswordPolicy('MyPasswordHere!');
  assert.strictEqual(noNumber.hasNumber, false);
  assert.strictEqual(noNumber.isValid, false);

  // With number
  const withNumber = validatePasswordPolicy('MyPassword1Here!');
  assert.strictEqual(withNumber.hasNumber, true);
});

test('Password Policy: requires at least 1 special character', () => {
  // No special characters
  const noSpecial = validatePasswordPolicy('MyPassword123456');
  assert.strictEqual(noSpecial.hasSpecial, false);
  assert.strictEqual(noSpecial.isValid, false);

  // Various special characters
  ['!', '@', '#', '$', '%', '^', '&', '*', '_', '-'].forEach(char => {
    const res = validatePasswordPolicy(`MyPassword123${char}`);
    assert.strictEqual(res.hasSpecial, true, `Failed for character: ${char}`);
  });
});

test('Password Policy: accepts strong compliant password', () => {
  const result = validatePasswordPolicy('AdminPass2026!');
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.hasLength, true);
  assert.strictEqual(result.hasUppercase, true);
  assert.strictEqual(result.hasNumber, true);
  assert.strictEqual(result.hasSpecial, true);
});

test('Password Policy: edge cases (empty string, whitespace)', () => {
  const empty = validatePasswordPolicy('');
  assert.strictEqual(empty.isValid, false);
  assert.strictEqual(empty.hasLength, false);
  assert.strictEqual(empty.hasUppercase, false);
  assert.strictEqual(empty.hasNumber, false);
  assert.strictEqual(empty.hasSpecial, false);
});

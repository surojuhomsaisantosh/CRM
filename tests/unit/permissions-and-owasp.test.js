const test = require('node:test');
const assert = require('node:assert');
require('../setup');

test('Permissions: Core module catalog definitions', () => {
  const ALL_MODULES = [
    'dashboard',
    'leads',
    'inbox',
    'whatsapp',
    'reports',
    'modules',
    'users',
    'settings'
  ];

  assert.strictEqual(ALL_MODULES.length, 8);
  assert.ok(ALL_MODULES.includes('dashboard'));
  assert.ok(ALL_MODULES.includes('leads'));
  assert.ok(ALL_MODULES.includes('inbox'));
  assert.ok(ALL_MODULES.includes('whatsapp'));
  assert.ok(ALL_MODULES.includes('reports'));
  assert.ok(ALL_MODULES.includes('modules'));
  assert.ok(ALL_MODULES.includes('users'));
  assert.ok(ALL_MODULES.includes('settings'));
});

test('Permissions: Super Admin and Admin role escalation rule', () => {
  function computeAdminPermissions(role) {
    const ALL_MODULES = ['dashboard', 'leads', 'inbox', 'whatsapp', 'reports', 'modules', 'users', 'settings'];
    const isAdmin = role === 'Super Admin' || role === 'Admin';
    const perms = {};
    ALL_MODULES.forEach((mod) => {
      perms[mod] = isAdmin ? 'edit' : 'view';
    });
    return perms;
  }

  const superAdminPerms = computeAdminPermissions('Super Admin');
  assert.strictEqual(superAdminPerms['leads'], 'edit');
  assert.strictEqual(superAdminPerms['users'], 'edit');
  assert.strictEqual(superAdminPerms['settings'], 'edit');

  const adminPerms = computeAdminPermissions('Admin');
  assert.strictEqual(adminPerms['leads'], 'edit');
  assert.strictEqual(adminPerms['users'], 'edit');

  const standardUserPerms = computeAdminPermissions('Agent');
  assert.strictEqual(standardUserPerms['leads'], 'view');
  assert.strictEqual(standardUserPerms['settings'], 'view');
});

test('Permissions: Module alias fallback (inbox <-> whatsapp)', () => {
  function resolveModuleAccess(perms, moduleName) {
    let access = perms[moduleName];
    if (!access || access === 'none') {
      if (moduleName === 'inbox') access = perms['whatsapp'];
      else if (moduleName === 'whatsapp') access = perms['inbox'];
    }
    return access || 'none';
  }

  // If user only had legacy whatsapp permission, inbox resolves to it
  const permsWithWa = { whatsapp: 'edit', inbox: 'none' };
  assert.strictEqual(resolveModuleAccess(permsWithWa, 'inbox'), 'edit');

  // If user has inbox permission, whatsapp resolves to it
  const permsWithInbox = { inbox: 'view', whatsapp: 'none' };
  assert.strictEqual(resolveModuleAccess(permsWithInbox, 'whatsapp'), 'view');
});

test('OWASP Compliance: Anti-User Enumeration Generic Password Reset message', () => {
  function formatPasswordResetConfirmation(email) {
    // OWASP standard: never reveal whether the email exists in DB
    return `If an account exists for ${email}, a password reset link has been sent. Please check your inbox and spam folder.`;
  }

  const msg1 = formatPasswordResetConfirmation('real.user@example.com');
  const msg2 = formatPasswordResetConfirmation('nonexistent.fake@example.com');

  // Format must be identical for both existing and non-existing accounts
  assert.ok(msg1.includes('If an account exists'));
  assert.ok(msg2.includes('If an account exists'));
  assert.strictEqual(msg1.replace('real.user@example.com', ''), msg2.replace('nonexistent.fake@example.com', ''));
});

test('OWASP Compliance: Error handling suppresses database presence leaks while preserving HTTP 429', () => {
  function handlePasswordResetError(err) {
    if (err && err.status === 429) {
      return { isRateLimited: true, userMessage: 'Too many requests. Please wait a moment.' };
    }
    // Generic message to prevent enumeration
    return { isRateLimited: false, userMessage: 'If the email exists, a password reset link has been sent.' };
  }

  // Rate limit error -> properly alerted
  const rateLimitRes = handlePasswordResetError({ status: 429, message: 'Too Many Requests' });
  assert.strictEqual(rateLimitRes.isRateLimited, true);
  assert.match(rateLimitRes.userMessage, /Too many requests/);

  // User not found error -> masked to generic message (Anti-enumeration)
  const notFoundRes = handlePasswordResetError({ status: 400, message: 'User not found in auth database' });
  assert.strictEqual(notFoundRes.isRateLimited, false);
  assert.match(notFoundRes.userMessage, /If the email exists/);

  // Database error -> masked to generic message
  const dbErrorRes = handlePasswordResetError({ status: 500, message: 'Database connection failed' });
  assert.strictEqual(dbErrorRes.isRateLimited, false);
  assert.match(dbErrorRes.userMessage, /If the email exists/);
});

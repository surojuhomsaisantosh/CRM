const test = require('node:test');
const assert = require('node:assert');
require('../setup');

const {
  isMetaConfigured,
  getMetaOAuthUrl,
  fetchHistoricalLeads,
  parseMetaLeadFields,
} = require('@/lib/meta.ts');

test('Meta Integration: Configuration detector', () => {
  const isConfigured = isMetaConfigured();
  assert.strictEqual(typeof isConfigured, 'boolean');
});

test('Meta Integration: Generates valid OAuth Dialog URL with required permissions', () => {
  const url = getMetaOAuthUrl('test_state_token_123', 'http://localhost:3000/api/auth/meta/callback');
  assert.ok(url.startsWith('https://www.facebook.com/v19.0/dialog/oauth'));
  assert.ok(url.includes('client_id='));
  assert.ok(url.includes('state=test_state_token_123'));
  assert.ok(url.includes('redirect_uri='));
  assert.ok(url.includes('pages_show_list'));
  assert.ok(url.includes('pages_read_engagement'));
  assert.ok(url.includes('pages_manage_ads'));
  assert.ok(url.includes('leads_retrieval'));
});

test('Meta Integration: Historical lead puller respects date filtering', async () => {
  const res30 = await fetchHistoricalLeads('form_mock_123', 'simulated_token', 100, 30);
  assert.strictEqual(res30.success, true);
  assert.ok(Array.isArray(res30.leads));
  assert.ok(res30.leads.length > 0);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  res30.leads.forEach((lead) => {
    const leadTime = new Date(lead.createdTime).getTime();
    assert.ok(leadTime >= thirtyDaysAgo - 5000, 'Lead must not be older than 30 days');
    assert.ok(lead.leadId);
    assert.ok(lead.fullName);
    assert.ok(lead.phoneNumber);
  });
});

test('Meta Integration: parseMetaLeadFields combines first and last name correctly', () => {
  const fields = [
    { name: 'first_name', values: ['Ananya'] },
    { name: 'last_name', values: ['Sharma'] },
    { name: 'email', values: ['ananya.sharma@example.com'] },
    { name: 'phone_number', values: ['p:+919876543210'] },
    { name: 'city', values: ['Hyderabad'] }
  ];

  const parsed = parseMetaLeadFields(fields, 'lead_101', 'form_202', 'page_303');
  assert.strictEqual(parsed.fullName, 'Ananya Sharma');
  assert.strictEqual(parsed.phoneNumber, '+919876543210', 'Should strip p: prefix from phone');
  assert.strictEqual(parsed.email, 'ananya.sharma@example.com');
  assert.strictEqual(parsed.city, 'Hyderabad');
  assert.strictEqual(parsed.leadId, 'lead_101');
  assert.strictEqual(parsed.formId, 'form_202');
});

test('Meta Integration: parseMetaLeadFields prioritizes explicit full_name and cleans tel: prefix', () => {
  const fields = [
    { name: 'full_name', values: ['Dr. Vikramaditya Verma'] },
    { name: 'phone', values: ['tel:+919845012345'] }
  ];

  const parsed = parseMetaLeadFields(fields, 'lead_102', 'form_202');
  assert.strictEqual(parsed.fullName, 'Dr. Vikramaditya Verma');
  assert.strictEqual(parsed.phoneNumber, '+919845012345', 'Should strip tel: prefix from phone');
});

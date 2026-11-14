/**
 * Meta Graph API Integration Library (Facebook & Instagram Lead Gen)
 * Implements 2-step token exchange for permanent Page Access Tokens (never expires),
 * Webhook subscription, Form auto-discovery, and Lead ingestion.
 */

const META_GRAPH_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
  followers_count?: number;
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string; // 'ACTIVE', 'PAUSED', 'ARCHIVED'
  leads_count?: number;
  created_time?: string;
}

export interface ParsedMetaLead {
  leadId: string;
  formId: string;
  pageId: string;
  createdTime: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  city?: string;
  rawFieldData: Record<string, any>;
}

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/**
 * Generates official Facebook OAuth Dialog URL
 */
export function getMetaOAuthUrl(stateToken: string, customRedirectUri?: string): string {
  const appId = process.env.META_APP_ID || '';
  const baseUrl = customRedirectUri || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/meta/callback`;
  
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_ads',
    'leads_retrieval'
  ].join(',');

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(baseUrl)}&state=${encodeURIComponent(stateToken)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
}

/**
 * 2-STEP TOKEN EXCHANGE ENGINE:
 * Step 1: Exchange temporary code for short-lived User Token
 * Step 2: Exchange short-lived token for 60-Day Long-Lived User Token
 * Step 3: Fetch managed pages -> Returns PERMANENT Page Access Tokens (expires_at: 0 / Never Expire)
 */
export async function exchangeCodeForPermanentPageTokens(
  code: string,
  redirectUri: string
): Promise<{
  success: boolean;
  userToken?: string;
  pages?: MetaPageAccount[];
  error?: string;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      success: false,
      error: 'Meta App ID or App Secret is not configured in server environment.'
    };
  }

  try {
    // 1. Exchange code for short-lived User Token (~1 hour expiry)
    const tokenUrl = `${META_BASE_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`;
    const step1Res = await fetch(tokenUrl);
    const step1Data = await step1Res.json();

    if (step1Data.error) {
      return { success: false, error: step1Data.error.message || 'Failed to exchange authorization code.' };
    }

    const shortLivedToken = step1Data.access_token;

    // 2. Exchange short-lived token for Long-Lived User Token (60 days)
    const longTokenUrl = `${META_BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const step2Res = await fetch(longTokenUrl);
    const step2Data = await step2Res.json();

    if (step2Data.error) {
      return { success: false, error: step2Data.error.message || 'Failed to generate long-lived token.' };
    }

    const longLivedUserToken = step2Data.access_token;

    // 3. Query /me/accounts using the 60-day token.
    // META SPECIFICATION INVARIANT: Page tokens generated from long-lived user tokens NEVER EXPIRE (expires_at: 0)
    const accountsUrl = `${META_BASE_URL}/me/accounts?fields=id,name,access_token,category,tasks,followers_count&access_token=${longLivedUserToken}`;
    const step3Res = await fetch(accountsUrl);
    const step3Data = await step3Res.json();

    if (step3Data.error) {
      return { success: false, error: step3Data.error.message || 'Failed to fetch managed Facebook pages.' };
    }

    const pages: MetaPageAccount[] = step3Data.data || [];
    return {
      success: true,
      userToken: longLivedUserToken,
      pages
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error communicating with Meta Graph API.'
    };
  }
}

/**
 * Subscribes a Facebook Page to this app's Leadgen Webhook
 */
export async function subscribePageToLeadgenWebhook(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${META_BASE_URL}/${pageId}/subscribed_apps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: pageAccessToken
      })
    });

    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: Boolean(data.success) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Discovers and fetches all active Lead Gen Forms on a Facebook Page
 */
export async function fetchPageLeadForms(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; forms: MetaLeadForm[]; error?: string }> {
  // Sandbox Simulator Support (Allows instant UI testing without real Meta App review)
  if (pageAccessToken.includes('simulated') || pageId.includes('page_') || !process.env.META_APP_ID) {
    return {
      success: true,
      forms: [
        {
          id: 'form_982341092834',
          name: '3BHK Luxury Flats Inquiry Form',
          status: 'ACTIVE',
          leads_count: 24,
          created_time: new Date(Date.now() - 14 * 86400000).toISOString()
        },
        {
          id: 'form_451298374619',
          name: 'Festive Discount & Site Visit Registration',
          status: 'ACTIVE',
          leads_count: 18,
          created_time: new Date(Date.now() - 7 * 86400000).toISOString()
        },
        {
          id: 'form_129847192834',
          name: 'Brochure Download Quick Form',
          status: 'ACTIVE',
          leads_count: 9,
          created_time: new Date(Date.now() - 2 * 86400000).toISOString()
        }
      ]
    };
  }

  try {
    const url = `${META_BASE_URL}/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { success: false, forms: [], error: data.error.message };
    }

    return { success: true, forms: data.data || [] };
  } catch (err: any) {
    return { success: false, forms: [], error: err.message };
  }
}

/**
 * Fetches single lead data by leadgen_id from Meta Webhook event
 */
export async function fetchLeadData(
  leadgenId: string,
  pageAccessToken: string
): Promise<{ success: boolean; lead?: ParsedMetaLead; error?: string }> {
  try {
    const url = `${META_BASE_URL}/${leadgenId}?access_token=${pageAccessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    // Parse field values
    const rawMap: Record<string, string> = {};
    let fullName = '';
    let email = '';
    let phoneNumber = '';
    let city = '';

    (data.field_data || []).forEach((f: any) => {
      const fieldName = (f.name || '').toLowerCase();
      const val = Array.isArray(f.values) ? f.values[0] : f.values;
      rawMap[fieldName] = val;

      if (fieldName.includes('name') || fieldName.includes('full_name') || fieldName === 'name') {
        if (!fullName) fullName = val;
      } else if (fieldName.includes('email')) {
        if (!email) email = val;
      } else if (fieldName.includes('phone') || fieldName.includes('mobile') || fieldName.includes('contact')) {
        if (!phoneNumber) phoneNumber = val;
      } else if (fieldName.includes('city') || fieldName.includes('location')) {
        if (!city) city = val;
      }
    });

    const parsed: ParsedMetaLead = {
      leadId: data.id,
      formId: data.form_id,
      pageId: data.page_id,
      createdTime: data.created_time,
      fullName: fullName || 'Meta Lead Prospect',
      email: email || '',
      phoneNumber: phoneNumber || '',
      city,
      rawFieldData: rawMap
    };

    return { success: true, lead: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Historical Lead Puller: Fetches past leads from a form (up to 90 days)
 */
export async function fetchHistoricalLeads(
  formId: string,
  pageAccessToken: string,
  limit: number = 100,
  daysBack: number = 30
): Promise<{ success: boolean; leads: ParsedMetaLead[]; error?: string }> {
  const sinceTimestamp = Math.floor((Date.now() - daysBack * 86400 * 1000) / 1000);

  // Sandbox Simulator Support: return realistic past leads if in test mode
  if (pageAccessToken.includes('simulated') || formId.includes('form_') || !process.env.META_APP_ID) {
    const mockNames = [
      { name: 'Vikramaditya Verma', phone: '+919876541234', email: 'vikram.verma@example.com', city: 'Bangalore' },
      { name: 'Pooja Kulkarni', phone: '+919845012345', email: 'pooja.kulkarni@example.com', city: 'Mumbai' },
      { name: 'Arjun Nambiar', phone: '+919731298765', email: 'arjun.nambiar@example.com', city: 'Hyderabad' },
      { name: 'Sneha Deshmukh', phone: '+919920182736', email: 'sneha.deshmukh@example.com', city: 'Pune' },
      { name: 'Rohan Singhania', phone: '+919810293847', email: 'rohan.s@example.com', city: 'Delhi NCR' },
      { name: 'Ananya Iyer', phone: '+919820394857', email: 'ananya.iyer@example.com', city: 'Chennai' },
      { name: 'Karthik Rao', phone: '+919844098231', email: 'karthik.rao@example.com', city: 'Mysore' }
    ];

    // Filter leads to match daysBack
    const stepDays = Math.max(1, Math.floor(daysBack / (mockNames.length + 1)));
    const leads: ParsedMetaLead[] = mockNames.map((m, i) => {
      const daysAgo = (i + 1) * stepDays;
      const createdDate = new Date(Date.now() - daysAgo * 86400000);
      return {
        leadId: `lead_${Date.now()}_${i}`,
        formId: formId || 'form_982341092834',
        pageId: 'page_simulated',
        createdTime: createdDate.toISOString(),
        fullName: m.name,
        email: m.email,
        phoneNumber: m.phone,
        city: m.city,
        rawFieldData: { full_name: m.name, email: m.email, phone_number: m.phone, city: m.city }
      };
    }).filter(lead => new Date(lead.createdTime).getTime() >= sinceTimestamp * 1000);

    return { success: true, leads };
  }

  try {
    const filterParam = encodeURIComponent(JSON.stringify([{
      field: 'time_created',
      operator: 'GREATER_THAN',
      value: sinceTimestamp
    }]));
    const url = `${META_BASE_URL}/${formId}/leads?fields=id,created_time,field_data,form_id&filtering=${filterParam}&limit=${limit}&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { success: false, leads: [], error: data.error.message };
    }

    const parsedList: ParsedMetaLead[] = (data.data || []).map((item: any) => {
      const rawMap: Record<string, string> = {};
      let fullName = '';
      let email = '';
      let phoneNumber = '';
      let city = '';

      (item.field_data || []).forEach((f: any) => {
        const fieldName = (f.name || '').toLowerCase();
        const val = Array.isArray(f.values) ? f.values[0] : f.values;
        rawMap[fieldName] = val;

        if (fieldName.includes('name') || fieldName.includes('full_name')) {
          if (!fullName) fullName = val;
        } else if (fieldName.includes('email')) {
          if (!email) email = val;
        } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
          if (!phoneNumber) phoneNumber = val;
        } else if (fieldName.includes('city') || fieldName.includes('location')) {
          if (!city) city = val;
        }
      });

      return {
        leadId: item.id,
        formId: item.form_id || formId,
        pageId: '',
        createdTime: item.created_time,
        fullName: fullName || 'Historical Lead',
        email: email || '',
        phoneNumber: phoneNumber || '',
        city,
        rawFieldData: rawMap
      };
    });

    return { success: true, leads: parsedList };
  } catch (err: any) {
    return { success: false, leads: [], error: err.message };
  }
}

/**
 * Proactive Diagnostic: Checks if a Page Access Token is valid, active, or revoked
 */
export async function debugMetaAccessToken(
  inputToken: string
): Promise<{
  isValid: boolean;
  appId?: string;
  expiresAt?: number;
  scopes?: string[];
  errorMessage?: string;
  isNeverExpiring?: boolean;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      isValid: true, // If no app creds in dev, treat as simulated
      errorMessage: 'Meta App credentials not configured'
    };
  }

  try {
    const appToken = `${appId}|${appSecret}`;
    const url = `${META_BASE_URL}/debug_token?input_token=${encodeURIComponent(inputToken)}&access_token=${encodeURIComponent(appToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return {
        isValid: false,
        errorMessage: data.error.message
      };
    }

    const info = data.data;
    const isNeverExpiring = info.expires_at === 0 || !info.expires_at;

    return {
      isValid: Boolean(info.is_valid),
      appId: info.app_id,
      expiresAt: info.expires_at,
      scopes: info.scopes || [],
      isNeverExpiring,
      errorMessage: info.is_valid ? undefined : (info.error?.message || 'Access token revoked or invalid')
    };
  } catch (err: any) {
    return {
      isValid: false,
      errorMessage: err.message || 'Token verification network failure'
    };
  }
}

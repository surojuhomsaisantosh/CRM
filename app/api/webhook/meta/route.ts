import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchLeadData } from '@/lib/meta';

/**
 * Meta Webhook Receiver (Real-Time Facebook & Instagram Lead Ads)
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'crm_meta_lead_sync_token';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook] Verification handshake successful!');
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[Meta Webhook] Verification handshake failed. Token mismatch.');
  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a page event' }, { status: 200 });
    }

    const supabaseAdmin = createServiceClient();
    const entries = body.entry || [];

    for (const entry of entries) {
      const pageId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value?.leadgen_id;
          const formId = change.value?.form_id;

          if (!leadgenId) continue;

          console.log(`[Meta Webhook] New lead event received: Lead ID ${leadgenId}, Form ID ${formId}, Page ID ${pageId}`);

          // 1. Look up project by page_id
          const { data: integration } = await supabaseAdmin
            .from('project_integrations')
            .select('project_id, page_name, access_token, projects(name)')
            .eq('page_id', pageId)
            .maybeSingle();

          if (!integration || !integration.access_token) {
            console.warn(`[Meta Webhook] No project integration found for Facebook Page ID ${pageId}`);
            continue;
          }

          const projectName = (integration.projects as any)?.name || integration.page_name || 'Meta Leads';

          // 2. Query Meta Graph API for customer details
          const leadRes = await fetchLeadData(leadgenId, integration.access_token);
          if (!leadRes.success || !leadRes.lead) {
            console.error(`[Meta Webhook] Failed to fetch lead data from Meta: ${leadRes.error}`);
            continue;
          }

          const lead = leadRes.lead;

          // 3. De-duplicate: check if lead already inserted (safe separate checks to avoid PostgREST query syntax errors with +)
          let existing = null;

          const { data: byLeadId } = await supabaseAdmin
            .from('leads')
            .select('id')
            .ilike('source_page', `%${leadgenId}%`)
            .maybeSingle();

          if (byLeadId) {
            existing = byLeadId;
          } else if (lead.phoneNumber && lead.phoneNumber.trim().length >= 6) {
            const { data: byPhone } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('phone', lead.phoneNumber.trim())
              .maybeSingle();
            if (byPhone) existing = byPhone;
          }

          if (existing) {
            console.log(`[Meta Webhook] Lead ${leadgenId} already ingested. Skipping duplicate.`);
            continue;
          }

          // 4. Insert into leads table
          const { data: insertedLead, error: insertErr } = await supabaseAdmin
            .from('leads')
            .insert({
              name: lead.fullName,
              phone: lead.phoneNumber,
              email: lead.email || null,
              project: projectName,
              source_page: `meta_lead_${leadgenId}`,
              form_id: formId || lead.formId,
              status: 'new',
              message: lead.city ? `Location: ${lead.city}` : 'Meta Lead Ad Submission',
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (insertErr) {
            console.error(`[Meta Webhook] Database insert error: ${insertErr.message}`);
            continue;
          }

          // 5. Log audit activity
          if (insertedLead?.id) {
            await supabaseAdmin
              .from('lead_activities')
              .insert({
                lead_id: insertedLead.id,
                activity_type: 'lead_created',
                notes: `Lead captured in real-time from Meta Lead Ad (Form ID: ${formId || lead.formId}, Lead ID: ${leadgenId})`,
                created_at: new Date().toISOString()
              });
          }

          // 6. Update form lead counter
          if (formId) {
            await supabaseAdmin
              .from('meta_forms')
              .update({
                last_lead_at: new Date().toISOString()
              })
              .eq('form_id', formId);
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (err: any) {
    console.error('[Meta Webhook] Error processing event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

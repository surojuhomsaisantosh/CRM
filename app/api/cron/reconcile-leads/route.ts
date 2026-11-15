import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchHistoricalLeads } from '@/lib/meta';

/**
 * Automated Lead Reconciliation Cron Job (Fail-Safe for Webhooks)
 * Runs once per day on Vercel Hobby tier (or on-demand) to verify that no leads
 * were missed during webhook network timeouts or server restarts.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Secure the cron endpoint if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url);
      const queryKey = url.searchParams.get('key');
      if (queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }

    const supabaseAdmin = createServiceClient();

    // 1. Fetch all connected Meta integrations across all projects
    const { data: integrations, error: intErr } = await supabaseAdmin
      .from('project_integrations')
      .select('project_id, page_name, access_token, projects(name)')
      .eq('is_connected', true);

    if (intErr || !integrations || integrations.length === 0) {
      return NextResponse.json({
        status: 'completed',
        message: 'No active integrations found to reconcile.',
        projectsCount: 0
      });
    }

    let totalChecked = 0;
    let totalRecovered = 0;
    const projectSummaries = [];

    // 2. Iterate through all projects in a single unified sweep
    for (const integration of integrations) {
      if (!integration.access_token) continue;

      const projectId = integration.project_id;
      const projectName = (integration.projects as any)?.name || integration.page_name || 'Project';

      // Fetch active forms for this project
      const { data: forms } = await supabaseAdmin
        .from('meta_forms')
        .select('form_id')
        .eq('project_id', projectId);

      const formIds = (forms || []).map(f => f.form_id);
      if (formIds.length === 0) continue;

      let projRecovered = 0;
      let projChecked = 0;

      for (const fid of formIds) {
        // Check rolling 3-day window to catch any recent webhook gaps
        const pullRes = await fetchHistoricalLeads(fid, integration.access_token, 100, 3);
        if (!pullRes.success || !pullRes.leads) continue;

        projChecked += pullRes.leads.length;

        for (const lead of pullRes.leads) {
          let existing = null;

          if (lead.leadId) {
            const { data: byLeadId } = await supabaseAdmin
              .from('leads')
              .select('id')
              .ilike('source_page', `%${lead.leadId}%`)
              .maybeSingle();
            if (byLeadId) existing = byLeadId;
          }

          if (!existing && lead.phoneNumber && lead.phoneNumber.trim().length >= 6) {
            const { data: byPhone } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('phone', lead.phoneNumber.trim())
              .maybeSingle();
            if (byPhone) existing = byPhone;
          }

          if (!existing) {
            const { data: inserted } = await supabaseAdmin
              .from('leads')
              .insert({
                name: lead.fullName,
                phone: lead.phoneNumber,
                email: lead.email || null,
                project: projectName,
                source_page: `meta_reconciled_${lead.leadId}`,
                form_id: fid,
                status: 'new',
                message: lead.city ? `Location: ${lead.city}` : 'Reconciled from Meta Lead Ad',
                created_at: lead.createdTime || new Date().toISOString()
              })
              .select('id')
              .single();

            if (inserted) {
              await supabaseAdmin.from('lead_activities').insert({
                lead_id: inserted.id,
                activity_type: 'lead_created',
                notes: `Lead automatically recovered via Daily Reconciliation Cron (Form: ${fid}, Lead: ${lead.leadId})`,
                created_at: new Date().toISOString()
              });
              projRecovered += 1;
            }
          }
        }
      }

      totalChecked += projChecked;
      totalRecovered += projRecovered;

      projectSummaries.push({
        project: projectName,
        checked: projChecked,
        recovered: projRecovered
      });
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      projectsReconciled: integrations.length,
      totalLeadsChecked: totalChecked,
      newLeadsRecovered: totalRecovered,
      details: projectSummaries
    });
  } catch (err: any) {
    console.error('[Reconciliation Cron Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

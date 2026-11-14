import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { INITIAL_DEMO_PROJECTS } from '@/lib/demo-data';

/**
 * Adapter for project inventory:
 * Falls back to Supabase 'projects' table if Sanity is not configured.
 * In demo mode, returns instant mock project entries with 0ms latency.
 */
export const client = {
  async fetch(query: string) {
    if (!isSupabaseConfigured()) {
      return {
        projectEntries: INITIAL_DEMO_PROJECTS.map((p) => ({
          name: p.name,
          categoryName: p.category_name,
          location: p.location,
          description: p.description,
          googleMapsUrl: p.google_maps_url,
          brochureUrl: '',
          layoutPdfUrl: '',
          reraCertificateUrl: '',
          hmdaDtcpCertificateUrl: '',
          approvalCertificateLabel: p.approval_certificate_label,
        })),
      };
    }

    try {
      const supabase = createServiceClient();
      const { data: dbProjects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbProjects && dbProjects.length > 0) {
        return {
          projectEntries: dbProjects.map((p) => ({
            name: p.name,
            categoryName: p.category_name,
            location: p.location,
            description: p.description,
            googleMapsUrl: p.google_maps_url,
            brochureUrl: p.brochure_url,
            layoutPdfUrl: p.layout_pdf_url,
            reraCertificateUrl: p.rera_certificate_url,
            hmdaDtcpCertificateUrl: p.hmda_dtcp_certificate_url,
            approvalCertificateLabel: p.approval_certificate_label,
          })),
        };
      }
    } catch (err) {
      console.warn('Projects fallback query failed:', err);
    }

    return {
      projectEntries: [],
    };
  },
};

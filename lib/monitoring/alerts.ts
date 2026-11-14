export interface AlertRecipient {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  channel?: 'email' | 'whatsapp' | 'both';
  instant_alerts?: boolean;
  daily_digest?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface SystemAlertItem {
  service?: string;
  status?: string;
  message?: string;
  details?: string;
  actionRequired?: string;
  subsystem?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface SendAlertResult {
  success: boolean;
  sent: boolean;
  recipientsCount?: number;
  error?: string;
}

export async function sendSystemMonitoringAlert(alert: any, recipients?: AlertRecipient[]): Promise<SendAlertResult> {
  console.log('[System Alert Triggered]:', alert, 'to recipients:', recipients || []);
  return { success: true, sent: true, recipientsCount: (recipients?.length || 1) };
}

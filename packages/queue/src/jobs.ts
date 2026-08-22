export interface BaseJobPayload {
  organizationId: string;
  userId?: string | undefined;
  traceId: string;
  idempotencyKey?: string | undefined;
}

export interface EmailJobPayload extends BaseJobPayload {
  to: string | string[];
  subject: string;
  templateId?: string | undefined;
  templateVars?: Record<string, unknown> | undefined;
  bodyHtml?: string | undefined;
}

export interface ReportJobPayload extends BaseJobPayload {
  reportType: 'payroll' | 'attendance' | 'financial_statement' | 'inventory_audit';
  format: 'pdf' | 'xlsx' | 'csv';
  filters: Record<string, unknown>;
  destinationEmail?: string | undefined;
}

export interface NotificationJobPayload extends BaseJobPayload {
  recipientUserId: string;
  title: string;
  body: string;
  actionUrl?: string | undefined;
  channel: 'in_app' | 'push' | 'sms';
}

export interface WebhookJobPayload extends BaseJobPayload {
  targetUrl: string;
  eventType: string;
  payload: Record<string, unknown>;
  secret?: string | undefined;
}

export interface RlsSessionContext {
  organizationId: string;
  userId?: string | undefined;
  isSuperAdmin?: boolean | undefined;
}

export function buildRlsSessionSql(context: RlsSessionContext): string {
  const orgId = context.organizationId.replace(/[^a-zA-Z0-9-]/g, '');
  const userId = (context.userId || '').replace(/[^a-zA-Z0-9-]/g, '');
  const isSuperAdmin = context.isSuperAdmin ? 'true' : 'false';

  return `
    SET LOCAL app.current_organization_id = '${orgId}';
    SET LOCAL app.current_user_id = '${userId}';
    SET LOCAL app.is_super_admin = '${isSuperAdmin}';
  `.trim();
}

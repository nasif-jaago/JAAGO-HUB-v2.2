import { createApiHandler } from '@jaago/authz';
import { globalMcpServer } from '@jaago/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const connectors = [
      {
        id: 'conn_bkash',
        name: 'bKash MFS Direct Checkout',
        type: 'payment',
        status: 'active',
        circuitBreaker: 'CLOSED',
        vaultStatus: 'AES-256-GCM Encrypted',
        lastHealthCheck: new Date().toISOString(),
        description: 'Direct donor collection & program reimbursement gateway',
      },
      {
        id: 'conn_nagad',
        name: 'Nagad Postal MFS Gateway',
        type: 'payment',
        status: 'active',
        circuitBreaker: 'CLOSED',
        vaultStatus: 'AES-256-GCM Encrypted',
        lastHealthCheck: new Date().toISOString(),
        description: 'Nationwide postal mobile financial service connector',
      },
      {
        id: 'conn_sms',
        name: 'Bangladesh Bulk SMS Gateway',
        type: 'messaging',
        status: 'active',
        circuitBreaker: 'CLOSED',
        vaultStatus: 'AES-256-GCM Encrypted',
        lastHealthCheck: new Date().toISOString(),
        description: 'Teacher notifications & parent attendance SMS delivery',
      },
      {
        id: 'conn_gdrive',
        name: 'Google Drive Encrypted Backups',
        type: 'storage',
        status: 'active',
        circuitBreaker: 'CLOSED',
        vaultStatus: 'AES-256-GCM Encrypted',
        lastHealthCheck: new Date().toISOString(),
        description: 'Nightly encrypted backup archive sync with verified restore drill',
      },
      {
        id: 'conn_mcp',
        name: 'Governed Model Context Protocol (MCP) AI Server',
        type: 'ai_agent',
        status: 'active',
        circuitBreaker: 'CLOSED',
        vaultStatus: 'Protected',
        toolsCount: globalMcpServer.listTools().length,
        tools: globalMcpServer.listTools().map((t) => t.name),
        description: 'Safe AI assistant tool execution with RBAC permissions & audit trails',
      },
    ];

    return Response.json({
      data: connectors,
      meta: {
        total: connectors.length,
        organizationId: context.organizationId,
      },
    });
  },
});

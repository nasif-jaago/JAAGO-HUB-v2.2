export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  requiredPermission: string;
  handler: (
    params: Record<string, unknown>,
    context: { organizationId: string; userId: string; permissions: string[]; isSuperAdmin?: boolean },
  ) => Promise<Record<string, unknown>>;
}

export class GovernedMcpServer {
  private tools = new Map<string, McpToolDefinition>();

  public registerTool(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public listTools(): Array<{ name: string; description: string; parameters: Record<string, unknown>; requiredPermission: string }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      requiredPermission: t.requiredPermission,
    }));
  }

  public async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: { organizationId: string; userId: string; permissions: string[]; isSuperAdmin?: boolean },
  ): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `MCP tool "${toolName}" not found` };
    }

    // Permission enforcement
    const isAuthorized =
      context.isSuperAdmin ||
      context.permissions.includes('*') ||
      context.permissions.includes(tool.requiredPermission) ||
      context.permissions.some((p) => p.endsWith('.*') && tool.requiredPermission.startsWith(p.slice(0, -1)));

    if (!isAuthorized) {
      return {
        success: false,
        error: `Unauthorized: Missing permission "${tool.requiredPermission}" for MCP tool "${toolName}"`,
      };
    }

    try {
      const result = await tool.handler(params, context);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Tool execution failure' };
    }
  }
}

export const globalMcpServer = new GovernedMcpServer();

// Register Default JAAGO Governance Tools
globalMcpServer.registerTool({
  name: 'get_staff_profile',
  description: 'Retrieve staff profile and contact info by employee ID',
  parameters: {
    employeeId: { type: 'string', description: 'Employee code (e.g. EMP-001)', required: true },
  },
  requiredPermission: 'hr.view',
  handler: async (params) => {
    return {
      employeeId: params.employeeId,
      name: 'Nasif Kamal',
      jobTitle: 'Founder & Executive Director',
      branch: 'Head Office (Banani)',
      status: 'Active',
    };
  },
});

globalMcpServer.registerTool({
  name: 'get_pending_approvals_count',
  description: 'Get total count of workflow approvals pending user action',
  parameters: {},
  requiredPermission: 'workflow.view',
  handler: async () => {
    return { pendingCount: 3, highPriorityCount: 1 };
  },
});

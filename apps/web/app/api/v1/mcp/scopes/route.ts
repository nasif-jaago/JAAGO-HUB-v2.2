import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { buildAgentAbility } from '@/lib/mcp/auth';
import { findMcpTool, findMcpResource } from '@/lib/mcp/tool-registry';
import { McpAgentScopeRecord, McpModuleKey, McpPermission } from '@/lib/mcp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mcp/scopes?agentId=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId query parameter is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('mcp_agent_scopes')
      .select('*')
      .eq('agent_id', agentId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/v1/mcp/scopes
 * Replace scopes matrix for a bot
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, scopes } = body;

    if (!agentId || !Array.isArray(scopes)) {
      return NextResponse.json({ success: false, error: 'agentId and scopes array are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Delete existing scopes for this agent
    await supabase.from('mcp_agent_scopes').delete().eq('agent_id', agentId);

    // 2. Insert new scopes if any
    if (scopes.length > 0) {
      const rows = scopes.map((s: { moduleKey: string; permission: string }) => ({
        agent_id: agentId,
        module_key: s.moduleKey,
        permission: s.permission,
        granted_by: 'Admin Operator',
      }));

      const { error: insErr } = await supabase.from('mcp_agent_scopes').insert(rows);
      if (insErr) {
        return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${scopes.length} access grants successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/mcp/scopes/test-permission
 * Evaluate tool permission against agent's grants using identical CASL engine
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, toolOrResourceName } = body;

    if (!agentId || !toolOrResourceName) {
      return NextResponse.json(
        { success: false, error: 'agentId and toolOrResourceName are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: scopesData } = await supabase
      .from('mcp_agent_scopes')
      .select('*')
      .eq('agent_id', agentId);

    const scopes: McpAgentScopeRecord[] = (scopesData || []).map((s: any) => ({
      id: s.id,
      agentId: s.agent_id,
      moduleKey: s.module_key as McpModuleKey,
      permission: s.permission as McpPermission,
    }));

    const ability = buildAgentAbility(scopes);

    // Check if it's a tool
    const tool = findMcpTool(toolOrResourceName);
    if (tool) {
      const allowed = ability.can(tool.permission, tool.moduleKey);
      return NextResponse.json({
        success: true,
        type: 'tool',
        name: tool.name,
        module: tool.moduleKey,
        requiredPermission: tool.permission,
        allowed,
        reason: allowed
          ? `grant present: ${tool.moduleKey}/${tool.permission}`
          : `no grant found for: ${tool.moduleKey}/${tool.permission}`,
      });
    }

    // Check if it's a resource
    const resource = findMcpResource(toolOrResourceName);
    if (resource) {
      const allowed = ability.can('read', resource.moduleKey);
      return NextResponse.json({
        success: true,
        type: 'resource',
        name: resource.name,
        module: resource.moduleKey,
        requiredPermission: 'read',
        allowed,
        reason: allowed
          ? `grant present: ${resource.moduleKey}/read`
          : `no grant found for: ${resource.moduleKey}/read`,
      });
    }

    // Check if it's a direct module/page/department/menu key or URI
    const cleanKey = toolOrResourceName.replace(/^(page|dept|menu):\/\//, '');
    const { data: moduleRow } = await supabase
      .from('mcp_modules')
      .select('*')
      .or(`module_key.eq.${cleanKey},module_key.eq.${toolOrResourceName}`)
      .maybeSingle();

    if (moduleRow) {
      const allowed = ability.can('read', moduleRow.module_key as McpModuleKey);
      return NextResponse.json({
        success: true,
        type: 'resource',
        name: moduleRow.label,
        module: moduleRow.module_key,
        requiredPermission: 'read',
        allowed,
        reason: allowed
          ? `grant present: ${moduleRow.module_key}/read`
          : `no grant found for: ${moduleRow.module_key}/read`,
      });
    }

    return NextResponse.json({
      success: false,
      error: `No tool, resource, module, or page found matching "${toolOrResourceName}"`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

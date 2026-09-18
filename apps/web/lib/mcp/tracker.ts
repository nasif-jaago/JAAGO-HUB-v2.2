import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { redactSensitiveData } from '@jaago/logger';
import { McpContext } from './types';

export interface LogActivityParams {
  ctx: McpContext;
  mcpMethod: string;
  mcpName?: string;
  moduleKey?: string;
  permissionUsed?: string;
  outcome: 'ok' | 'denied' | 'error';
  denialReason?: string;
  durationMs: number;
  params?: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
}

/**
 * Upsert live bot connection record to track active status
 */
export async function trackBotConnection(
  ctx: McpContext,
  capabilities?: Record<string, unknown>
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    // Look for recent connection within 5-minute active window for this agent + client
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('mcp_connections')
      .select('id, request_count')
      .eq('agent_id', ctx.agent.id)
      .eq('status', 'active')
      .gte('last_seen_at', fiveMinutesAgo)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('mcp_connections')
        .update({
          last_seen_at: nowIso,
          request_count: (existing.request_count || 1) + 1,
          ip_address: ctx.ipAddress || null,
          status: 'active',
        })
        .eq('id', existing.id);

      return existing.id;
    }

    // New connection record
    const { data: created } = await supabase
      .from('mcp_connections')
      .insert({
        agent_id: ctx.agent.id,
        client_name: ctx.clientName || 'Claude Desktop / MCP Client',
        client_version: ctx.clientVersion || '1.0',
        protocol_version: ctx.protocolVersion || '2026-07-28',
        client_capabilities: capabilities || {},
        ip_address: ctx.ipAddress || null,
        status: 'active',
        request_count: 1,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      })
      .select('id')
      .single();

    return created?.id || null;
  } catch (err) {
    console.error('Failed to track bot connection:', err);
    return null;
  }
}

/**
 * Write an append-only redacted audit record of every bot request
 */
export async function logMcpActivity(params: LogActivityParams, connectionId?: string | null): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    const sanitizedParams = params.params ? (redactSensitiveData(params.params) as Record<string, unknown>) : {};
    const sanitizedResult = params.resultSummary
      ? (redactSensitiveData(params.resultSummary) as Record<string, unknown>)
      : {};

    await supabase.from('mcp_activity').insert({
      agent_id: params.ctx.agent.id,
      connection_id: connectionId || null,
      mcp_method: params.mcpMethod,
      mcp_name: params.mcpName || null,
      module_key: params.moduleKey || null,
      permission_used: params.permissionUsed || null,
      outcome: params.outcome,
      denial_reason: params.denialReason || null,
      duration_ms: params.durationMs,
      params_digest: sanitizedParams,
      result_summary: sanitizedResult,
      trace_id: params.ctx.traceId,
      ip_address: params.ctx.ipAddress || null,
    });
  } catch (err) {
    console.error('Failed to write MCP activity audit log:', err);
  }
}

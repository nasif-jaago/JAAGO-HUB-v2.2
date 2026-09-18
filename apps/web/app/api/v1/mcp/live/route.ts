import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { MCP_TOOLS, MCP_RESOURCES } from '@/lib/mcp/tool-registry';
import { syncMcpModules } from '@/lib/mcp/module-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mcp/live
 * Consolidated feed for the Live Monitor dashboard
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60 * 1000).toISOString();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [connsRes, activityRes, deniedRes, rpmRes] = await Promise.all([
      // 1. Live connections
      supabase
        .from('mcp_connections')
        .select('*, mcp_agents(id, name, agent_type, status)')
        .order('last_seen_at', { ascending: false })
        .limit(20),

      // 2. Recent activity feed
      supabase
        .from('mcp_activity')
        .select('*, mcp_agents(name)')
        .order('created_at', { ascending: false })
        .limit(35),

      // 3. Denied today count
      supabase
        .from('mcp_activity')
        .select('id', { count: 'exact', head: true })
        .eq('outcome', 'denied')
        .gte('created_at', startOfToday.toISOString()),

      // 4. Requests in last 60s (RPM)
      supabase
        .from('mcp_activity')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneMinuteAgo),
    ]);

    const conns = connsRes.data || [];
    const activeCount = conns.filter((c: any) => c.status === 'active' && new Date(c.last_seen_at).getTime() >= now - 5 * 60 * 1000).length;
    const idleCount = Math.max(0, conns.length - activeCount);

    const connectionsList = conns.map((c: any) => {
      const isLiveActive = new Date(c.last_seen_at).getTime() >= now - 5 * 60 * 1000;
      return {
        id: c.id,
        agentId: c.agent_id,
        agentName: c.mcp_agents?.name || 'Unknown Bot',
        clientName: c.client_name,
        clientVersion: c.client_version,
        ipAddress: c.ip_address || '127.0.0.1',
        protocolVersion: c.protocol_version,
        status: isLiveActive ? 'active' : 'idle',
        requestCount: c.request_count,
        firstSeenAt: c.first_seen_at,
        lastSeenAt: c.last_seen_at,
      };
    });

    const activityList = (activityRes.data || []).map((a: any) => ({
      id: a.id,
      agentId: a.agent_id,
      agentName: a.mcp_agents?.name || 'Unknown Bot',
      method: a.mcp_method,
      name: a.mcp_name,
      moduleKey: a.module_key,
      permission: a.permission_used,
      outcome: a.outcome,
      denialReason: a.denial_reason,
      durationMs: a.duration_ms,
      paramsDigest: a.params_digest,
      timestamp: a.created_at,
    }));

    // Fetch and auto-sync dynamic modules, departments, menus, and pages
    let dynamicModules: any[] = [];
    let moduleStats = { total: 0, coreCount: 0, deptCount: 0, menuCount: 0, pageCount: 0 };
    try {
      const syncResult = await syncMcpModules(supabase);
      dynamicModules = syncResult.modules;
      moduleStats = syncResult.stats;
    } catch (syncErr) {
      console.error('[API /api/v1/mcp/live] Warning: Module sync error:', syncErr);
    }

    const catalogList = [
      ...MCP_TOOLS.map((t) => ({
        type: 'tool',
        name: t.name,
        description: t.description,
        moduleKey: t.moduleKey,
        permission: t.permission,
      })),
      ...MCP_RESOURCES.map((r) => ({
        type: 'resource',
        name: r.uri,
        description: `${r.name} — ${r.description}`,
        moduleKey: r.moduleKey,
        permission: 'read',
      })),
      // Add dynamic page, menu, and department resources so agents & tester can view/query them
      ...dynamicModules.map((m) => ({
        type: 'resource',
        name: `${m.category}://${m.key}`,
        description: `${m.label} (${m.category.toUpperCase()}) — ${m.desc}${m.path ? ` [Path: ${m.path}]` : ''}`,
        moduleKey: m.key,
        permission: 'read',
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          connectedTotal: conns.length,
          activeCount,
          idleCount,
          rpm: rpmRes.count || 0,
          deniedToday: deniedRes.count || 0,
          governedToolsCount: catalogList.length,
        },
        connections: connectionsList,
        activity: activityList,
        catalog: catalogList,
        modules: dynamicModules,
        moduleStats,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { generateMcpToken } from '@/lib/mcp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mcp/agents
 * List all registered MCP agents, their active credentials, and scope counts
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [agentsRes, credsRes, scopesRes, connsRes] = await Promise.all([
      supabase.from('mcp_agents').select('*').order('created_at', { ascending: false }),
      supabase.from('mcp_agent_credentials').select('*'),
      supabase.from('mcp_agent_scopes').select('*'),
      supabase.from('mcp_connections').select('*').eq('status', 'active'),
    ]);

    if (agentsRes.error) {
      // If table doesn't exist yet in live DB, return empty list gracefully
      return NextResponse.json({ success: true, data: [] });
    }

    const agents = (agentsRes.data || []).map((agent: any) => {
      const creds = (credsRes.data || []).filter((c: any) => c.agent_id === agent.id);
      const scopes = (scopesRes.data || []).filter((s: any) => s.agent_id === agent.id);
      const activeConn = (connsRes.data || []).find((cn: any) => cn.agent_id === agent.id);

      const activeCred = creds.find((c: any) => !c.revoked_at && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()));

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        agentType: agent.agent_type,
        status: agent.status,
        createdAt: agent.created_at,
        tokenPrefix: activeCred?.token_prefix || null,
        credentialId: activeCred?.id || null,
        lastUsedAt: activeCred?.last_used_at || null,
        isConnected: Boolean(activeConn),
        activeClient: activeConn ? `${activeConn.client_name} ${activeConn.client_version || ''}`.trim() : null,
        activeIp: activeConn?.ip_address || null,
        scopeCount: scopes.length,
        scopes: scopes.map((s: any) => ({
          moduleKey: s.module_key,
          permission: s.permission,
        })),
      };
    });

    return NextResponse.json({ success: true, data: agents });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/mcp/agents
 * Register a new bot, mint a fresh token, and optionally assign initial scopes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, agentType = 'custom', initialScopes = [] } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Agent name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Create Agent Record
    const { data: agent, error: agentErr } = await supabase
      .from('mcp_agents')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        agent_type: agentType,
        status: 'active',
        created_by: 'Admin Operator',
      })
      .select()
      .single();

    if (agentErr || !agent) {
      return NextResponse.json({ success: false, error: `Failed to create agent: ${agentErr?.message}` }, { status: 500 });
    }

    // 2. Mint Opaque Bearer Token
    const { plaintextToken, tokenHash, tokenPrefix } = generateMcpToken();

    const { data: cred, error: credErr } = await supabase
      .from('mcp_agent_credentials')
      .insert({
        agent_id: agent.id,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        audience: 'https://hub.jaago.com.bd/api/mcp',
        created_by: 'Admin Operator',
      })
      .select()
      .single();

    if (credErr) {
      return NextResponse.json({ success: false, error: `Failed to issue credential: ${credErr.message}` }, { status: 500 });
    }

    // 3. Assign Initial Scopes (Default to granting 'read' on ALL modules & departments across the website)
    if (Array.isArray(initialScopes) && initialScopes.length > 0) {
      const scopeInserts = initialScopes.map((s: any) => ({
        agent_id: agent.id,
        module_key: s.moduleKey,
        permission: s.permission,
        granted_by: 'Admin Operator',
      }));
      await supabase.from('mcp_agent_scopes').insert(scopeInserts);
    } else {
      // Automatically grant full read access across each and every module and department
      const { data: allModules } = await supabase.from('mcp_modules').select('module_key');
      const defaultModules = allModules && allModules.length > 0
        ? allModules.map((m: any) => m.module_key)
        : [
            'dashboard', 'attendance', 'leave', 'on_duty', 'requests', 'hr', 'payroll',
            'finance', 'procurement', 'organization', 'documents', 'settings',
            'dept_admin_procurement', 'dept_finance_accounting', 'dept_child_welfare',
            'dept_digital_creative', 'dept_founders_office', 'dept_fundraising_grants',
            'dept_impact_investment', 'dept_project_implementation', 'dept_programmes',
            'dept_private_sector', 'dept_youth_development', 'dept_meal_monitoring',
          ];

      const readAllInserts = defaultModules.map((modKey: string) => ({
        agent_id: agent.id,
        module_key: modKey,
        permission: 'read',
        granted_by: 'System Auto-Provision (Full Website Read Access)',
      }));

      await supabase.from('mcp_agent_scopes').insert(readAllInserts);
    }

    const productionHost = process.env.NEXT_PUBLIC_APP_URL || 'https://hub.jaago.com.bd';
    const connectionLink = `${productionHost}/api/mcp?k=${plaintextToken}`;
    const pathConnectionLink = `${productionHost}/c/${plaintextToken}/mcp`;

    return NextResponse.json({
      success: true,
      message: 'Agent registered and credential minted successfully.',
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          agentType: agent.agent_type,
          status: agent.status,
        },
        credential: {
          id: cred.id,
          tokenPrefix,
          plaintextToken,
          connectionLink,
          pathConnectionLink,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

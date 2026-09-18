import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { generateMcpToken } from '@/lib/mcp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, name, description } = body;

    const supabase = getSupabaseAdmin();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status) updates.status = status;
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;

    const { data, error } = await supabase
      .from('mcp_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If revoked or suspended, optionally close active connections
    if (status === 'revoked' || status === 'suspended') {
      await supabase
        .from('mcp_connections')
        .update({ status: 'closed' })
        .eq('agent_id', id);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Revoke or issue a new credential
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'rotate' | 'revoke'

    const supabase = getSupabaseAdmin();

    if (action === 'revoke') {
      await supabase
        .from('mcp_agent_credentials')
        .update({ revoked_at: new Date().toISOString() })
        .eq('agent_id', id);

      await supabase
        .from('mcp_agents')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', id);

      await supabase
        .from('mcp_connections')
        .update({ status: 'closed' })
        .eq('agent_id', id);

      return NextResponse.json({ success: true, message: 'All credentials for this agent revoked and agent status set to revoked.' });
    }

    if (action === 'rotate') {
      // 1. Revoke existing
      await supabase
        .from('mcp_agent_credentials')
        .update({ revoked_at: new Date().toISOString() })
        .eq('agent_id', id);

      // 2. Mint new
      const { plaintextToken, tokenHash, tokenPrefix } = generateMcpToken();
      const { data: cred, error } = await supabase
        .from('mcp_agent_credentials')
        .insert({
          agent_id: id,
          token_hash: tokenHash,
          token_prefix: tokenPrefix,
          audience: 'https://hub.jaago.com.bd/api/mcp',
          created_by: 'Admin Operator',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      // Re-activate agent if it was revoked
      await supabase
        .from('mcp_agents')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id);

      const productionHost = process.env.NEXT_PUBLIC_APP_URL || 'https://hub.jaago.com.bd';
      return NextResponse.json({
        success: true,
        data: {
          credentialId: cred.id,
          tokenPrefix,
          plaintextToken, // Shown once
          connectionLink: `${productionHost}/api/mcp?k=${plaintextToken}`,
          pathConnectionLink: `${productionHost}/c/${plaintextToken}/mcp`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/mcp/agents/[id]
 * Permanently delete an agent, cascading to credentials, scopes, and connections
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // 1. Close any active connections
    await supabase
      .from('mcp_connections')
      .update({ status: 'closed' })
      .eq('agent_id', id);

    // 2. Delete agent record (cascades in DB to credentials, scopes, connections)
    const { error } = await supabase
      .from('mcp_agents')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Agent deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

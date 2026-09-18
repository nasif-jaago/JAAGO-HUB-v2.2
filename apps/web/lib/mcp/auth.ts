import crypto from 'node:crypto';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { McpAgentRecord, McpAgentScopeRecord, McpContext, McpPermission, McpModuleKey, McpAbility } from './types';

/**
 * Mint a first-party, admin-provisioned opaque bearer token
 * Format: jhmcp_live_<32 random hex characters>
 */
export function generateMcpToken(): { plaintextToken: string; tokenHash: string; tokenPrefix: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const plaintextToken = `jhmcp_live_${randomBytes}`;
  const tokenHash = hashMcpToken(plaintextToken);
  const tokenPrefix = plaintextToken.slice(0, 16);
  return { plaintextToken, tokenHash, tokenPrefix };
}

/**
 * Deterministic SHA-256 hash for token comparison
 */
export function hashMcpToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Timing-safe constant-time string comparison
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Builds a dynamic CASL Ability for the agent derived directly from its scopes
 */
export function buildAgentAbility(scopes: McpAgentScopeRecord[]): McpAbility {
  const { can, build } = new AbilityBuilder<McpAbility>(createMongoAbility);

  for (const s of scopes) {
    can(s.permission, s.moduleKey);
  }

  return build();
}

export interface VerifyTokenResult {
  authenticated: boolean;
  error?: string;
  statusCode?: number;
  context?: McpContext;
}

/**
 * Authenticate incoming Bearer token or Connection Link key and build execution context
 */
export async function verifyMcpToken(
  authHeaderOrToken: string | null | undefined,
  meta?: { client?: { name?: string; version?: string }; protocolVersion?: string },
  ipAddress?: string
): Promise<VerifyTokenResult> {
  let token = '';
  if (authHeaderOrToken && authHeaderOrToken.startsWith('Bearer ')) {
    token = authHeaderOrToken.slice('Bearer '.length).trim();
  } else if (authHeaderOrToken) {
    token = authHeaderOrToken.trim();
  }

  if (!token) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Missing or malformed Authorization header. Expected Bearer <token> or valid connection link.',
    };
  }

  if (!token.startsWith('jhmcp_live_') && !token.startsWith('jhmcp_link_')) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Invalid token format. Expected JAAGO HUB agent token (jhmcp_live_* or jhmcp_link_*).',
    };
  }

  const tokenHash = hashMcpToken(token);
  const supabase = getSupabaseAdmin();

  // 1. Fetch credential record
  const { data: cred, error: credErr } = await supabase
    .from('mcp_agent_credentials')
    .select('*, mcp_agents(*)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (credErr || !cred) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Unrecognized agent credential. Access token not found.',
    };
  }

  // 2. Validate revocation and expiry
  if (cred.revoked_at) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Access credential has been revoked by system administrator.',
    };
  }

  if (cred.expires_at && new Date(cred.expires_at).getTime() < Date.now()) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Access credential expired.',
    };
  }

  // 2b. Validate audience (RFC 9728 & Appendix A Scenario 4)
  const canonicalAudiences = [
    'https://hub.jaago.com.bd/api/mcp',
    'https://hub.jaago.com.bd',
    'http://localhost:3000/api/mcp',
    'http://localhost:3001/api/mcp',
  ];
  if (cred.audience && !canonicalAudiences.includes(cred.audience) && !cred.audience.includes('jaago.com.bd')) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Token audience mismatch. Foreign resource tokens not permitted.',
    };
  }

  const agent = cred.mcp_agents as unknown as McpAgentRecord;
  if (!agent || agent.status !== 'active') {
    return {
      authenticated: false,
      statusCode: 403,
      error: `Agent "${agent?.name || 'unknown'}" is currently ${agent?.status || 'inactive'}.`,
    };
  }

  // 3. Load active scopes
  const { data: scopesData } = await supabase
    .from('mcp_agent_scopes')
    .select('*')
    .eq('agent_id', agent.id);

  const scopes: McpAgentScopeRecord[] = (scopesData || []).map((s: any) => ({
    id: s.id,
    agentId: s.agent_id,
    moduleKey: s.module_key as McpModuleKey,
    permission: s.permission as McpPermission,
    resourceFilter: s.resource_filter,
  }));

  const ability = buildAgentAbility(scopes);
  const traceId = `trace-${crypto.randomUUID()}`;

  // 4. Update last_used_at asynchronously
  supabase
    .from('mcp_agent_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', cred.id)
    .then();

  return {
    authenticated: true,
    context: {
      agent,
      credentialId: cred.id,
      scopes,
      ability,
      traceId,
      clientName: meta?.client?.name,
      clientVersion: meta?.client?.version,
      protocolVersion: meta?.protocolVersion || '2026-07-28',
      ipAddress,
    },
  };
}

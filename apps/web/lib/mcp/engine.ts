import { NextRequest, NextResponse } from 'next/server';
import { verifyMcpToken } from '@/lib/mcp/auth';
import { MCP_TOOLS, MCP_RESOURCES, findMcpTool, findMcpResource } from '@/lib/mcp/tool-registry';
import { trackBotConnection, logMcpActivity } from '@/lib/mcp/tracker';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Method, Mcp-Name, Accept',
  'Access-Control-Max-Age': '86400',
};

// In-memory sliding rate limiter: 120 requests / min per agent
interface RateLimitBucket {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(agentId: string, limit = 120, windowMs = 60000): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(agentId);
  if (!bucket || now > bucket.resetTime) {
    rateLimitMap.set(agentId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
}

/**
 * Core MCP GET Handler (RFC 9728 Protected Resource Metadata)
 */
export async function handleMcpGet() {
  return NextResponse.json(
    {
      resource: 'https://hub.jaago.com.bd/api/mcp',
      protocol_version: '2026-07-28',
      transport: 'streamable-http',
      server_info: {
        name: 'JAAGO HUB Governed MCP Server',
        version: '2.2.0',
      },
      authentication: {
        type: 'oauth2_resource_server',
        methods: ['bearer'],
        token_format: 'jhmcp_live_*',
      },
      capabilities: {
        tools: { list: true, call: true },
        resources: { list: true, read: true },
        server_discover: true,
      },
      status: 'healthy',
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Core MCP POST Processor (Stateless, 2026-07-28)
 */
export async function handleMcpPost(req: NextRequest, explicitToken?: string) {
  const startTime = Date.now();

  // Origin validation for browser-originated clients (DNS rebinding protection)
  const origin = req.headers.get('origin');
  if (origin) {
    const isAllowedOrigin =
      origin === 'https://hub.jaago.com.bd' ||
      origin === 'http://localhost:3000' ||
      origin === 'http://localhost:3001' ||
      origin.endsWith('.jaago.com.bd');
    if (!isAllowedOrigin) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Invalid Origin for MCP request.' },
        },
        { status: 403, headers: CORS_HEADERS }
      );
    }
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const clientIp = (forwarded ? forwarded.split(',')[0]?.trim() : null) || req.headers.get('x-real-ip') || '127.0.0.1';
  const authHeader = req.headers.get('authorization');
  const searchParams = new URL(req.url).searchParams;
  const linkKey = searchParams.get('k') || searchParams.get('token') || searchParams.get('key');
  const credentialInput = explicitToken || authHeader || linkKey;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Request body must be valid JSON-RPC' },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const rpcId = body?.id ?? null;
  const method = body?.method || req.headers.get('mcp-method') || 'unknown';
  const params = body?.params || {};
  const meta = params?._meta || {};

  // 1. Authenticate Token or Connection Link Key
  const authResult = await verifyMcpToken(credentialInput, meta, clientIp);
  if (!authResult.authenticated || !authResult.context) {
    const errorMsg = authResult.error || 'Authentication required';
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: -32001,
          message: errorMsg,
          data: {
            auth_challenge: 'Bearer realm="JAAGO HUB Governed MCP Server"',
            resource: 'https://hub.jaago.com.bd/api/mcp',
          },
        },
      },
      {
        status: authResult.statusCode || 401,
        headers: {
          ...CORS_HEADERS,
          'WWW-Authenticate': 'Bearer realm="JAAGO HUB Governed MCP Server", resource="https://hub.jaago.com.bd/api/mcp"',
        },
      }
    );
  }

  const ctx = authResult.context;

  // 2. Sliding Rate Limit Check
  if (!checkRateLimit(ctx.agent.id, 120, 60000)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: -32000,
          message: 'Rate limit exceeded. Maximum 120 requests per minute per agent.',
        },
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Retry-After': '60',
        },
      }
    );
  }

  // 3. Track Live Bot Connection in Background
  const connIdPromise = trackBotConnection(ctx, meta?.capabilities);

  // 4. Dispatch JSON-RPC Methods
  try {
    // ── Method: ping ──
    if (method === 'ping') {
      const duration = Date.now() - startTime;
      connIdPromise.then((connId) => {
        logMcpActivity({ ctx, mcpMethod: 'ping', outcome: 'ok', durationMs: duration }, connId);
      });
      return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: {} }, { headers: CORS_HEADERS });
    }

    // ── Method: server/discover ──
    if (method === 'server/discover') {
      const duration = Date.now() - startTime;
      const discoveryResult = {
        protocolVersion: '2026-07-28',
        serverInfo: {
          name: 'JAAGO HUB Governed MCP Server',
          version: '2.2.0',
        },
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
          logging: false,
        },
        ttlMs: 60000,
      };

      connIdPromise.then((connId) => {
        logMcpActivity({ ctx, mcpMethod: 'server/discover', outcome: 'ok', durationMs: duration }, connId);
      });

      return NextResponse.json({ jsonrpc: '2.0', id: rpcId, result: discoveryResult }, { headers: CORS_HEADERS });
    }

    // ── Method: tools/list ──
    if (method === 'tools/list') {
      const duration = Date.now() - startTime;

      // Filter tools based on Agent's CASL grants
      const authorizedTools = MCP_TOOLS.filter((tool) =>
        ctx.ability.can(tool.permission, tool.moduleKey)
      ).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: tool.parametersDescription || {},
        },
      }));

      connIdPromise.then((connId) => {
        logMcpActivity(
          {
            ctx,
            mcpMethod: 'tools/list',
            outcome: 'ok',
            durationMs: duration,
            resultSummary: { count: authorizedTools.length },
          },
          connId
        );
      });

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            tools: authorizedTools,
            _meta: { ttlMs: 60000 },
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: tools/call ──
    if (method === 'tools/call') {
      const toolName = params?.name || req.headers.get('mcp-name');
      const toolArgs = params?.arguments || {};

      const tool = findMcpTool(toolName);
      if (!tool) {
        const duration = Date.now() - startTime;
        connIdPromise.then((connId) => {
          logMcpActivity(
            {
              ctx,
              mcpMethod: 'tools/call',
              mcpName: toolName,
              outcome: 'error',
              denialReason: 'Tool not found in registry',
              durationMs: duration,
              params: toolArgs,
            },
            connId
          );
        });

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32601,
              message: `Tool "${toolName}" not found in JAAGO HUB MCP registry`,
            },
          },
          { status: 404, headers: CORS_HEADERS }
        );
      }

      // Check CASL Scoped Authorization
      const isAllowed = ctx.ability.can(tool.permission, tool.moduleKey);
      if (!isAllowed) {
        const duration = Date.now() - startTime;
        connIdPromise.then((connId) => {
          logMcpActivity(
            {
              ctx,
              mcpMethod: 'tools/call',
              mcpName: tool.name,
              moduleKey: tool.moduleKey,
              permissionUsed: tool.permission,
              outcome: 'denied',
              denialReason: `Scoped grant missing: ${ctx.agent.name} lacks "${tool.permission}" on module "${tool.moduleKey}"`,
              durationMs: duration,
              params: toolArgs,
            },
            connId
          );
        });

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32003,
              message: `Access Denied: Scoped authorization missing. ${ctx.agent.name} lacks "${tool.permission}" on module "${tool.moduleKey}"`,
              data: {
                module: tool.moduleKey,
                required_permission: tool.permission,
                denial_reason: `Scoped grant missing: ${ctx.agent.name} lacks "${tool.permission}" on module "${tool.moduleKey}"`,
              },
            },
          },
          { status: 403, headers: CORS_HEADERS }
        );
      }

      // Validate input parameters against Zod schema
      const parseResult = tool.inputSchema.safeParse(toolArgs);
      if (!parseResult.success) {
        const duration = Date.now() - startTime;
        const validationError = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');

        connIdPromise.then((connId) => {
          logMcpActivity(
            {
              ctx,
              mcpMethod: 'tools/call',
              mcpName: tool.name,
              moduleKey: tool.moduleKey,
              permissionUsed: tool.permission,
              outcome: 'error',
              denialReason: `Schema validation failed: ${validationError}`,
              durationMs: duration,
              params: toolArgs,
            },
            connId
          );
        });

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: -32602,
              message: `Invalid params: ${validationError}`,
            },
          },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Execute Domain Handler
      const toolResult = await tool.handler(parseResult.data, ctx);
      const duration = Date.now() - startTime;

      connIdPromise.then((connId) => {
        logMcpActivity(
          {
            ctx,
            mcpMethod: 'tools/call',
            mcpName: tool.name,
            moduleKey: tool.moduleKey,
            permissionUsed: tool.permission,
            outcome: 'ok',
            durationMs: duration,
            params: toolArgs,
            resultSummary: { success: true },
          },
          connId
        );
      });

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: resources/list ──
    if (method === 'resources/list') {
      const duration = Date.now() - startTime;
      const authorizedResources = MCP_RESOURCES.filter((res) =>
        ctx.ability.can('read', res.moduleKey)
      ).map((res) => ({
        uri: res.uri,
        name: res.name,
        description: res.description,
        mimeType: res.mimeType || 'application/json',
      }));

      connIdPromise.then((connId) => {
        logMcpActivity(
          {
            ctx,
            mcpMethod: 'resources/list',
            outcome: 'ok',
            durationMs: duration,
            resultSummary: { count: authorizedResources.length },
          },
          connId
        );
      });

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            resources: authorizedResources,
            _meta: { ttlMs: 60000 },
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: resources/read ──
    if (method === 'resources/read') {
      const uri = params?.uri;
      const resource = findMcpResource(uri);

      if (!resource) {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32602, message: `Resource with URI "${uri}" not found` },
          },
          { status: 404, headers: CORS_HEADERS }
        );
      }

      if (!ctx.ability.can('read', resource.moduleKey)) {
        const duration = Date.now() - startTime;
        connIdPromise.then((connId) => {
          logMcpActivity(
            {
              ctx,
              mcpMethod: 'resources/read',
              mcpName: uri,
              moduleKey: resource.moduleKey,
              permissionUsed: 'read',
              outcome: 'denied',
              denialReason: 'No read permission on resource module',
              durationMs: duration,
            },
            connId
          );
        });

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32003, message: 'Access Denied: Read permission required.' },
          },
          { status: 403, headers: CORS_HEADERS }
        );
      }

      const resData = await resource.handler(ctx);
      const duration = Date.now() - startTime;

      connIdPromise.then((connId) => {
        logMcpActivity(
          {
            ctx,
            mcpMethod: 'resources/read',
            mcpName: uri,
            moduleKey: resource.moduleKey,
            permissionUsed: 'read',
            outcome: 'ok',
            durationMs: duration,
          },
          connId
        );
      });

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            contents: [
              {
                uri,
                mimeType: resource.mimeType || 'application/json',
                text: resData.text || (resData.json ? JSON.stringify(resData.json, null, 2) : ''),
              },
            ],
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: resources/templates/list ──
    if (method === 'resources/templates/list') {
      const duration = Date.now() - startTime;
      connIdPromise.then((connId) => {
        logMcpActivity({ ctx, mcpMethod: 'resources/templates/list', outcome: 'ok', durationMs: duration }, connId);
      });
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            resourceTemplates: [],
            _meta: { ttlMs: 60000 },
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: prompts/list ──
    if (method === 'prompts/list') {
      const duration = Date.now() - startTime;
      connIdPromise.then((connId) => {
        logMcpActivity({ ctx, mcpMethod: 'prompts/list', outcome: 'ok', durationMs: duration }, connId);
      });
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            prompts: [],
            _meta: { ttlMs: 60000 },
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // ── Method: prompts/get ──
    if (method === 'prompts/get') {
      const promptName = params?.name;
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: rpcId,
          error: { code: -32602, message: `Prompt "${promptName}" not found.` },
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Unknown method
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: rpcId,
        error: { code: -32601, message: `Method "${method}" not implemented` },
      },
      { status: 501, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    const duration = Date.now() - startTime;
    connIdPromise.then((connId) => {
      logMcpActivity(
        {
          ctx,
          mcpMethod: method,
          outcome: 'error',
          denialReason: err?.message || 'Server internal execution fault',
          durationMs: duration,
        },
        connId
      );
    });

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: rpcId,
        error: { code: -32603, message: err?.message || 'Internal server error' },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

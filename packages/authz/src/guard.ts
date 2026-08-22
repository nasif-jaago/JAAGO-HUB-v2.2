import { extractTraceHeaders, runWithContext } from '@jaago/observability';
import { logger } from '@jaago/logger';
import { extractBearerToken, validateAccessToken, UserSession } from '@jaago/auth';
import { createErrorEnvelope, AppError, ErrorCode, UnauthorizedError, ForbiddenError, TooManyRequestsError } from '@jaago/contracts';
import { globalRateLimiter, RATE_LIMIT_POLICIES } from '@jaago/cache';
import { evaluatePermission } from './evaluator';

export interface ApiHandlerContext {
  traceId: string;
  requestId: string;
  session?: UserSession | undefined;
  organizationId?: string | undefined;
}

export interface ApiHandlerOptions {
  permission?: string | undefined;
  requireAuth?: boolean | undefined;
  rateLimitTier?: keyof typeof RATE_LIMIT_POLICIES | undefined;
  handler: (request: Request, context: ApiHandlerContext) => Promise<Response>;
}

export function createApiHandler(options: ApiHandlerOptions) {
  return async function (request: Request): Promise<Response> {
    const { traceId, requestId, correlationId } = extractTraceHeaders(request.headers);
    const url = new URL(request.url);
    const route = url.pathname;
    const httpMethod = request.method;
    const requireAuth = options.requireAuth !== false;

    return runWithContext({ traceId, requestId, correlationId, route, httpMethod }, async () => {
      try {
        // Rate limiting check
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const rateLimitKey = `${options.rateLimitTier || 'API'}:${ip}`;
        const rateLimitResult = globalRateLimiter.check(rateLimitKey, options.rateLimitTier || 'API');

        if (!rateLimitResult.allowed) {
          logger.warn('SECURITY', 'rate_limit.exceeded', {
            traceId,
            metadata: { ip, route, tier: options.rateLimitTier || 'API' },
          });

          throw new TooManyRequestsError('Too many requests. Please try again later.');
        }
        let session: UserSession | undefined;

        if (requireAuth) {
          const authHeader = request.headers.get('authorization');
          const token = extractBearerToken(authHeader);

          if (!token) {
            throw new UnauthorizedError('Authentication token is required');
          }

          session = await validateAccessToken(token);

          // Check required permission if declared
          if (options.permission) {
            const hasAccess = evaluatePermission(
              {
                userId: session.userId,
                organizationId: session.organizationId,
                roles: session.roles,
                permissions: session.permissions,
                isSuperAdmin: session.isSuperAdmin,
              },
              {
                permission: options.permission,
                organizationId: session.organizationId,
              },
            );

            if (!hasAccess) {
              logger.warn('SECURITY', 'authz.permission_denied', {
                userId: session.userId,
                organizationId: session.organizationId,
                errorCode: ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS,
                metadata: {
                  requiredPermission: options.permission,
                  userPermissions: session.permissions,
                },
              });

              throw new ForbiddenError(
                `Missing required permission: ${options.permission}`,
                ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS,
              );
            }
          }
        }

        const handlerContext: ApiHandlerContext = {
          traceId,
          requestId,
          session,
          organizationId: session?.organizationId,
        };

        const response = await options.handler(request, handlerContext);

        // Inject standard trace and rate limit headers in outgoing response
        response.headers.set('X-Trace-Id', traceId);
        response.headers.set('X-Request-Id', requestId);
        response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        return response;
      } catch (err: unknown) {
        let statusCode = 500;
        let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
        let message = 'An internal server error occurred';
        let details: unknown = undefined;

        if (err instanceof AppError) {
          statusCode = err.statusCode;
          errorCode = err.code;
          message = err.message;
          details = err.details;
        } else if (err instanceof Error) {
          message = err.message;
        }

        logger.error('HTTP', 'request.error', err, {
          route,
          httpMethod,
          statusCode,
          errorCode,
          errorMessage: message,
        });

        const envelope = createErrorEnvelope(errorCode, message, traceId, details);

        return new Response(JSON.stringify(envelope), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': traceId,
            'X-Request-Id': requestId,
          },
        });
      }
    });
  };
}

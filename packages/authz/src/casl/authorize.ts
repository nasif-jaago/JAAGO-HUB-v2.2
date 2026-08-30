import { extractTraceHeaders, runWithContext } from '@jaago/observability';
import { logger } from '@jaago/logger';
import { extractBearerToken, validateAccessToken, UserSession } from '@jaago/auth';
import {
  createErrorEnvelope,
  AppError,
  ErrorCode,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
} from '@jaago/contracts';
import { globalRateLimiter, RATE_LIMIT_POLICIES } from '@jaago/cache';
import { AppAbility, UserAuthzContext } from './types';
import { AppAction } from './actions';
import { AppSubject } from './subjects';
import { createAppAbility } from './ability-factory';

/**
 * Asserts that the ability permits the requested action on the subject.
 * Throws standard 403 ForbiddenError if denied.
 */
export function assertCan(
  ability: AppAbility,
  action: AppAction,
  subject: AppSubject,
  field?: string,
): void {
  const allowed = field ? ability.can(action, subject, field) : ability.can(action, subject);

  if (!allowed) {
    const subjectName = typeof subject === 'string' ? subject : subject.constructor?.name || 'Resource';
    throw new ForbiddenError(
      `You do not have permission to perform '${action}' on '${subjectName}'.`,
      ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS,
    );
  }
}

/**
 * Boolean check for whether ability permits action on subject.
 */
export function canUser(
  ability: AppAbility,
  action: AppAction,
  subject: AppSubject,
  field?: string,
): boolean {
  return field ? ability.can(action, subject, field) : ability.can(action, subject);
}

export interface CaslApiHandlerContext {
  traceId: string;
  requestId: string;
  session?: UserSession | undefined;
  organizationId?: string | undefined;
  ability?: AppAbility | undefined;
}

export interface CaslApiHandlerOptions {
  action?: AppAction | undefined;
  subject?: AppSubject | undefined;
  requireAuth?: boolean | undefined;
  rateLimitTier?: keyof typeof RATE_LIMIT_POLICIES | undefined;
  handler: (request: Request, context: CaslApiHandlerContext) => Promise<Response>;
}

/**
 * Standardized API Handler Guard enforcing Rate Limiting, Authentication,
 * and Server-side CASL Authorization across all API route endpoints.
 */
export function createCaslApiHandler(options: CaslApiHandlerOptions) {
  return async function (request: Request): Promise<Response> {
    const { traceId, requestId, correlationId } = extractTraceHeaders(request.headers);
    const url = new URL(request.url);
    const route = url.pathname;
    const httpMethod = request.method;
    const requireAuth = options.requireAuth !== false;

    return runWithContext({ traceId, requestId, correlationId, route, httpMethod }, async () => {
      try {
        // 1. Rate Limiting Check
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
        let ability: AppAbility | undefined;

        // 2. Authentication & Identity Resolution
        if (requireAuth) {
          const authHeader = request.headers.get('authorization');
          const token = extractBearerToken(authHeader);

          if (!token) {
            throw new UnauthorizedError('Authentication token is required');
          }

          session = await validateAccessToken(token);

          const authzContext: UserAuthzContext = {
            userId: session.userId,
            email: session.email,
            organizationId: session.organizationId,
            roles: session.roles,
            permissions: session.permissions,
            isSuperAdmin: session.isSuperAdmin,
          };

          // 3. Build CASL Ability Instance
          ability = createAppAbility(authzContext);

          // 4. Server-Side CASL Authorization Assertion
          if (options.action && options.subject) {
            try {
              assertCan(ability, options.action, options.subject);
            } catch (authzErr) {
              logger.warn('SECURITY', 'authz.casl_denied', {
                userId: session.userId,
                organizationId: session.organizationId,
                errorCode: ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS,
                metadata: {
                  action: options.action,
                  subject: options.subject,
                  userRoles: session.roles,
                },
              });
              throw authzErr;
            }
          }
        }

        const handlerContext: CaslApiHandlerContext = {
          traceId,
          requestId,
          session,
          organizationId: session?.organizationId,
          ability,
        };

        const response = await options.handler(request, handlerContext);

        // Inject standard trace and rate limit headers
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

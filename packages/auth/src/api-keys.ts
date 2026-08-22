import { randomBytes, createHash } from 'node:crypto';

export interface GeneratedApiClient {
  clientId: string;
  clientSecret: string; // Only shown once at creation time!
  hashedSecret: string;
  name: string;
  scopes: string[];
  rateLimitTier: 'API' | 'REPORTS' | 'INTEGRATION';
  createdAt: string;
}

export class ApiKeyManager {
  /**
   * Generates production-ready scoped client credentials
   */
  public static generateCredentials(params: {
    name: string;
    environment?: 'live' | 'test';
    scopes: string[];
    rateLimitTier?: 'API' | 'REPORTS' | 'INTEGRATION';
  }): GeneratedApiClient {
    const envPrefix = params.environment === 'test' ? 'jg_test_' : 'jg_live_';
    const secPrefix = params.environment === 'test' ? 'sk_test_' : 'sk_live_';

    const clientId = `${envPrefix}${randomBytes(12).toString('hex')}`;
    const clientSecret = `${secPrefix}${randomBytes(24).toString('hex')}`;
    const hashedSecret = createHash('sha256').update(clientSecret).digest('hex');

    return {
      clientId,
      clientSecret,
      hashedSecret,
      name: params.name,
      scopes: params.scopes,
      rateLimitTier: params.rateLimitTier || 'API',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Verifies if a given clientSecret matches hashedSecret and checks required scope
   */
  public static verifyCredentials(
    rawSecret: string,
    hashedSecret: string,
    assignedScopes: string[],
    requiredScope?: string,
  ): { valid: boolean; reason?: string } {
    const computedHash = createHash('sha256').update(rawSecret).digest('hex');
    if (computedHash !== hashedSecret) {
      return { valid: false, reason: 'Invalid client credentials secret' };
    }

    if (requiredScope) {
      const hasWildcard = assignedScopes.includes('*');
      const hasDirectScope = assignedScopes.includes(requiredScope);
      const hasDomainWildcard = assignedScopes.some(
        (s) => s.endsWith('.*') && requiredScope.startsWith(s.slice(0, -1)),
      );

      if (!hasWildcard && !hasDirectScope && !hasDomainWildcard) {
        return { valid: false, reason: `Missing required scope: ${requiredScope}` };
      }
    }

    return { valid: true };
  }
}

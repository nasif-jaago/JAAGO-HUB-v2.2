export const SENSITIVE_KEYS = new Set([
  'password',
  'passwordconfirmation',
  'currentpassword',
  'newpassword',
  'authorization',
  'cookie',
  'set-cookie',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'apikey',
  'apisecret',
  'clientsecret',
  'privatekey',
  'servicerolekey',
  'smtppassword',
  'oauthtoken',
  'googlerefreshtoken',
  'githubtoken',
  'encryptionmasterkey',
  'app_secret',
]);

const REDACTED_PLACEHOLDER = '[REDACTED]';

export function redactSensitiveData<T>(data: T, depth = 0): T {
  if (depth > 10 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check for bearer tokens or basic auth strings
    if (data.toLowerCase().startsWith('bearer ') || data.toLowerCase().startsWith('basic ')) {
      return REDACTED_PLACEHOLDER as unknown as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEYS.has(normalizedKey)) {
        result[key] = REDACTED_PLACEHOLDER;
      } else {
        result[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return result as T;
  }

  return data;
}

import { EnvSchema, Env } from './env.schema';
import dotenv from 'dotenv';

let cachedConfig: Env | null = null;

export function loadConfig(rawEnv: Record<string, string | undefined> = process.env): Env {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Load from .env if not already populated
  dotenv.config();

  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    const errorMessage = `\n=================================================================\n` +
      `[JAAGO HUB FATAL CONFIG ERROR] Environment validation failed:\n` +
      `${errorDetails}\n` +
      `=================================================================\n`;

    // Fail-safe boot abort
    if (process.env['NODE_ENV'] !== 'test') {
      console.error(errorMessage);
    }
    throw new Error(errorMessage);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

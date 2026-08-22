import { z } from 'zod';

export const EnvSchema = z.object({
  // ── APPLICATION ──
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_TIMEZONE: z.string().default('Asia/Dhaka'),
  APP_CURRENCY: z.string().default('BDT'),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),

  // ── DATABASE (Primary Transactional Supabase / Postgres) ──
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // ── SUPABASE AUTH & STORAGE (Primary) ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // ── REDIS 7 (Cache, BullMQ, Distributed Locks, Rate Limiting) ──
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TLS: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

  // ── AUTH & SECURITY ──
  AUTH_SESSION_EXPIRY_SECONDS: z.coerce.number().default(604800), // 7 days
  AUTH_MFA_ENFORCED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  ENCRYPTION_MASTER_KEY: z
    .string()
    .length(64, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes for AES-256-GCM)'),
  CORS_ALLOWED_ORIGINS: z.string().default('https://jaagohub.jaago.com.bd,https://jaagocore.jaago.com.bd'),
  RATE_LIMIT_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  // ── LOGGING & OBSERVABILITY ──
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_SPOOL_DIR: z.string().default('/var/lib/jaago-hub/log-spool'),
  LOG_SPOOL_MAX_TOTAL_BYTES: z.coerce.number().default(1073741824), // 1 GB
  LOG_SPOOL_ROTATE_MAX_BYTES: z.coerce.number().default(33554432),   // 32 MB
  LOG_SPOOL_ROTATE_MAX_SECONDS: z.coerce.number().default(900),     // 15 min

  // ── SEPARATE LOGGER SUPABASE PROJECT (Req 59) ──
  LOGGER_DATABASE_URL: z.string().url().optional(),
  LOGGER_SUPABASE_URL: z.string().url().optional(),
  LOGGER_SUPABASE_SERVICE_KEY: z.string().optional(),

  // ── GOOGLE OAUTH & GOOGLE DRIVE BACKUP ──
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DRIVE_BACKUP_FOLDER_ID: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_ID: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DRIVE_ENCRYPTED_REFRESH_TOKEN: z.string().optional(),

  // ── EMAIL (SMTP / API) ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('JAAGO HUB <no-reply@jaago.com.bd>'),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'sendgrid', 'mock']).default('smtp'),

  // ── GITHUB & MCP ──
  GITHUB_READ_ONLY_TOKEN: z.string().optional(),
  GITHUB_REPO_OWNER: z.string().default('jaago-foundation'),
  GITHUB_REPO_NAME: z.string().default('jaago-hub'),

  // ── STORAGE & SCANNING ──
  STORAGE_PROVIDER: z.enum(['supabase', 's3', 'local']).default('supabase'),
  STORAGE_BUCKET_PRIVATE: z.string().default('jaago-private-docs'),
  STORAGE_BUCKET_PUBLIC: z.string().default('jaago-public-assets'),
  STORAGE_MAX_FILE_SIZE_BYTES: z.coerce.number().default(26214400), // 25 MB
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().default(3310),

  // ── AI LOG ANALYSIS (Req 67, disabled by default) ──
  AI_LOG_ANALYSIS_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  GEMINI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

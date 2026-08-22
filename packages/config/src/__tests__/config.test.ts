import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, resetConfigCache } from '../config.loader';

describe('packages/config - Environment Validation', () => {
  beforeEach(() => {
    resetConfigCache();
  });

  it('fails safely when critical environment variables are missing', () => {
    const invalidEnv = {
      NODE_ENV: 'test',
    };

    assert.throws(
      () => {
        loadConfig(invalidEnv);
      },
      {
        message: /Environment validation failed/,
      },
    );
  });

  it('loads successfully when valid configuration is provided', () => {
    const validEnv = {
      NODE_ENV: 'test',
      APP_SECRET: 'supersecretstringthatisatleast32charslong',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/jaago_hub',
      NEXT_PUBLIC_SUPABASE_URL: 'https://testproject.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-longer-than-20-chars',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-longer-than-20-chars',
      ENCRYPTION_MASTER_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };

    const config = loadConfig(validEnv);
    assert.equal(config.NODE_ENV, 'test');
    assert.equal(config.APP_TIMEZONE, 'Asia/Dhaka');
    assert.equal(config.APP_CURRENCY, 'BDT');
    assert.equal(config.REDIS_PORT, 6379);
    assert.equal(config.STORAGE_MAX_FILE_SIZE_BYTES, 26214400);
  });
});

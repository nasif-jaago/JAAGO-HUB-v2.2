import { loadConfig } from '../../packages/config/src/index';

console.log('[Check-Env] Validating current environment configuration against Zod schema...');

try {
  const config = loadConfig(process.env);
  console.log(`[Check-Env] Success! Configuration is valid.`);
  console.log(`  - Environment: ${config.NODE_ENV}`);
  console.log(`  - App Timezone: ${config.APP_TIMEZONE}`);
  console.log(`  - Currency: ${config.APP_CURRENCY}`);
  console.log(`  - Port: ${config.PORT}`);
} catch (error) {
  console.error(`[Check-Env] Validation failed:`, error);
  process.exit(1);
}

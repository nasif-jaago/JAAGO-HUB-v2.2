import Redis, { RedisOptions } from 'ioredis';
import { logger } from '@jaago/logger';

let redisInstance: Redis | null = null;

export function getRedisClient(customUrl?: string): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const url = customUrl || process.env['REDIS_URL'] || 'redis://localhost:6379';

  const options: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };

  redisInstance = new Redis(url, options);

  redisInstance.on('error', (err) => {
    logger.warn('SYSTEM', 'redis.connection_error', {
      metadata: { error: err.message },
    });
  });

  redisInstance.on('connect', () => {
    logger.info('SYSTEM', 'redis.connected', {
      metadata: { url: url.replace(/:[^:@]+@/, ':***@') },
    });
  });

  return redisInstance;
}

export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit().catch(() => {});
    redisInstance = null;
  }
}

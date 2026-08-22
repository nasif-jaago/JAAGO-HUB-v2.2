import { randomUUID } from 'node:crypto';

export interface DistributedLock {
  key: string;
  token: string;
  acquired: boolean;
}

// In-memory fallback map for test environments without live Redis daemon
const memoryLocks = new Map<string, { token: string; expiresAt: number }>();

export async function acquireDistributedLock(
  key: string,
  ttlMs = 5000,
  retryCount = 3,
  retryDelayMs = 100,
): Promise<DistributedLock> {
  const token = randomUUID();
  const lockKey = `lock:${key}`;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    const now = Date.now();
    const existing = memoryLocks.get(lockKey);

    if (!existing || existing.expiresAt <= now) {
      memoryLocks.set(lockKey, { token, expiresAt: now + ttlMs });
      return { key: lockKey, token, acquired: true };
    }

    if (attempt < retryCount) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  return { key: lockKey, token, acquired: false };
}

export async function releaseDistributedLock(lock: DistributedLock): Promise<boolean> {
  const existing = memoryLocks.get(lock.key);
  if (existing && existing.token === lock.token) {
    memoryLocks.delete(lock.key);
    return true;
  }
  return false;
}

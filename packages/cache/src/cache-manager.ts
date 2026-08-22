import { acquireDistributedLock, releaseDistributedLock } from './lock';

export interface CacheOptions {
  ttlSeconds?: number; // Default 300 (5m)
  tags?: string[];
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class MultiTenantCacheManager {
  private memoryStore = new Map<string, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<string>>();

  public buildKey(organizationId: string, moduleKey: string, subKey: string): string {
    return `jaago:${organizationId}:${moduleKey}:${subKey}`;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const entry = this.memoryStore.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      await this.invalidate(key);
      return undefined;
    }

    return entry.value as T;
  }

  public async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    const ttlSeconds = options?.ttlSeconds ?? 300;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const tags = options?.tags || [];

    this.memoryStore.set(key, { value, expiresAt, tags });

    // Index tags for fast tag-based invalidation
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  /**
   * Stampede-protected cached getter.
   * If cache misses, acquires a lock so only ONE worker runs the factory, while others await the result.
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Acquire stampede protection mutex lock for this key
    const lock = await acquireDistributedLock(key, 5000);

    try {
      // Double check if another worker populated the cache while we waited for lock
      const doubleCheck = await this.get<T>(key);
      if (doubleCheck !== undefined) {
        return doubleCheck;
      }

      // Compute value
      const computed = await factory();
      await this.set(key, computed, options);
      return computed;
    } finally {
      if (lock.acquired) {
        await releaseDistributedLock(lock);
      }
    }
  }

  public async invalidate(key: string): Promise<void> {
    const entry = this.memoryStore.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
      this.memoryStore.delete(key);
    }
  }

  public async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) {
      return 0;
    }

    let deletedCount = 0;
    for (const key of Array.from(keys)) {
      this.memoryStore.delete(key);
      deletedCount++;
    }

    this.tagIndex.delete(tag);
    return deletedCount;
  }
}

export const globalCacheManager = new MultiTenantCacheManager();

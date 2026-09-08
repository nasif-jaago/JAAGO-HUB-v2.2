'use client';

/**
 * Universal In-Memory & LocalStorage SWR Caching & Deduplication Layer
 * Ensures 0ms instantaneous page loads and prevents redundant parallel HTTP requests.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export function cleanupExpiredCache(forceAllCache: boolean = false): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jaago_cache_')) {
        if (forceAllCache) {
          keysToRemove.push(k);
        } else {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && parsed.timestamp && parsed.ttl) {
                if (now - parsed.timestamp > parsed.ttl) {
                  keysToRemove.push(k);
                }
              } else {
                keysToRemove.push(k);
              }
            }
          } catch {
            keysToRemove.push(k);
          }
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function getCachedDataSync<T>(key: string, fallback: T): T {
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key)!;
    return entry.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`jaago_cache_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data !== undefined) {
          const now = Date.now();
          const ttl = parsed.ttl || 30000;
          const timestamp = parsed.timestamp || now;
          if (now - timestamp < ttl) {
            memoryCache.set(key, {
              data: parsed.data,
              timestamp,
              ttl,
            });
            return parsed.data;
          } else {
            localStorage.removeItem(`jaago_cache_${key}`);
          }
        }
      }
    } catch {}
  }
  return fallback;
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = 30000): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
      });
      // Skip caching oversized payloads (>250KB) to preserve browser localStorage quota
      if (serialized.length > 250000) {
        return;
      }
      try {
        localStorage.setItem(`jaago_cache_${key}`, serialized);
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError' || err?.code === 22) {
          cleanupExpiredCache(true);
          try {
            localStorage.setItem(`jaago_cache_${key}`, serialized);
          } catch {
            // Silently retain in in-memory cache
          }
        }
      }
    } catch {}
  }
}

export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('jaago_cache_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  } else {
    for (const k of Array.from(memoryCache.keys())) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const fullKey = `jaago_cache_${keyOrPrefix}`;
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k === fullKey || k.startsWith(fullKey))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }

  // Broadcast cross-tab and cross-component invalidation event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_cache_invalidated', { detail: keyOrPrefix }));
  }
}

// Attach listener once in browser for multi-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('jaago_cache_invalidated', (e: Event) => {
    const key = (e as CustomEvent).detail;
    if (!key) {
      memoryCache.clear();
    } else {
      for (const k of Array.from(memoryCache.keys())) {
        if (k === key || k.startsWith(key)) {
          memoryCache.delete(k);
        }
      }
    }
  });

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key && e.key.startsWith('jaago_cache_')) {
      const cacheKey = e.key.replace('jaago_cache_', '');
      memoryCache.delete(cacheKey);
    }
  });

  // Automatically prune expired cache on load to keep localStorage lean
  cleanupExpiredCache();
}

/**
 * Executes a fetcher with in-flight deduplication and SWR caching
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 30000,
  forceRefresh: boolean = false
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  // Return fresh memory cache if valid and not force-refreshing
  if (!forceRefresh && cached && now - cached.timestamp < cached.ttl) {
    return cached.data;
  }

  // Deduplicate in-flight requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = (async () => {
    try {
      const freshData = await fetcher();
      if (freshData !== null && freshData !== undefined) {
        setCachedData(key, freshData, ttlMs);
      }
      return freshData;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}


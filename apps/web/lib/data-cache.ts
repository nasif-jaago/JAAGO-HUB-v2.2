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
          memoryCache.set(key, {
            data: parsed.data,
            timestamp: parsed.timestamp || Date.now(),
            ttl: parsed.ttl || 30000,
          });
          return parsed.data;
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
      localStorage.setItem(
        `jaago_cache_${key}`,
        JSON.stringify({
          data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
        })
      );
    } catch {}
  }
}

export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    return;
  }
  for (const k of Array.from(memoryCache.keys())) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      memoryCache.delete(k);
    }
  }
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

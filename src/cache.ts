import {
  ASTRO_CACHE_DIR,
  ASTRO_CACHE_ENABLED,
  ASTRO_CACHE_MAX_TIME_TO_LIVE,
  ASTRO_CACHE_MIN_TIME_TO_STALE,
} from "astro:env/server";
import { FlatCache } from "flat-cache";
import { createStaleWhileRevalidateCache } from "stale-while-revalidate-cache";

const FLAT_CACHE_TTL = ASTRO_CACHE_MAX_TIME_TO_LIVE * 2; // GC backstop

type Clearable = { clear(): void };

const caches: Clearable[] = [];

function deriveKey(args: unknown[]): string {
  return args.length === 0 ? "_" : JSON.stringify(args);
}

/**
 * Wraps an async function with SWR caching — stale data is served instantly
 * while fresh data is fetched in the background. Backed by flat-cache for
 * disk persistence.
 *
 * When caching is disabled (e.g. during `astro dev` without `devCaching`),
 * the returned function calls `fn` directly with no caching.
 *
 * @param fn - The async function to cache.
 * @param options - Cache configuration.
 * @param options.name - Unique cache identifier used as the flat-cache ID.
 * @param options.max - LRU size limit. `0` or omitted means unlimited.
 * @returns A cached version of `fn` with a `.clear()` method.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic variadic args
export function swr<Args extends any[], V>(
  fn: (...args: Args) => Promise<V>,
  options: { name: string; max?: number }
): ((...args: Args) => Promise<V>) & Clearable {
  if (!ASTRO_CACHE_ENABLED) {
    return Object.assign((...args: Args) => fn(...args), {
      clear(): void {},
    });
  }

  const flatCache = new FlatCache({
    cacheId: options.name,
    cacheDir: ASTRO_CACHE_DIR,
    ttl: FLAT_CACHE_TTL,
    // SWR stores 2 keys per entry (value + __swr_time__ timestamp), so double
    // the LRU size to avoid the timestamp key evicting the value key.
    lruSize: (options.max ?? 0) === 0 ? 0 : (options.max ?? 0) * 2,
  });

  flatCache.load();

  const storage = {
    getItem(key: string): unknown | null {
      return flatCache.get(key) ?? null;
    },
    setItem(key: string, value: unknown): void {
      flatCache.set(key, value);
      flatCache.save();
    },
    removeItem(key: string): void {
      flatCache.removeKey(key);
      flatCache.save();
    },
  };

  const swrCache = createStaleWhileRevalidateCache({
    storage,
    minTimeToStale: ASTRO_CACHE_MIN_TIME_TO_STALE,
    maxTimeToLive: ASTRO_CACHE_MAX_TIME_TO_LIVE,
  });

  const cached = Object.assign(
    async (...args: Args): Promise<V> => {
      const key = deriveKey(args);
      const result = await swrCache(key, () => fn(...args));
      return result.value;
    },
    {
      clear(): void {
        flatCache.clear();
        flatCache.save();
      },
    }
  );

  caches.push(cached);
  return cached;
}

/**
 * Wraps an async function with a simple in-memory cache backed by flat-cache.
 * Use for non-serializable data (e.g. `ArrayBuffer`) or cases where SWR is
 * unnecessary.
 *
 * When caching is disabled (e.g. during `astro dev` without `devCaching`),
 * the returned function calls `fn` directly with no caching.
 *
 * @param fn - The async function to cache.
 * @param options - Cache configuration.
 * @param options.name - Unique cache identifier used as the flat-cache ID.
 * @param options.max - LRU size limit. `0` or omitted means unlimited.
 * @param options.ttl - Time-to-live in ms. Defaults to `ASTRO_CACHE_MIN_TIME_TO_STALE`.
 * @param options.persist - Write cache to disk. Defaults to `true`.
 * @returns A cached version of `fn` with a `.clear()` method.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic variadic args
export function memo<Args extends any[], V>(
  fn: (...args: Args) => Promise<V>,
  options: { name: string; max?: number; ttl?: number; persist?: boolean }
): ((...args: Args) => Promise<V>) & Clearable {
  if (!ASTRO_CACHE_ENABLED) {
    return Object.assign((...args: Args) => fn(...args), {
      clear(): void {},
    });
  }

  const persist = options.persist !== false;
  const flatCache = new FlatCache({
    cacheId: options.name,
    cacheDir: ASTRO_CACHE_DIR,
    ttl: options.ttl ?? ASTRO_CACHE_MIN_TIME_TO_STALE,
    lruSize: options.max ?? 0,
  });

  if (persist) flatCache.load();

  const cached = Object.assign(
    async (...args: Args): Promise<V> => {
      const key = deriveKey(args);
      const existing = flatCache.get(key) as V | undefined;
      if (existing !== undefined) {
        return existing;
      }

      const value = await fn(...args);
      flatCache.set(key, value);
      if (persist) flatCache.save();
      return value;
    },
    {
      clear(): void {
        flatCache.clear();
        if (persist) flatCache.save();
      },
    }
  );

  caches.push(cached);
  return cached;
}

/** Clears all caches created by {@link swr} and {@link memo}. */
export function clearAllCaches(): void {
  for (const cache of caches) {
    cache.clear();
  }
}

// Module-level cache — survives component unmount/remount within one browser session.
// Keys are arbitrary strings; TTL defaults to 2 minutes.

const store = new Map<string, { data: unknown; ts: number }>()
const DEFAULT_TTL = 2 * 60 * 1000 // 2 min

export function cacheGet<T>(key: string, ttl = DEFAULT_TTL): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.ts > ttl) { store.delete(key); return undefined }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T): T {
  store.set(key, { data, ts: Date.now() })
  return data
}

export function cacheDelete(key: string) {
  store.delete(key)
}

/** Run fetcher, return cached result instantly if fresh, then always re-fetch. */
export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const cached = cacheGet<T>(key, ttl)
  if (cached !== undefined) {
    // Return cached immediately; background-refresh so next render gets fresh data
    fetcher().then(fresh => cacheSet(key, fresh)).catch(() => {})
    return cached
  }
  const data = await fetcher()
  return cacheSet(key, data)
}

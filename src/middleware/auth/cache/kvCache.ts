import type { KeyValueCache } from './types'

export function createKvCacheAdapter(kv: KVNamespace): KeyValueCache {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const val = await kv.get(key)
        return val ? (JSON.parse(val) as T) : null
      } catch {
        return null
      }
    },
    async set<T>(key: string, value: T, ttlSeconds = 600): Promise<void> {
      try {
        await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
      } catch {
        // ignore
      }
    },
  }
}


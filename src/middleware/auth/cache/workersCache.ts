import type { KeyValueCache } from './types'

export function createWorkersCacheAdapter(): KeyValueCache {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gc: any = (globalThis as any).caches
        if (!gc || !gc.default) return null
        const req = new Request('https://cache.local/' + encodeURIComponent(key))
        const res = await gc.default.match(req)
        if (!res) return null
        const text = await res.text()
        return JSON.parse(text) as T
      } catch {
        return null
      }
    },
    async set<T>(key: string, value: T, ttlSeconds = 600): Promise<void> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gc: any = (globalThis as any).caches
        if (!gc || !gc.default) return
        const req = new Request('https://cache.local/' + encodeURIComponent(key))
        const headers = new Headers({ 'Cache-Control': `public, max-age=${ttlSeconds}`, 'Content-Type': 'application/json' })
        const res = new Response(JSON.stringify(value), { headers, status: 200 })
        await gc.default.put(req, res)
      } catch {
        // ignore
      }
    },
  }
}


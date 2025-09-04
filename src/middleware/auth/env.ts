import type { Context } from 'hono'
import type { KeyValueCache } from './cache/types'
import { createWorkersCacheAdapter } from './cache/workersCache'
import { createKvCacheAdapter } from './cache/kvCache'

export type AuthRuntimeMode = 'production' | 'local' | 'test'

export function getAuthMode(c: Context): AuthRuntimeMode {
  const envVal = (c as any)?.env?.ENV
  if (typeof envVal === 'string') {
    const v = envVal.toLowerCase()
    if (v === 'production' || v === 'prod') return 'production'
    if (v === 'test') return 'test'
  }
  return 'local'
}

export function selectCacheAdapter(c: Context, mode: AuthRuntimeMode): KeyValueCache {
  if (mode === 'production') return createWorkersCacheAdapter()
  const kv = (c as any)?.env?.KV as KVNamespace | undefined
  if (kv) return createKvCacheAdapter(kv)
  const mem = new Map<string, string>()
  return {
    async get(key) {
      const v = mem.get(key)
      return v ? JSON.parse(v) : null
    },
    async set(key, value) {
      mem.set(key, JSON.stringify(value))
    },
  }
}


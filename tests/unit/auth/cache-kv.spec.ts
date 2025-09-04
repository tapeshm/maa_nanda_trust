import { describe, it, expect } from 'vitest'
import { createKvCacheAdapter } from '../../../src/middleware/auth/cache/kvCache'

function mockKV(): KVNamespace {
  const map = new Map<string, string>()
  return {
    async get(key: string) {
      return map.get(key) ?? null
    },
    async put(key: string, value: string, _opts?: any) {
      map.set(key, value)
    },
    async delete(key: string) {
      map.delete(key)
    },
    // @ts-ignore
    async list() { return { keys: [] } },
  } as unknown as KVNamespace
}

describe('KV cache adapter', () => {
  it('stores and retrieves JSON values', async () => {
    const kv = mockKV()
    const cache = createKvCacheAdapter(kv)
    const key = 'jwks:https://example.com/.well-known/jwks.json'
    const value = { hello: 'world' }
    await cache.set(key, value, 60)
    const got = await cache.get<typeof value>(key)
    expect(got).toEqual(value)
  })
})


import type { Bindings } from '../bindings'

/**
 * Retrieve a cached string value from the Workers KV namespace.  KV is ideal
 * for caching small responses or fragments of HTML to reduce latency.  It
 * provides eventual consistency with very fast reads【162888665588579†L111-L131】.
 *
 * @param env The Worker environment containing the KV binding
 * @param key The cache key
 * @returns The cached value or null if not found
 */
export async function getCached(env: Bindings, key: string): Promise<string | null> {
  return await env.KV.get(key)
}

/**
 * Store a value in the KV cache with an optional TTL.  The TTL controls how
 * long the key should live in the edge cache before expiring.  Large binary
 * objects should not be stored in KV – use R2 instead.
 *
 * @param env The Worker environment containing the KV binding
 * @param key The cache key
 * @param value The string value to store
 * @param ttlSeconds Time to live in seconds (defaults to 300 seconds)
 */
export async function setCached(
  env: Bindings,
  key: string,
  value: string,
  ttlSeconds: number = 300,
): Promise<void> {
  await env.KV.put(key, value, { expirationTtl: ttlSeconds })
}
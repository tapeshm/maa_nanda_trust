// [D3:auth.step-03:jwks-fetcher]
import type { Context } from 'hono'
import { readEnv } from '../utils/env'

export type Jwk = {
  kty: string
  kid: string
  use?: string
  alg?: string
  n?: string
  e?: string
  x?: string
  y?: string
  crv?: string
}

export type Jwks = { keys: Jwk[] }

type EnvLike = { [k: string]: unknown }

export function getIssuer(envOrCtx: Context | EnvLike): string {
  const env = readEnv(envOrCtx)
  const configured = env.AUTH_JWT_ISS as string | undefined
  if (configured && configured.length > 0) return configured
  const supabaseUrl = env.SUPABASE_URL as string | undefined
  if (!supabaseUrl) throw new Error('SUPABASE_URL missing to infer issuer')
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1`
}

export function getJwksUrl(envOrCtx: Context | EnvLike): string {
  const env = readEnv(envOrCtx)
  const explicit = env.JWKS_URL as string | undefined
  if (explicit && explicit.length > 0) return explicit
  const supabaseUrl = env.SUPABASE_URL as string | undefined
  if (!supabaseUrl) throw new Error('SUPABASE_URL missing to build JWKS URL')
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`
}

// Fetch JWKS with edge cache (TTL <= 9 minutes). If force=true, bypass cache.
export async function fetchJwks(
  envOrCtx: Context | EnvLike,
  opts?: { force?: boolean; ttlSeconds?: number },
): Promise<Jwks> {
  const env = readEnv(envOrCtx)
  const url = getJwksUrl(env)
  const ttl = Math.min(Math.max(opts?.ttlSeconds ?? 540, 60), 540) // clamp 60..540s

  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(url, { method: 'GET' })

  if (!opts?.force) {
    const hit = await cache.match(cacheKey)
    if (hit) {
      const data = (await hit.clone().json()) as Jwks
      return data
    }
  } else {
    try {
      await cache.delete(cacheKey)
    } catch {
      // ignore cache delete errors; we will overwrite below
    }
  }

  // Request with revalidation-friendly headers; origin may respond 304 with ETag
  const req = new Request(url, {
    method: 'GET',
    headers: { 'Cache-Control': 'max-age=0' }, // encourage conditional revalidation
  })

  const cfInit: Record<string, unknown> = { cacheEverything: true, cacheTtl: ttl }
  if (opts?.force) {
    cfInit.cacheBypass = true
  }

  const res = await fetch(req, { cf: cfInit } as RequestInit)

  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`)
  }

  // Store in edge cache for subsequent requests (clone for safe reuse)
  await cache.put(cacheKey, res.clone())

  const jwks = (await res.json()) as Jwks
  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error('Invalid JWKS payload')
  }
  return jwks
}

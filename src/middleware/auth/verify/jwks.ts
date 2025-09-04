import { createLocalJWKSet, jwtVerify } from 'jose'
import type { JSONWebKeySet, JWTPayload } from 'jose'
import type { KeyValueCache } from '../cache/types'
import type { VerifyResult, TokenVerifier } from './types'

async function fetchJwks(jwksUrl: string): Promise<JSONWebKeySet> {
  const res = await fetch(jwksUrl, { method: 'GET' })
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`)
  return (await res.json()) as JSONWebKeySet
}

export function createJwksVerifier(opts: {
  jwksUrl: string
  cache: KeyValueCache
  cacheTtlSeconds?: number
  expectedIssuer: string
  expectedAudience?: 'authenticated'
}): TokenVerifier {
  const { jwksUrl, cache, cacheTtlSeconds = 600, expectedIssuer, expectedAudience } = opts
  let jwksSetPromise: Promise<ReturnType<typeof createLocalJWKSet>> | null = null

  async function getJwksSet() {
    if (jwksSetPromise) return jwksSetPromise
    jwksSetPromise = (async () => {
      const cacheKey = 'jwks:' + jwksUrl
      const cached = await cache.get<JSONWebKeySet>(cacheKey)
      const jwks = cached || (await fetchJwks(jwksUrl))
      if (!cached) await cache.set(cacheKey, jwks, cacheTtlSeconds)
      return createLocalJWKSet(jwks)
    })()
    return jwksSetPromise
  }

  return {
    async verify(jwt: string): Promise<VerifyResult> {
      const set = await getJwksSet()
      const { payload } = await jwtVerify(jwt, set, { issuer: expectedIssuer, audience: expectedAudience as any })
      return { payload: payload as JWTPayload }
    },
  }
}


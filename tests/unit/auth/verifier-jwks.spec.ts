import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'
import { createJwksVerifier } from '../../../src/middleware/auth/verify/jwks'

describe('JWKS verifier', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // noop
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('fetches JWKS, caches, and verifies RS256 token', async () => {
    const iss = 'https://abc123.supabase.co/auth/v1'
    const aud = 'authenticated'
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const publicJwk = await exportJWK(publicKey)
    publicJwk.alg = 'RS256'
    publicJwk.kid = 'unit-key'

    const token = await new SignJWT({ email: 'jwks@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'unit-key' })
      .setIssuer(iss)
      .setAudience(aud)
      .setSubject('user-jwks')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)

    const jwksUrl = 'https://abc123.supabase.co/auth/v1/.well-known/jwks.json'
    const cache = {
      calls: { get: 0, set: 0 },
      async get(key: string) {
        this.calls.get++
        return null
      },
      async set(key: string, value: unknown) {
        this.calls.set++
      },
    } as any

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url === jwksUrl) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('not found', { status: 404 })
    }) as any

    const verifier = createJwksVerifier({ jwksUrl, cache, expectedIssuer: iss, expectedAudience: 'authenticated' })
    const { payload } = await verifier.verify(token)
    expect(payload.sub).toBe('user-jwks')
    expect(cache.calls.set).toBe(1)
  })
})


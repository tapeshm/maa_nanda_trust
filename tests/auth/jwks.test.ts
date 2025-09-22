import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchJwks, getIssuer } from '../../src/auth/jwks'
import { verifyAccessJwt } from '../../src/auth/verify'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'

// Simple in-memory cache stub
class MemoryCache {
  store = new Map<string, Response>()
  async match(req: Request) {
    return this.store.get((req as any).url)
  }
  async put(req: Request, res: Response) {
    this.store.set((req as any).url, res)
  }
  async delete(req: Request) {
    this.store.delete((req as any).url)
  }
}

const baseEnv = { SUPABASE_URL: 'https://example.supabase.co' }

describe('JWKS fetcher and verify', () => {
  beforeEach(() => {
    // @ts-expect-error assign caches for tests
    globalThis.caches = { default: new MemoryCache() }
    vi.restoreAllMocks()
  })

  it('caches JWKS and honors TTL (single network call)', async () => {
    const jwk = await (async () => {
      const { publicKey } = await generateKeyPair('RS256')
      return await exportJWK(publicKey)
    })()
    ;(jwk as any).kid = 'K1'

    const payload = { keys: [jwk] }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    const jwks1 = await fetchJwks(baseEnv)
    const jwks2 = await fetchJwks(baseEnv)
    expect(jwks1.keys[0].kid).toBe('K1')
    expect(jwks2.keys[0].kid).toBe('K1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caps JWKS cache TTL to ≤ 9 minutes', async () => {
    const jwk = await (async () => {
      const { publicKey } = await generateKeyPair('RS256')
      return await exportJWK(publicKey)
    })()
    ;(jwk as any).kid = 'KTTL'

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockImplementation(async (_req: Request, init?: any) => {
        // Ensure cacheTtl is clamped to 540 seconds
        expect(init?.cf?.cacheTtl).toBeLessThanOrEqual(540)
        return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
      })

    await fetchJwks(baseEnv, { ttlSeconds: 3600 })
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('forces single re-fetch on kid mismatch then retries verify', async () => {
    // Generate two different keypairs with distinct kids
    const kpA = await generateKeyPair('RS256')
    const kpB = await generateKeyPair('RS256')
    const jwkA: any = await exportJWK(kpA.publicKey)
    jwkA.kid = 'A'
    const jwkB: any = await exportJWK(kpB.publicKey)
    jwkB.kid = 'B'

    // Sign token with private key B but first JWKS response only has A
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({ foo: 'bar' })
      .setProtectedHeader({ alg: 'RS256', kid: 'B' })
      .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(kpB.privateKey)

    let call = 0
    vi.spyOn(globalThis, 'fetch' as any).mockImplementation(async () => {
      call++
      const body = call === 1 ? { keys: [jwkA] } : { keys: [jwkB] }
      return new Response(JSON.stringify(body), { status: 200 })
    })

    const claims = await verifyAccessJwt(token, baseEnv)
    expect(claims.iss).toBe(`${baseEnv.SUPABASE_URL}/auth/v1`)
    // Expect two fetches: first cache miss, then forced refetch after mismatch
    expect(call).toBe(2)
  })

  it('rejects non-RS256 tokens', async () => {
    const now = Math.floor(Date.now() / 1000)
    // HS256 token
    const key = crypto.getRandomValues(new Uint8Array(32))
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      // @ts-expect-error jose accepts CryptoKey or KeyLike; Uint8Array is fine here for tests
      .sign(key)

    // Any JWKS; it shouldn't be used because alg mismatches
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ keys: [] }), { status: 200 }),
    )

    await expect(verifyAccessJwt(token, baseEnv)).rejects.toBeTruthy()
  })

  it('enforces issuer and allows ±60s skew', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const jwk: any = await exportJWK(publicKey)
    jwk.kid = 'ISS'

    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    )

    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'ISS' })
      .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now - 30) // within skew
      .setExpirationTime(now - 10) // within skew grace window
      .sign(privateKey)

    const claims = await verifyAccessJwt(token, baseEnv)
    expect(claims.iss).toBe(`${baseEnv.SUPABASE_URL}/auth/v1`)

    // Wrong issuer should fail
    const badToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'ISS' })
      .setIssuer('https://attacker.example.com/auth/v1')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey)

    await expect(verifyAccessJwt(badToken, baseEnv)).rejects.toBeTruthy()
  })

  it('defaults issuer to SUPABASE_URL/auth/v1 when AUTH_JWT_ISS unset', async () => {
    const env = { ...baseEnv }
    expect(getIssuer(env)).toBe(`${env.SUPABASE_URL}/auth/v1`)
  })

  it('enforces audience when AUTH_JWT_AUD is set; allows when unset', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const jwk: any = await exportJWK(publicKey)
    jwk.kid = 'AUD'
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    )

    const now = Math.floor(Date.now() / 1000)
    const mk = async (aud?: string) =>
      new SignJWT({})
        .setProtectedHeader({ alg: 'RS256', kid: 'AUD' })
        .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
        .setAudience(aud ?? 'open')
        .setIssuedAt(now)
        .setExpirationTime(now + 60)
        .sign(privateKey)

    const tokenOk = await mk('my-aud')
    const envWithAud = { ...baseEnv, AUTH_JWT_AUD: 'my-aud' }
    await expect(verifyAccessJwt(tokenOk, envWithAud)).resolves.toBeTruthy()

    const tokenBad = await mk('other-aud')
    await expect(verifyAccessJwt(tokenBad, envWithAud)).rejects.toBeTruthy()

    // When AUD unset in env, token with arbitrary aud passes
    await expect(verifyAccessJwt(tokenBad, baseEnv)).resolves.toBeTruthy()
  })
})

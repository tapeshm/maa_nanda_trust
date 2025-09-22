import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth } from '../../src/middleware/auth'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { getSetCookies } from '../utils/http'

const baseEnv = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' }

function appProtected() {
  const app = new Hono()
  app.use('/admin/*', requireAuth())
  app.get('/admin/data', (c) => c.json({ ok: true }))
  return app
}


async function mkExpiredToken(env = baseEnv) {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk: any = await exportJWK(publicKey)
  jwk.kid = 'R1'
  // First fetch for JWKS (verify) → respond with jwk
  let calls: any[] = []
  vi.spyOn(globalThis, 'fetch' as any).mockImplementation(async (url: RequestInfo | URL) => {
    calls.push(String((url as any)?.url ?? url))
    if (String(url).includes('/.well-known/jwks.json') || String(url).includes('jwks.json')) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    }
    // Default: not used in this helper
    return new Response('{}', { status: 200 })
  })
  const now = Math.floor(Date.now() / 1000)
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'R1' })
    .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
    .setIssuedAt(now - 120)
    .setExpirationTime(now - 30)
    .sign(privateKey)
  return { expired, jwk, privateKey, calls }
}

describe('refresh pipeline', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('success rotates tokens and proceeds', async () => {
    const app = appProtected()
    const { expired, jwk, privateKey } = await mkExpiredToken()
    // Next fetch call: refresh endpoint returning a valid RS256 token
    const now = Math.floor(Date.now() / 1000)
    const fresh = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(privateKey)

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async (url: any) => {
      // 1st call comes from previous mkExpiredToken; provide JWKS
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    })
    // 2nd call: refresh
    fetchSpy.mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ access_token: fresh, refresh_token: 'new-ref' }), { status: 200 })
    })
    // 3rd call: verify new token → JWKS
    fetchSpy.mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    })

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(200)
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).toContain('__Host-access_token=')
    expect(joined).toContain('__Host-refresh_token=new-ref')
  })

  it('refreshes when access cookie is missing but refresh exists', async () => {
    const app = appProtected()
    const { publicKey, privateKey } = await generateKeyPair('RS256')
    const jwk: any = await exportJWK(publicKey)
    jwk.kid = 'R2'

    const now = Math.floor(Date.now() / 1000)
    const fresh = await new SignJWT({ sub: 'u-missing-access' })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer(`${baseEnv.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(privateKey)

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async (url: any) => {
      expect(String(url)).toContain('grant_type=refresh_token')
      return new Response(JSON.stringify({ access_token: fresh, refresh_token: 'new-refresh' }), { status: 200 })
    })
    fetchSpy.mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    })

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: '__Host-refresh_token=stale-refresh' },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(200)
    const cookies = getSetCookies(res)
    const merged = cookies.join('\n')
    expect(merged).toContain('__Host-access_token=')
    expect(merged).toContain('__Host-refresh_token=new-refresh')
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('already-used ⇒ unauth without clearing', async () => {
    const app = appProtected()
    const { expired, jwk } = await mkExpiredToken()

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    fetchSpy.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token already used' }),
        { status: 400 },
      ),
    )

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect([401, 302]).toContain(res.status)
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).not.toContain('Max-Age=0')
  })

  it('invalid family ⇒ clears cookies and unauth', async () => {
    const app = appProtected()
    const { expired, jwk } = await mkExpiredToken()

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    fetchSpy.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'invalid or revoked refresh token' }),
        { status: 400 },
      ),
    )

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect([401, 302]).toContain(res.status)
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).toContain('__Host-access_token=')
    expect(joined).toContain('__Host-refresh_token=')
    expect(joined).toContain('Max-Age=0')
  })

  it('5xx ⇒ 503 without cookie changes', async () => {
    const app = appProtected()
    const { expired, jwk } = await mkExpiredToken()

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    fetchSpy.mockImplementationOnce(async () => new Response('oops', { status: 503 }))

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(503)
    const cookies = getSetCookies(res)
    expect(cookies.length).toBe(0)
  })

  it('per-request single attempt enforced', async () => {
    const app = appProtected()
    const { expired, jwk } = await mkExpiredToken()

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    // 1) JWKS for initial verify
    fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    // 2) Refresh responds with 503 (retryable)
    fetchSpy.mockImplementationOnce(async () => new Response('oops', { status: 503 }))
    // 3) If a second refresh were attempted, it would call again — we ensure it is NOT called

    const req = new Request('http://x/admin/data', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(503)
    // Only 2 calls: 1 JWKS + 1 refresh
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('HTMX 5xx ⇒ 503 JSON without cookie changes', async () => {
    const app = appProtected()
    const { expired, jwk } = await mkExpiredToken()

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    fetchSpy.mockImplementationOnce(async () => new Response('oops', { status: 503 }))

    const req = new Request('http://x/admin/data', {
      headers: {
        Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old-ref`,
        'HX-Request': 'true',
      },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(503)
    expect(res.headers.get('Content-Type') || '').toContain('application/json')
    const cookies = getSetCookies(res)
    expect(cookies.length).toBe(0)
  })
})

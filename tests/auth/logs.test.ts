import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth } from '../../src/middleware/auth'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' }

function app() {
  const app = new Hono()
  app.use('/admin/*', requireAuth())
  app.get('/admin/ping', (c) => c.text('ok'))
  return app
}

async function setupJwks() {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk: any = await exportJWK(publicKey)
  jwk.kid = 'L1'
  vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
    new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
  )
  return { privateKey, jwk }
}

function collect(spy: ReturnType<typeof vi.spyOn>): string[] {
  const calls = spy.mock.calls
  return calls.map((args: any[]) => args.map(String).join(' '))
}

describe('auth logs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('emits structured events without secrets', async () => {
    const { privateKey } = await setupJwks()
    const now = Math.floor(Date.now() / 1000)
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'L1' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(privateKey)

    const a = app()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const req = new Request('http://x/admin/ping', { headers: { Cookie: `__Host-access_token=${t}` } })
    const res = await a.fetch(req, env as any)
    expect(res.status).toBe(200)
    const out = collect(spy).join('\n')
    expect(out).toContain('auth.verify_ok')
    expect(out).toMatch(/rid/)
    // No token contents should appear
    expect(out).not.toContain(t)
  })

  it('categorizes refresh outcomes correctly', async () => {
    const { privateKey, jwk } = await setupJwks()
    const a = app()
    const now = Math.floor(Date.now() / 1000)
    // Build an expired token to force refresh path
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'L1' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 30)
      .sign(privateKey)

    // Case 1: refresh_ok
    let spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    )
    // Return a valid new RS256 token so verify succeeds
    const freshNow = Math.floor(Date.now() / 1000)
    const fresh = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'RS256', kid: 'L1' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(freshNow)
      .setExpirationTime(freshNow + 300)
      .sign(privateKey)
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ access_token: fresh, refresh_token: 'newR' }), { status: 200 }),
    )
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    )
    const reqOk = new Request('http://x/admin/ping', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old` },
    })
    await a.fetch(reqOk, env as any)
    let out = collect(spy).join('\n')
    expect(out).toContain('auth.refresh_ok')

    // Case 2: already used
    spy.mockRestore()
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    )
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Refresh token already used' }),
        { status: 400 },
      ),
    )
    const reqUsed = new Request('http://x/admin/ping', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old` },
    })
    await a.fetch(reqUsed, env as any)
    out = collect(spy).join('\n')
    expect(out).toContain('auth.refresh_used')

    // Case 3: 5xx
    spy.mockRestore()
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ keys: [{ kid: 'L1', kty: 'RSA' }] }), { status: 200 }),
    )
    vi.spyOn(globalThis, 'fetch' as any).mockImplementationOnce(async () =>
      new Response('oops', { status: 503 }),
    )
    const req5xx = new Request('http://x/admin/ping', {
      headers: { Cookie: `__Host-access_token=${expired}; __Host-refresh_token=old` },
    })
    await a.fetch(req5xx, env as any)
    out = collect(spy).join('\n')
    expect(out).toContain('auth.refresh_5xx')
  })
})

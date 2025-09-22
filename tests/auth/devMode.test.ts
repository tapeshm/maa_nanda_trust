import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignJWT } from 'jose'
import { verifyAccessJwt } from '../../src/auth/verify'
import { setAccessCookie } from '../../src/auth/cookies'
import { Hono } from 'hono'

describe('dev HS256 mode', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('HS256 verify path works with SUPABASE_JWT_SECRET', async () => {
    const env = {
      DEV_SUPABASE_LOCAL: '1',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_JWT_SECRET: 'supersecret123supersecret123superse',
    }
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))
    await expect(verifyAccessJwt(token, env as any)).resolves.toBeTruthy()
  })

  it('JWKS path used when DEV_SUPABASE_LOCAL=0', async () => {
    const env = { DEV_SUPABASE_LOCAL: '0', SUPABASE_URL: 'https://example.supabase.co' }
    const now = Math.floor(Date.now() / 1000)
    // RS256 flow: JWKS fetch should be called
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ keys: [] }), { status: 200 }),
    )
    // Sign with a real RS256 key so jose accepts the token; verify will still fail due to empty JWKS
    const { privateKey } = await (await import('jose')).generateKeyPair('RS256')
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'X' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(privateKey)
    await expect(verifyAccessJwt(token, env as any)).rejects.toBeTruthy()
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('cookies Secure=true in both dev and prod', async () => {
    const app = new Hono()
    app.get('/set', (c) => {
      setAccessCookie(c, 'tok')
      return c.text('ok')
    })
    const r = await app.request('http://x/set')
    const cookie = r.headers.get('set-cookie') || ''
    expect(cookie).toContain('Secure')
  })

  it('JWKS fetch not called in dev mode', async () => {
    const env = {
      DEV_SUPABASE_LOCAL: '1',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_JWT_SECRET: 'supersecret123supersecret123superse',
    }
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
    await expect(verifyAccessJwt(token, env as any)).resolves.toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('dev HS256 refused when SUPABASE_URL is non-local (fails closed)', async () => {
    const env = {
      DEV_SUPABASE_LOCAL: '1',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_JWT_SECRET: 'supersecret123supersecret123superse',
    }
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))
    await expect(verifyAccessJwt(token, env as any)).rejects.toBeTruthy()
  })

  it('no tokens or secrets logged in dev mode', async () => {
    const env = {
      DEV_SUPABASE_LOCAL: '1',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_JWT_SECRET: 'supersecret123supersecret123superse',
    }
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))

    const { requireAuth } = await import('../../src/middleware/auth')
    const app = new (await import('hono')).Hono()
    app.use('/admin/*', requireAuth())
    app.get('/admin/ping', (c: any) => c.text('ok'))

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const req = new Request('http://x/admin/ping', {
      headers: { Cookie: `__Host-access_token=${token}` },
    })
    const res = await app.fetch(req, env as any)
    expect(res.status).toBe(200)
    const out = spy.mock.calls.map((args) => (args as any[]).map(String).join(' ')).join('\n')
    expect(out).toContain('auth.verify_ok')
    expect(out).not.toContain(token)
    expect(out).not.toContain(env.SUPABASE_JWT_SECRET)
  })
})

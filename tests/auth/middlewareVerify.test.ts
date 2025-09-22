import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { attachAuthContext, requireAuth } from '../../src/middleware/auth'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'

const baseEnv = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' }

function appWithProtected() {
  const app = new Hono()
  app.use('/admin/*', requireAuth())
  app.get('/admin/secret', (c) => {
    const auth = c.get('auth') as any
    const near = !!auth?.nearExpiry || !!c.get('authNearExpiry')
    const claims = auth?.claims as any
    return c.json({ ok: true, near, sub: claims?.sub })
  })
  return app
}

async function makeToken(env = baseEnv, expOffset = 300) {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const jwk: any = await exportJWK(publicKey)
  jwk.kid = 'T1'
  vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
    new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
  )
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'T1' })
    .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
    .setIssuedAt(now)
    .setExpirationTime(now + expOffset)
    .sign(privateKey)
  return token
}

describe('auth middleware', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('unauth GET → 302 /login', async () => {
    const app = appWithProtected()
    const res = await app.fetch(new Request('http://x/admin/secret', { method: 'GET' }), baseEnv as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/login')
  })

  it('unauth HTMX → 401 + HX-Redirect', async () => {
    const app = appWithProtected()
    const req = new Request('http://x/admin/secret', { method: 'GET', headers: { 'HX-Request': 'true' } })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(401)
    expect(res.headers.get('HX-Redirect')).toBe('/login')
  })

  it('valid token attaches claims', async () => {
    const token = await makeToken()
    const app = appWithProtected()
    const req = new Request('http://x/admin/secret')
    const res = await app.request(req, { ...baseEnv, COOKIE: `__Host-access_token=${token}` } as any)
    // Fallback path since app.request may not set Cookie env; use setCookie helper
    const r2 = await app.fetch(new Request('http://x/admin/secret'), {
      ...baseEnv,
      // Hono's test env reads cookies from setCookie in middleware; simulate by setting Cookie header
    } as any)
    // Better: craft a request with Cookie header directly
    const withCookie = new Request('http://x/admin/secret', {
      headers: { Cookie: `__Host-access_token=${token}` },
    })
    const res3 = await app.fetch(withCookie, baseEnv as any)
    expect(res3.status).toBe(200)
    const json = await res3.json()
    expect(json.ok).toBe(true)
  })

  it('near-expiry path triggers marker', async () => {
    const token = await makeToken(baseEnv, 30) // within 60s
    const app = appWithProtected()
    const req = new Request('http://x/admin/secret', {
      headers: { Cookie: `__Host-access_token=${token}` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.near).toBe(true)
  })

  it('rejects Authorization header or query tokens; only cookies accepted', async () => {
    const token = await makeToken()
    const app = appWithProtected()
    // Authorization header with no cookies should be ignored → unauth redirect for GET
    const req = new Request('http://x/admin/secret', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await app.fetch(req, baseEnv as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/login')

    // Query param with no cookies should also be ignored
    const req2 = new Request(`http://x/admin/secret?access_token=${encodeURIComponent(token)}`)
    const res2 = await app.fetch(req2, baseEnv as any)
    expect(res2.status).toBe(302)
    expect(res2.headers.get('Location')).toBe('/login')
  })
})

describe('attachAuthContext', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('sets unauth context when no access cookie is present', async () => {
    const app = new Hono()
    app.use('*', attachAuthContext())
    app.get('/me', (c) => c.json({ auth: c.get('auth') }))

    const res = await app.fetch(new Request('http://x/me'), baseEnv as any)
    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload.auth.token).toBeNull()
    expect(payload.auth.claims).toBeNull()
    expect(payload.auth.userId).toBeNull()
    expect(Object.prototype.hasOwnProperty.call(payload.auth, 'getClient')).toBe(false)
  })

  it('preserves existing auth context (e.g., from requireAuth)', async () => {
    const app = new Hono()
    const upstream = {
      token: 'mock-token',
      claims: { sub: 'existing' },
      userId: 'existing',
      getClient: () => {
        throw new Error('not configured')
      },
    }
    const attach = attachAuthContext()
    app.use('*', (c, next) => {
      c.set('auth', upstream)
      return attach(c, next)
    })
    app.get('/me', (c) => {
      const same = c.get('auth') === upstream
      return c.json({ same })
    })

    const res = await app.fetch(new Request('http://x/me'), baseEnv as any)
    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload.same).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { supabaseAuth } from '../../../src/middleware/auth'
import { SignJWT, generateKeyPair, exportJWK } from 'jose'

function ssrCookie(name: string, token: string) {
  const json = JSON.stringify({ access_token: token })
  const b64 = Buffer.from(json).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${name}=base64-${b64}`
}

describe('middleware verifier selection', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.doUnmock('@supabase/ssr')
  })

  it('uses JWKS in production even when hmac secret is provided (HS token rejected)', async () => {
    // Mock Supabase SSR client to avoid refresh side effects
    vi.mock('@supabase/ssr', () => ({
      createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }), getSession: async () => ({ data: { session: null }, error: null }) } }),
      parseCookieHeader: (raw: string) => raw.split(';').map((p) => { const [n,v] = p.trim().split('='); return { name: n, value: v } }),
      combineChunks: async (_: string, get: (n: string) => string | undefined) => get(_) ?? null,
    }))

    const iss = 'https://prod.example.com/auth/v1'
    const secret = 'local-hmac'
    const token = await new SignJWT({ email: 'hmac@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(iss).setAudience('authenticated').setSubject('hs-user').setIssuedAt().setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))

    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'https://prod.example.com', publishableKey: 'sb', hmacJwtSecret: secret, expected: { issuer: iss } }))
    app.get('/', (c) => { const a = c.get('auth'); return c.json({ userId: a.userId }) })

    // No JWKS provided; JWKS verifier should fail and no fallback in production
    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as any

    const req = new Request('http://localhost/', { headers: { Cookie: ssrCookie('sb-prod-auth-token', token) } })
    const env = { ENV: 'production' } as any
    const res = await app.fetch(req, env, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBeNull()
  })

  it('uses HMAC in local when secret provided (HS token accepted)', async () => {
    vi.mock('@supabase/ssr', () => ({
      createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }), getSession: async () => ({ data: { session: null }, error: null }) } }),
      parseCookieHeader: (raw: string) => raw.split(';').map((p) => { const [n,v] = p.trim().split('='); return { name: n, value: v } }),
      combineChunks: async (_: string, get: (n: string) => string | undefined) => get(_) ?? null,
    }))

    const iss = 'http://localhost:54321/auth/v1'
    const secret = 'local-hmac'
    const sub = 'hs-ok'
    const token = await new SignJWT({ email: 'ok@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(iss).setAudience('authenticated').setSubject(sub).setIssuedAt().setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))

    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'http://localhost:54321', publishableKey: 'sb', hmacJwtSecret: secret, expected: { issuer: iss } }))
    app.get('/', (c) => { const a = c.get('auth'); return c.json({ userId: a.userId }) })

    const req = new Request('http://localhost/', { headers: { Cookie: ssrCookie('sb-localhost-auth-token', token) } })
    const env = { ENV: 'local' } as any
    const res = await app.fetch(req, env, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBe(sub)
  })

  it('uses JWKS in local when no secret (RS token accepted)', async () => {
    vi.mock('@supabase/ssr', () => ({
      createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }), getSession: async () => ({ data: { session: null }, error: null }) } }),
      parseCookieHeader: (raw: string) => raw.split(';').map((p) => { const [n,v] = p.trim().split('='); return { name: n, value: v } }),
      combineChunks: async (_: string, get: (n: string) => string | undefined) => get(_) ?? null,
    }))

    const iss = 'https://abc123.supabase.co/auth/v1'
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const jwk = await exportJWK(publicKey); (jwk as any).alg = 'RS256'; (jwk as any).kid = 'kid'
    const token = await new SignJWT({ email: 'jwks@local' }).setProtectedHeader({ alg: 'RS256', kid: 'kid' }).setIssuer(iss).setAudience('authenticated').setSubject('rs-ok').setIssuedAt().setExpirationTime('5m').sign(privateKey)

    const jwksUrl = 'https://abc123.supabase.co/auth/v1/.well-known/jwks.json'
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url === jwksUrl) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'content-type': 'application/json' } })
      return new Response('nf', { status: 404 })
    }) as any

    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'https://abc123.supabase.co', publishableKey: 'sb', expected: { issuer: iss } }))
    app.get('/', (c) => { const a = c.get('auth'); return c.json({ userId: a.userId }) })

    const req = new Request('http://localhost/', { headers: { Cookie: ssrCookie('sb-abc123-auth-token', token) } })
    const env = { ENV: 'local' } as any
    const res = await app.fetch(req, env, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBe('rs-ok')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT, generateKeyPair } from 'jose'

// Helper to build SSR cookie value
function ssrCookie(name: string, token: string) {
  const json = JSON.stringify({ access_token: token })
  const b64 = Buffer.from(json).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${name}=base64-${b64}`
}

// Mock @supabase/ssr client to supply a session on refresh
vi.mock('@supabase/ssr', async (orig) => {
  const mod = await orig()
  return {
    ...mod as object,
    createServerClient: () => ({
      auth: {
        async getUser() { return { data: { user: { id: 'u1' } }, error: null } },
        async getSession() { return { data: { session: { access_token: globalThis.__TEST_TOKEN__ } }, error: null } },
      },
    }),
  }
})

declare global { var __TEST_TOKEN__: string }

describe('auth middleware - mode-specific fallback', () => {
  const originalFetch = globalThis.fetch
  beforeEach(async () => { await vi.resetModules() /* per-test */ })
  afterEach(() => { globalThis.fetch = originalFetch })

  it('does not use payload fallback in production mode', async () => {
    // Create an RS256 token but do not provide JWKS
    const { privateKey } = await generateKeyPair('RS256')
    const iss = 'https://prod.example.com/auth/v1'
    const badToken = await new SignJWT({ email: 'prod@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'none' })
      .setIssuer(iss).setAudience('authenticated').setSubject('sub-1').setIssuedAt().setExpirationTime('5m')
      .sign(privateKey)

    globalThis.__TEST_TOKEN__ = badToken

    const { supabaseAuth } = await import('../../../src/middleware/auth')
    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'https://prod.example.com', publishableKey: 'sb', expected: { issuer: iss } }))
    app.get('/', (c) => { const a = c.get('auth'); return c.json({ userId: a.userId }) })

    const req = new Request('http://localhost/', { headers: { Cookie: ssrCookie('sb-prod-auth-token', 'invalid') } })
    const env = { ENV: 'production' } as any
    const res = await app.fetch(req, env, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBeNull()
  })

  it('uses payload fallback in local/test mode when verify fails after refresh', async () => {
    // Create an RS256 token but do not provide JWKS so verification fails
    const { privateKey } = await generateKeyPair('RS256')
    const iss = 'http://localhost:54321/auth/v1'
    const sub = 'local-user'
    const fallbackToken = await new SignJWT({ email: 'local@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'none' })
      .setIssuer(iss).setAudience('authenticated').setSubject(sub).setIssuedAt().setExpirationTime('5m')
      .sign(privateKey)

    globalThis.__TEST_TOKEN__ = fallbackToken

    const { supabaseAuth } = await import('../../../src/middleware/auth')
    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'http://localhost:54321', publishableKey: 'sb', expected: { issuer: iss } }))
    app.get('/', (c) => { const a = c.get('auth'); return c.json({ userId: a.userId }) })

    const req = new Request('http://localhost/', { headers: { Cookie: ssrCookie('sb-localhost-auth-token', 'invalid') } })
    const env = { ENV: 'local' } as any
    const res = await app.fetch(req, env, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBe(sub)
  })
})

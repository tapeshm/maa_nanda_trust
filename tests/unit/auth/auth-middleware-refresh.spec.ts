import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT, generateKeyPair } from 'jose'

// Mock @supabase/ssr first so the middleware picks up our stubs
vi.mock('@supabase/ssr', () => {
  return {
    createServerClient: () => ({
      auth: {
        async getUser() {
          return { data: { user: { id: 'refreshed-user' } }, error: null }
        },
        async getSession() {
          // The actual token is injected per-test via closure reassignment
          return { data: { session: globalThis.__TEST_SESSION__ }, error: null } as any
        },
      },
    }),
    parseCookieHeader: (_raw: string) => [],
    combineChunks: async () => null,
  }
})

// Note: We will import the middleware dynamically inside the test
// after resetting the module cache to ensure our mock is applied.

declare global {
  var __TEST_SESSION__: { access_token: string } | null
}

describe('auth middleware - refresh path success', () => {
  const originalFetch = globalThis.fetch
  let privateKey: CryptoKey

  beforeEach(async () => {
    await vi.resetModules()
    const pair = await generateKeyPair('RS256')
    privateKey = pair.privateKey
    globalThis.__TEST_SESSION__ = null

    // Force JWKS verify to fail so the middleware takes the refresh path
    // and, in local mode, uses payload fallback from the refreshed token.
    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('falls back to Supabase session and sets auth when local verify fails', async () => {
    const { supabaseAuth } = await import('../../../src/middleware/auth')
    const iss = 'https://abc123.supabase.co/auth/v1'

    // Create a valid session token that will be provided by mocked Supabase client
    const sessionToken = await new SignJWT({ email: 'refresh@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'refresh-key' })
      .setIssuer(iss)
      .setAudience('authenticated')
      .setSubject('refreshed-user')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)

    globalThis.__TEST_SESSION__ = { access_token: sessionToken }

    const app = new Hono()
    app.use(
      '*',
      supabaseAuth({
        projectUrl: 'https://abc123.supabase.co',
        publishableKey: 'sb_publishable_dummy',
      }),
    )

    app.get('/', (c) => {
      const auth = c.get('auth')
      return c.json({ token: auth.token, userId: auth.userId, email: auth.claims?.email })
    })

    const req = new Request('http://localhost/')
    const res = await app.fetch(req, { ENV: 'local' } as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userId).toBe('refreshed-user')
    expect(data.email).toBe('refresh@example.com')
    expect(data.token).toBe(sessionToken)
  })
})

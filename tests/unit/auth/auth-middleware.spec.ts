import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @supabase/ssr to avoid network calls in refresh path
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  }),
  // Minimal stubs used by cookie parsing, not exercised in this test
  parseCookieHeader: (_raw: string) => [],
  combineChunks: async () => null,
}))

import { Hono } from 'hono'
import { supabaseAuth } from '../../../src/middleware/auth'

describe('auth middleware (no token present)', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // Mock JWKS fetch
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/.well-known/jwks.json')) {
        return new Response(JSON.stringify({ keys: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('not found', { status: 404 })
    }) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sets auth defaults when no token or session', async () => {
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
      return c.json({ token: auth.token, userId: auth.userId, hasClaims: !!auth.claims })
    })

    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ token: null, userId: null, hasClaims: false })
  })
})

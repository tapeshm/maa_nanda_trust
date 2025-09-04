import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

describe('middleware cookie options by mode', () => {
  const originalFetch = globalThis.fetch
  beforeEach(async () => { await vi.resetModules() })
  afterEach(() => { globalThis.fetch = originalFetch; vi.doUnmock('@supabase/ssr') })

  function mockSSRThatSetsCookie(spy: { lastCookieOptions?: any }) {
    vi.doMock('@supabase/ssr', () => {
      return {
        createServerClient: (_url: string, _key: string, opts: any) => {
          spy.lastCookieOptions = opts.cookieOptions
          const cookies = opts.cookies as { setAll: (items: any[]) => void }
          return {
            auth: {
              async getUser() {
                // Simulate SSR setting a cookie during auth flow
                cookies.setAll([{ name: 'test_cookie', value: '1' }])
                return { data: { user: null }, error: null }
              },
              async getSession() {
                return { data: { session: null }, error: null }
              },
            },
          }
        },
        parseCookieHeader: (raw: string) => raw.split(';').map((p) => { const [n,v] = p.trim().split('='); return { name: n, value: v } }),
        combineChunks: async (_: string, get: (n: string) => string | undefined) => get(_) ?? null,
      }
    })
  }

  it('adds Secure + HttpOnly in production', async () => {
    const spy: any = {}
    mockSSRThatSetsCookie(spy)
    const { supabaseAuth } = await import('../../../src/middleware/auth')
    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'https://prod.example.com', publishableKey: 'sb' }))
    app.get('/', (c) => c.text('ok'))

    const res = await app.fetch(new Request('http://localhost/'), { ENV: 'production', DEBUG_AUTH: '1' } as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    // Assert cookieOptions passed to Supabase SSR reflect production flags
    expect(spy.lastCookieOptions?.httpOnly).toBe(true)
    expect(spy.lastCookieOptions?.secure).toBe(true)
    expect(spy.lastCookieOptions?.sameSite).toBe('lax')
    expect(spy.lastCookieOptions?.path).toBe('/')
  })

  it('omits Secure + HttpOnly in local', async () => {
    const spy: any = {}
    mockSSRThatSetsCookie(spy)
    const { supabaseAuth } = await import('../../../src/middleware/auth')
    const app = new Hono()
    app.use('*', supabaseAuth({ projectUrl: 'http://localhost:54321', publishableKey: 'sb' }))
    app.get('/', (c) => c.text('ok'))

    const res = await app.fetch(new Request('http://localhost/'), { ENV: 'local', DEBUG_AUTH: '1' } as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
    expect(spy.lastCookieOptions?.httpOnly).toBe(false)
    expect(spy.lastCookieOptions?.secure).toBe(false)
    expect(spy.lastCookieOptions?.sameSite).toBe('lax')
    expect(spy.lastCookieOptions?.path).toBe('/')
  })
})

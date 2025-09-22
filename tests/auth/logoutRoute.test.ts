import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import logoutRoutes from '../../src/routes/logout'
import { getSetCookies } from '../utils/http'
import { CSRF_COOKIE_NAME } from '../../src/middleware/csrf'


const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' }
const csrfToken = 'csrf-token-test'
const csrfCookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

describe('/logout', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('clears cookies even if Supabase call fails', async () => {
    const app = new Hono()
    app.route('/', logoutRoutes)
    vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('network'))

    const req = new Request('http://x/logout', {
      method: 'POST',
      headers: {
        Cookie: `${csrfCookie}; __Host-access_token=acc; __Host-refresh_token=ref`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ csrf_token: csrfToken }) as any,
    })
    const res = await app.fetch(req, env as any)
    expect([200, 302]).toContain(res.status)
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).toContain('__Host-access_token=')
    expect(joined).toContain('__Host-refresh_token=')
    expect(joined).toContain('Max-Age=0')
  })

  it('returns 302 for non-HTMX, 200 for HTMX', async () => {
    const app = new Hono()
    app.route('/', logoutRoutes)
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response(null, { status: 204 }))

    const res1 = await app.fetch(
      new Request('http://x/logout', {
        method: 'POST',
        headers: {
          Cookie: `${csrfCookie}; __Host-access_token=acc; __Host-refresh_token=ref`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ csrf_token: csrfToken }) as any,
      }),
      env as any,
    )
    expect(res1.status).toBe(302)
    expect(res1.headers.get('Location')).toBe('/')

    const req2 = new Request('http://x/logout', {
      method: 'POST',
      headers: {
        'HX-Request': 'true',
        Cookie: `${csrfCookie}; __Host-access_token=acc; __Host-refresh_token=ref`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ csrf_token: csrfToken }) as any,
    })
    const res2 = await app.fetch(req2, env as any)
    expect(res2.status).toBe(200)
    const json = await res2.json()
    expect(json.ok).toBe(true)
  })

  it('disallows GET logout calls', async () => {
    const app = new Hono()
    app.route('/', logoutRoutes)
    const res = await app.fetch(new Request('http://x/logout'), env as any)
    expect(res.status).toBe(405)
  })

  it('invokes Supabase sign-out endpoint (best-effort)', async () => {
    const app = new Hono()
    app.route('/', logoutRoutes)
    const spy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response(null, { status: 204 }))
    const req = new Request('http://x/logout', {
      method: 'POST',
      headers: {
        Cookie: `${csrfCookie}; __Host-access_token=acc; __Host-refresh_token=ref`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ csrf_token: csrfToken }) as any,
    })
    const res = await app.fetch(req, env as any)
    expect([200, 302]).toContain(res.status)
    const call = spy.mock.calls.at(0)
    expect(call?.[0]).toContain('/auth/v1/logout')
    expect(call?.[1]?.method || call?.[1]?.toString?.()).toContain('POST')
  })
})

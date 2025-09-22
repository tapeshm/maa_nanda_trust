import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import loginRoutes from '../../src/routes/login'
import { csrfProtect, CSRF_COOKIE_NAME } from '../../src/middleware/csrf'
import { getSetCookies } from '../utils/http'

// use shared helper

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' }

async function fetchCsrf(app: Hono, envOverride: any = env) {
  const res = await app.fetch(new Request('http://x/login'), envOverride)
  const cookies = getSetCookies(res)
  const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
  if (!csrfCookie) throw new Error('CSRF cookie missing')
  const value = csrfCookie.split(';')[0]
  const token = value.split('=')[1]
  return { cookie: value, token }
}

describe('CSRF middleware', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('issues token on login', async () => {
    const app = new Hono()
    app.route('/', loginRoutes)
    const csrf = await fetchCsrf(app)
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login', {
        method: 'POST',
        body: body as any,
        headers: { Cookie: csrf.cookie },
      }),
      env as any,
    )
    const cookies = getSetCookies(res)
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
    expect(csrfCookie).toBeTruthy()
    expect(csrfCookie).not.toContain('HttpOnly')
    expect(csrfCookie).toContain('Secure')
    expect(csrfCookie).toContain('SameSite=Lax')
  })

  it('validates token on POST and rejects missing/invalid', async () => {
    const app = new Hono()
    app.use('*', csrfProtect())
    app.post('/admin/action', (c) => c.json({ ok: true }))

    // Missing token
    const r1 = await app.request('http://x/admin/action', { method: 'POST' })
    expect(r1.status).toBe(403)

    // With cookie but wrong header
    const r2 = await app.fetch(
      new Request('http://x/admin/action', { method: 'POST', headers: { Cookie: `${CSRF_COOKIE_NAME}=abc` } }),
    )
    expect(r2.status).toBe(403)

    // With matching cookie+header
    const r3 = await app.fetch(
      new Request('http://x/admin/action', {
        method: 'POST',
        headers: { Cookie: `${CSRF_COOKIE_NAME}=abc`, 'X-CSRF-Token': 'abc' },
      }),
    )
    expect(r3.status).toBe(200)
    const json = await r3.json()
    expect(json.ok).toBe(true)

    // Form field fallback works
    const form = await app.fetch(
      new Request('http://x/admin/action', {
        method: 'POST',
        headers: {
          Cookie: `${CSRF_COOKIE_NAME}=xyz`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ csrf_token: 'xyz' }) as any,
      }),
    )
    expect(form.status).toBe(200)
  })
})

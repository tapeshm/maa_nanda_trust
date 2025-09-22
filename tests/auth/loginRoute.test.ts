import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { securityHeaders } from '../../src/middleware/securityHeaders'
import loginRoutes from '../../src/routes/login'
import { getSetCookies } from '../utils/http'
import { CSRF_COOKIE_NAME } from '../../src/middleware/csrf'

function extractCsrf(res: Response) {
  const cookies = getSetCookies(res)
  const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
  if (!csrfCookie) throw new Error('CSRF cookie missing in response')
  const value = csrfCookie.split(';')[0]
  const token = value.split('=')[1]
  return { cookie: value, token }
}

const buildApp = () => {
  const app = new Hono()
  app.use('*', securityHeaders())
  app.route('/', loginRoutes)
  return app
}

const formHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
}

// Use shared helper for robust Set-Cookie parsing

describe('/login route', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('sets both cookies on success', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login', {
        method: 'POST',
        body: body as any,
        headers: { ...formHeaders, Cookie: csrf.cookie } as any,
      }),
      {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as any)
    expect(res.status).toBe(302)
    const cookies = getSetCookies(res)
    const joined = cookies.join('\n')
    expect(joined).toContain('__Host-access_token=acc')
    expect(joined).toContain('__Host-refresh_token=ref')
  })

  it('returns 200 JSON for HTMX', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login', {
        method: 'POST',
        body: body as any,
        headers: { ...(formHeaders as any), 'HX-Request': 'true', Cookie: csrf.cookie },
      }),
      { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' } as any,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('returns 302 for non-HTMX', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(new Request('http://x/login', { method: 'POST', body: body as any, headers: { ...formHeaders, Cookie: csrf.cookie } as any }), {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')
  })

  it('uses redirect query parameter when relative', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login?redirect=%2Fadmin%3Ftab%3Dsettings', {
        method: 'POST',
        body: body as any,
        headers: { ...formHeaders, Cookie: csrf.cookie } as any,
      }),
      { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' } as any,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/admin?tab=settings')
  })

  it('prefers redirect_to form field when provided', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', redirect_to: '/finance', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login', {
        method: 'POST',
        body: body as any,
        headers: { ...formHeaders, Cookie: csrf.cookie } as any,
      }),
      { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' } as any,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/finance')
  })

  it('rejects external redirect attempts', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    const res = await app.fetch(
      new Request('http://x/login?redirect=https%3A%2F%2Fevil.example', {
        method: 'POST',
        body: body as any,
        headers: { ...formHeaders, Cookie: csrf.cookie } as any,
      }),
      { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' } as any,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')
  })

  it('does not expose sensitive values in logs', async () => {
    const app = buildApp()
    const csrf = extractCsrf(await app.request('http://x/login'))
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref' }), { status: 200 }),
    )
    const body = new URLSearchParams({ email: 'e', password: 'p', csrf_token: csrf.token })
    await app.fetch(
      new Request('http://x/login', {
        method: 'POST',
        body: body as any,
        headers: { ...formHeaders, Cookie: csrf.cookie } as any,
      }),
      {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    } as any)
    const logs = spy.mock.calls.flat().join(' ')
    expect(logs).not.toContain('acc')
    expect(logs).not.toContain('ref')
    spy.mockRestore()
  })
})

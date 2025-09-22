import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import {
  setAccessCookie,
  setRefreshCookie,
  clearAccessCookie,
  clearRefreshCookie,
} from '../../src/auth/cookies'

describe('auth cookies', () => {
  it('sets correct flags for access cookie', async () => {
    const app = new Hono()
    app.get('/set', (c) => {
      setAccessCookie(c, 'abc')
      return c.text('ok')
    })

    const res = await app.request('http://x/set')
    const cookie = res.headers.get('set-cookie') || ''
    expect(cookie).toContain('__Host-access_token=abc')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=600') // 10 minutes default
  })

  it('sets correct flags for refresh cookie', async () => {
    const app = new Hono()
    app.get('/set', (c) => {
      setRefreshCookie(c, 'def')
      return c.text('ok')
    })

    const res = await app.request('http://x/set')
    const cookie = res.headers.get('set-cookie') || ''
    expect(cookie).toContain('__Host-refresh_token=def')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=7776000') // 90 days default
  })

  it('clears cookies with Max-Age=0 (access)', async () => {
    const app = new Hono()
    app.get('/clear', (c) => {
      clearAccessCookie(c)
      return c.text('ok')
    })

    const res = await app.request('http://x/clear')
    const cookie = res.headers.get('set-cookie') || ''
    expect(cookie).toContain('__Host-access_token=')
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('respects TTL overrides from env for access cookie', async () => {
    const app = new Hono()
    app.get('/set', (c) => {
      setAccessCookie(c, 'xyz')
      return c.text('ok')
    })

    const req = new Request('http://x/set')
    const res = await app.fetch(req, { ACCESS_COOKIE_TTL: '120' } as any)
    const cookie = res.headers.get('set-cookie') || ''
    expect(cookie).toContain('Max-Age=120')
  })
})

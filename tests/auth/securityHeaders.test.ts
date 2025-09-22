import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { securityHeaders } from '../../src/middleware/securityHeaders'

describe('security headers', () => {
  it('sets HSTS and CSP headers', async () => {
    const app = new Hono()
    app.use('*', securityHeaders())
    app.get('/', (c) => c.text('ok'))

    const res = await app.request('http://x/')
    expect(res.headers.get('Strict-Transport-Security')).toContain('includeSubDomains')
    const csp = res.headers.get('Content-Security-Policy') || ''
    expect(csp).toContain("default-src 'self'")
  })

  it('auth responses have no-store cache headers', async () => {
    const app = new Hono()
    app.use('*', securityHeaders())
    app.get('/login', (c) => c.text('login'))

    const res = await app.request('http://x/login')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('Pragma')).toBe('no-cache')
    expect(res.headers.get('Expires')).toBe('0')
  })

  it('dev vs prod CSP differences are applied', async () => {
    const appDev = new Hono()
    appDev.use('*', securityHeaders())
    appDev.get('/', (c) => c.text('ok'))
    const resDev = await appDev.fetch(new Request('http://x/'), { ENV: 'development' } as any)
    const cspDev = resDev.headers.get('Content-Security-Policy') || ''
    expect(cspDev).toContain("script-src 'self' 'unsafe-inline'")

    const appProd = new Hono()
    appProd.use('*', securityHeaders())
    appProd.get('/', (c) => c.text('ok'))
    const resProd = await appProd.fetch(new Request('http://x/'), { ENV: 'production' } as any)
    const cspProd = resProd.headers.get('Content-Security-Policy') || ''
    expect(cspProd).toContain("script-src 'self'")
    expect(cspProd).not.toContain("'unsafe-inline'")
  })

  it('sets X-Content-Type-Options: nosniff', async () => {
    const app = new Hono()
    app.use('*', securityHeaders())
    app.get('/', (c) => c.text('ok'))
    const res = await app.request('http://x/')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('sets Referrer-Policy', async () => {
    const app = new Hono()
    app.use('*', securityHeaders())
    app.get('/', (c) => c.text('ok'))
    const res = await app.request('http://x/')
    expect(res.headers.get('Referrer-Policy')).toBeTruthy()
  })

  it('sets Permissions-Policy', async () => {
    const app = new Hono()
    app.use('*', securityHeaders())
    app.get('/', (c) => c.text('ok'))
    const res = await app.request('http://x/')
    expect(res.headers.get('Permissions-Policy')).toBeTruthy()
  })
})

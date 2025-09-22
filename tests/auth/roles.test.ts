import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireAdmin, requireTrustee } from '../../src/middleware/auth'

function withClaims(claims: any) {
  return async (c: any, next: any) => {
    c.set('auth', { token: 't', claims, userId: claims?.sub ?? null })
    await next()
  }
}

describe('role-based guards', () => {
  it('requireAdmin denies when roles missing (302 for GET)', async () => {
    const app = new Hono()
    app.use('/admin/*', withClaims({}))
    app.use('/admin/*', requireAdmin)
    app.get('/admin/area', (c) => c.text('ok'))
    const res = await app.request('http://x/admin/area')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/')
  })

  it('requireAdmin denies HTMX with 403 JSON', async () => {
    const app = new Hono()
    app.use('/admin/*', withClaims({}))
    app.use('/admin/*', requireAdmin)
    app.get('/admin/area', (c) => c.text('ok'))
    const req = new Request('http://x/admin/area', { headers: { 'HX-Request': 'true' } })
    const res = await app.fetch(req)
    expect(res.status).toBe(403)
    expect((res.headers.get('Content-Type') || '')).toContain('application/json')
  })

  it('requireAdmin allows when role includes admin', async () => {
    const app = new Hono()
    app.use('/admin/*', withClaims({ roles: ['ADMIN'] }))
    app.use('/admin/*', requireAdmin)
    app.get('/admin/area', (c) => c.text('ok'))
    const res = await app.request('http://x/admin/area')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('requireTrustee allows when role includes trustee', async () => {
    const app = new Hono()
    app.use('/admin/*', withClaims({ role: 'trustee' }))
    app.use('/admin/*', requireTrustee)
    app.get('/admin/area', (c) => c.text('ok'))
    const res = await app.request('http://x/admin/area')
    expect(res.status).toBe(200)
  })

  it('requireTrustee allows when role includes admin (admin ⇒ trustee)', async () => {
    const app = new Hono()
    app.use('/admin/*', withClaims({ app_roles: 'admin' }))
    app.use('/admin/*', requireTrustee)
    app.get('/admin/area', (c) => c.text('ok'))
    const res = await app.request('http://x/admin/area')
    expect(res.status).toBe(200)
  })
})

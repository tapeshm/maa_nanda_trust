import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireAdmin, requireTrustee, requireAnyRole } from '../../../src/middleware/auth'

function appWithAuthGuard(guard: any, claims: any, userId: string | null) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', {
      token: null,
      claims,
      userId,
      getClient: () => { throw new Error('not used') },
    } as any)
    await next()
  })
  app.use('*', guard)
  app.get('/', (c) => c.text('ok'))
  return app
}

describe('requireAdmin', () => {
  it('allows admin role', async () => {
    const claims = { app_metadata: { roles: ['Admin'] } }
    const app = appWithAuthGuard(requireAdmin, claims, 'u1')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
  })

  it('allows trustee role', async () => {
    const claims = { app_metadata: { roles: ['trustee'] } }
    const app = appWithAuthGuard(requireAdmin, claims, 'u2')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
  })

  it('forbids non-admin/trustee roles', async () => {
    const claims = { app_metadata: { roles: ['manager'] } }
    const app = appWithAuthGuard(requireAdmin, claims, 'u3')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(403)
  })

  it('returns 401 when userId missing', async () => {
    const claims = { app_metadata: { roles: ['admin'] } }
    const app = appWithAuthGuard(requireAdmin, claims, null)
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(401)
  })
})

describe('requireTrustee', () => {
  it('allows trustee', async () => {
    const claims = { app_metadata: { roles: ['trustee'] } }
    const app = appWithAuthGuard(requireTrustee, claims, 'u4')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
  })

  it('forbids admin without trustee', async () => {
    const claims = { app_metadata: { roles: ['admin'] } }
    const app = appWithAuthGuard(requireTrustee, claims, 'u5')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(403)
  })

  it('returns 401 when userId missing', async () => {
    const claims = { app_metadata: { roles: ['trustee'] } }
    const app = appWithAuthGuard(requireTrustee, claims, null)
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(401)
  })
})

describe('requireAnyRole', () => {
  it('allows any matching role', async () => {
    const claims = { app_metadata: { roles: ['manager'] } }
    const app = appWithAuthGuard(requireAnyRole(['editor', 'manager']), claims, 'u6')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(200)
  })

  it('forbids when none of the roles match', async () => {
    const claims = { app_metadata: { roles: ['admin'] } }
    const app = appWithAuthGuard(requireAnyRole(['editor', 'manager']), claims, 'u7')
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(403)
  })

  it('returns 401 when userId missing', async () => {
    const claims = { app_metadata: { roles: ['manager'] } }
    const app = appWithAuthGuard(requireAnyRole(['editor', 'manager']), claims, null)
    const res = await app.fetch(new Request('http://localhost/'), {} as any, { waitUntil() {} } as any)
    expect(res.status).toBe(401)
  })
})

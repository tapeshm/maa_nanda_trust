import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Hono } from 'hono'

describe('admin dashboard auth enforcement', () => {
  let app: Hono

  beforeAll(async () => {
    const { default: routes } = await import('../../src/routes')
    app = new Hono()
    app.route('/', routes)
  })

  it('redirects unauthenticated full-page requests to /login', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard'), {} as any)
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/login')
  })

  it('returns 401 with HX-Redirect for unauthorized HTMX requests', async () => {
    const res = await app.fetch(
      new Request('http://example.com/admin/dashboard', {
        headers: {
          'HX-Request': 'true',
        },
      }),
      {} as any,
    )
    expect(res.status).toBe(401)
    expect(res.headers.get('HX-Redirect')).toBe('/login')
  })
})

describe('admin dashboard layout and navigation', () => {
  let app: Hono

  beforeAll(async () => {
    vi.resetModules()
    vi.doMock('../../src/middleware/auth', () => ({
      requireAuth: () => (_c: any, next: any) => next(),
      requireAdmin: async (_c: any, next: any) => next(),
    }))

    const { default: dashboard } = await import('../../src/routes/admin/dashboard')
    app = new Hono()
    app.route('/admin', dashboard)
  })

  afterAll(() => {
    vi.doUnmock('../../src/middleware/auth')
    vi.resetModules()
  })

  it('renders AdminLayout with sidebar and content slot', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard'), {} as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-admin-content')
    expect(html).toContain('lg:pl-72')
    const orderHome = html.indexOf('>Home<')
    const orderAbout = html.indexOf('>About-us<')
    const orderActivities = html.indexOf('>Activities<')
    const orderEvents = html.indexOf('>Events<')
    const orderSettings = html.indexOf('>Settings<')
    expect(orderHome).toBeGreaterThan(-1)
    expect(orderAbout).toBeGreaterThan(-1)
    expect(orderActivities).toBeGreaterThan(-1)
    expect(orderEvents).toBeGreaterThan(-1)
    expect(orderSettings).toBeGreaterThan(-1)
    expect(orderHome).toBeLessThan(orderAbout)
    expect(orderAbout).toBeLessThan(orderActivities)
    expect(orderActivities).toBeLessThan(orderEvents)
    expect(orderEvents).toBeLessThan(orderSettings)
  })

  it('sidebar links include HTMX navigation attributes', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard'), {} as any)
    const html = await res.text()
    for (const slug of ['home', 'about-us', 'activities', 'events', 'settings']) {
      expect(html).toContain(`hx-get="/admin/dashboard/${slug}`)
      expect(html).toContain('hx-target="#admin-content"')
      expect(html).toContain('hx-swap="innerHTML"')
      expect(html).toContain('hx-push-url="true"')
    }
  })

  it('returns panel fragments for HTMX requests', async () => {
    const res = await app.fetch(
      new Request('http://example.com/admin/dashboard/events', {
        headers: {
          'HX-Request': 'true',
        },
      }),
      {} as any,
    )
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('data-panel="events"')
    expect(body).not.toContain('data-admin-content')
  })

  it('renders full layout when requesting a panel directly', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard/activities'), {} as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-admin-content')
    expect(html).toContain('data-panel="activities"')
  })
})

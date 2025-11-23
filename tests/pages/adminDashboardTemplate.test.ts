import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Hono } from 'hono'

// Mock data modules to avoid D1 errors
vi.mock('../../src/data/landing.data', () => ({
  getLandingContent: vi.fn().mockResolvedValue({
    hero: { eyebrow: 'Test Eyebrow', title: 'Test Title', description: 'Test Description' },
    welcome: { title: 'Welcome', description: 'Welcome Desc' },
    projectsSection: { title: 'Projects', description: 'Projects Desc' },
    eventsSection: { title: 'Events', description: 'Events Desc' }
  })
}))
vi.mock('../../src/data/about.data', () => ({
  getAboutContent: vi.fn().mockResolvedValue({
    hero: { title: 'About', description: 'About Desc' },
    mission: { title: 'Mission', description: 'Mission Desc' },
    vision: { title: 'Vision', description: 'Vision Desc' },
    values: [],
    trustees: [],
    story: { title: 'Story', description: 'Story Desc' }
  })
}))
vi.mock('../../src/data/transparency.data', () => ({
  getTransparencyContent: vi.fn().mockResolvedValue({
    hero: { title: 'Transparency', description: 'Transparency Desc' },
    trustDetails: { trustName: 'Trust', registrationNumber: '123', dateOfRegistration: '2023' },
    propertyDetails: [],
    documents: []
  })
}))
vi.mock('../../src/data/projects.data', () => ({
  getProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null)
}))
vi.mock('../../src/data/events.data', () => ({
  getEvents: vi.fn().mockResolvedValue([{ id: 'e1', title: 'Test Event', description: 'Desc', location: 'Loc', startDate: '2023-01-01', status: 'Upcoming' }]),
  getEventById: vi.fn().mockResolvedValue(null)
}))

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
    
    // Check for Sign out button
    expect(html).toContain('Sign out')
    
    const orderHome = html.indexOf('>Home<')
    const orderAbout = html.indexOf('>About Us<')
    const orderProjects = html.indexOf('>Projects<')
    const orderEvents = html.indexOf('>Events<')
    const orderTransparency = html.indexOf('>Transparency<')
    
    expect(orderHome).toBeGreaterThan(-1)
    expect(orderAbout).toBeGreaterThan(-1)
    expect(orderProjects).toBeGreaterThan(-1)
    expect(orderEvents).toBeGreaterThan(-1)
    expect(orderTransparency).toBeGreaterThan(-1)
    
    // Verify order
    expect(orderHome).toBeLessThan(orderAbout)
    expect(orderAbout).toBeLessThan(orderProjects)
    expect(orderProjects).toBeLessThan(orderEvents)
    expect(orderEvents).toBeLessThan(orderTransparency)
  })

  it('sidebar links include HTMX navigation attributes', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard'), {} as any)
    const html = await res.text()
    for (const slug of ['home', 'about-us', 'projects', 'events', 'transparency']) {
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
    // Events list contains specific markers
    expect(body).toContain('Events')
    expect(body).not.toContain('data-admin-content')
  })

  it('renders full layout when requesting a panel directly', async () => {
    const res = await app.fetch(new Request('http://example.com/admin/dashboard/events'), {} as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-admin-content')
    expect(html).toContain('Events')
  })
})
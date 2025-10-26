import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { Hono } from 'hono'
import { PAGE_SLUGS } from '../../src/config/pages'
import type { Bindings } from '../../src/bindings'
import { createIntegrationEnv } from '../integration/editor.helpers'
import { PreviewRepo } from '../../src/repositories/previewRepo'

const buildApp = (routes: any) => {
  const app = new Hono()
  app.route('/', routes)
  return app
}

async function clearPageTables(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

describe('pages route skeletons (mounted app)', () => {
  let app: Hono
  let env: Bindings

  beforeAll(async () => {
    const { default: routes } = await import('../../src/routes')
    app = buildApp(routes)
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await clearPageTables(env)
  })

  it('protects admin routes via auth redirect', async () => {
    for (const slug of PAGE_SLUGS) {
      const res = await app.fetch(new Request(`http://example.com/admin/${slug}`), {} as any)
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login')
    }
  })

  it('protects preview routes via auth redirect', async () => {
    for (const slug of PAGE_SLUGS) {
      const res = await app.fetch(new Request(`http://example.com/preview/${slug}`), {} as any)
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login')
    }
  })

  it('renders empty landing state when no landing page is published', async () => {
    const res = await app.fetch(new Request('http://example.com/'), env as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('No landing page is published yet')
  })

  it('returns 404 for public route when page is missing', async () => {
    const res = await app.fetch(new Request('http://example.com/landing/42'), env as any)
    expect(res.status).toBe(404)
  })

})

describe('pages route placeholders (authorized bypass)', () => {
  let adminApp: Hono
  let previewApp: Hono
  let env: Bindings

  beforeAll(async () => {
    vi.resetModules()
    vi.doMock('../../src/middleware/auth', () => ({
      requireAuth: () => (_c: any, next: any) => next(),
      requireAdmin: async (_c: any, next: any) => next(),
    }))

    const [{ default: adminPages }, { default: previewPages }] = await Promise.all([
      import('../../src/routes/admin/pages'),
      import('../../src/routes/preview/pages'),
    ])

    adminApp = new Hono()
    adminApp.route('/admin', adminPages)

    previewApp = new Hono()
    previewApp.route('/preview', previewPages)
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await clearPageTables(env)
  })

  afterAll(() => {
    vi.doUnmock('../../src/middleware/auth')
    vi.resetModules()
  })

  it('returns distinct admin placeholders', async () => {
    for (const slug of PAGE_SLUGS) {
      const res = await adminApp.fetch(new Request(`http://example.com/admin/${slug}`), env as any)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain(`/admin/${slug}/save`)
    }
  })

  it('renders preview templates when drafts exist', async () => {
    const repo = new PreviewRepo(env)
    const fixtures = {
      landing: {
        title: 'Landing Preview Title',
        marker: 'Landing welcome preview',
        seed: () =>
          repo.saveDraft({
            slug: 'landing',
            title: 'Landing Preview Title',
            heroImageKey: null,
            donateEnabled: true,
            sections: [
              { kind: 'welcome', pos: 0, contentHtml: '<p>Landing welcome preview</p>' },
              {
                kind: 'activities',
                pos: 1,
                contentHtml: '<p>Landing activities intro</p>',
                configJson: JSON.stringify({ activities_layout: 'grid' }),
              },
              {
                kind: 'events',
                pos: 2,
                contentHtml: '<p>Landing events intro</p>',
                configJson: JSON.stringify({ events_hide_past: false }),
              },
            ],
            activities: [],
            events: [],
          }),
      },
      activities: {
        title: 'Activities Preview Title',
        marker: 'Activities intro preview',
        seed: () =>
          repo.saveDraft({
            slug: 'activities',
            title: 'Activities Preview Title',
            heroImageKey: null,
            donateEnabled: false,
            sections: [
              {
                kind: 'activities',
                pos: 0,
                contentHtml: '<p>Activities intro preview</p>',
                configJson: JSON.stringify({ activities_layout: 'carousel' }),
              },
            ],
            activities: [
              { title: 'Preview Activity', pos: 0, descriptionHtml: '<p>Activity details</p>' },
            ],
            events: [],
          }),
      },
      events: {
        title: 'Events Preview Title',
        marker: 'Events intro preview',
        seed: () =>
          repo.saveDraft({
            slug: 'events',
            title: 'Events Preview Title',
            heroImageKey: null,
            donateEnabled: false,
            sections: [
              {
                kind: 'events',
                pos: 0,
                contentHtml: '<p>Events intro preview</p>',
                configJson: JSON.stringify({ events_hide_past: false }),
              },
            ],
            activities: [],
            events: [
              {
                title: 'Preview Event',
                pos: 0,
                startDate: '2030-01-01',
                descriptionHtml: '<p>Event details</p>',
              },
            ],
          }),
      },
    } satisfies Record<(typeof PAGE_SLUGS)[number], { title: string; marker: string; seed: () => Promise<unknown> }>

    for (const slug of PAGE_SLUGS) {
      const fixture = fixtures[slug]
      await fixture.seed()
      const res = await previewApp.fetch(new Request(`http://example.com/preview/${slug}`), env as any)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain(fixture.title)
      expect(html).toContain(fixture.marker)
    }
  })
})

describe('public pages validation', () => {
  let app: Hono
  let env: Bindings

  beforeAll(async () => {
    vi.resetModules()
    const { default: publicPages } = await import('../../src/routes/public/pages')
    app = new Hono()
    app.route('/', publicPages)
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await clearPageTables(env)
  })

  afterAll(() => {
    vi.resetModules()
  })

  it('returns 404 for unknown slugs when mounted alone', async () => {
    const res = await app.fetch(new Request('http://example.com/demo/1'), env as any)
    expect(res.status).toBe(404)
  })

  it('returns 404 when id is not numeric', async () => {
    const res = await app.fetch(new Request('http://example.com/landing/not-a-number'), env as any)
    expect(res.status).toBe(404)
  })
})

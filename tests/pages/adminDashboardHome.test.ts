import { describe, it, expect, vi, afterEach } from 'vitest'
import { Hono } from 'hono'

async function createApp(options?: { homeExists?: boolean }) {
  vi.resetModules()
  vi.doMock('../../src/middleware/auth', () => ({
    requireAuth: () => (_c: any, next: any) => next(),
    requireAdmin: async (_c: any, next: any) => next(),
  }))

  if (options?.homeExists !== undefined) {
    vi.doMock('../../src/routes/admin/home.data', () => ({
      homeExists: vi.fn().mockResolvedValue(options.homeExists),
    }))
  }

  const { default: dashboard } = await import('../../src/routes/admin/dashboard')
  const app = new Hono()
  app.route('/admin', dashboard)
  return app
}

afterEach(() => {
  vi.doUnmock('../../src/middleware/auth')
  vi.doUnmock('../../src/routes/admin/home.data')
  vi.resetModules()
})

describe('admin dashboard home panel', () => {
  it('renders the Home form when no data exists', async () => {
    const app = await createApp()
    const res = await app.fetch(new Request('http://example.com/admin/dashboard/home'), {} as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-admin-content')
    expect(html).toContain('data-home-form')
    expect(html).toContain('md:grid-cols-3')
    expect(html).toContain('data-mode="edit"')
    expect(html).not.toContain('data-has-data="true"')
  })

  it('renders the preview placeholder when data exists', async () => {
    const app = await createApp({ homeExists: true })
    const res = await app.fetch(new Request('http://example.com/admin/dashboard/home'), {} as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-admin-content')
    expect(html).toContain('data-panel="home"')
    expect(html).toContain('data-mode="preview"')
    expect(html).toContain('data-has-data="true"')
    expect(html).toContain('Preview placeholder')
  })

  it('toggles between preview and edit via HTMX', async () => {
    const app = await createApp({ homeExists: true })
    const previewRes = await app.fetch(
      new Request('http://example.com/admin/dashboard/home/preview', {
        headers: { 'HX-Request': 'true' },
      }),
      {} as any,
    )
    expect(previewRes.status).toBe(200)
    const previewHtml = await previewRes.text()
    expect(previewHtml).toContain('data-panel="home"')
    expect(previewHtml).toContain('data-mode="preview"')
    expect(previewHtml).toContain('data-has-data="true"')
    expect(previewHtml).not.toContain('data-admin-content')

    const editRes = await app.fetch(
      new Request('http://example.com/admin/dashboard/home/edit', {
        headers: { 'HX-Request': 'true' },
      }),
      {} as any,
    )
    expect(editRes.status).toBe(200)
    const editHtml = await editRes.text()
    expect(editHtml).toContain('data-panel="home"')
    expect(editHtml).toContain('data-mode="edit"')
    expect(editHtml).toContain('data-home-form')
    expect(editHtml).not.toContain('data-admin-content')
  })

  it('banner controls expose HTMX navigation attributes', async () => {
    const app = await createApp({ homeExists: true })
    const res = await app.fetch(new Request('http://example.com/admin/dashboard/home'), {} as any)
    const html = await res.text()
    expect(html).toContain('data-home-banner')
    expect(html).toContain('hx-get="/admin/dashboard/home/preview"')
    expect(html).toContain('hx-get="/admin/dashboard/home/edit"')
    expect(html).toContain('hx-target="#admin-content"')
    expect(html).toContain('hx-swap="innerHTML"')
    expect(html).toContain('hx-push-url="true"')
  })

  it('form fragment contains required fields and placeholder cards', async () => {
    const app = await createApp()
    const res = await app.fetch(
      new Request('http://example.com/admin/dashboard/home/edit', {
        headers: { 'HX-Request': 'true' },
      }),
      {} as any,
    )
    const html = await res.text()
    expect(html).toContain('data-home-form')
    expect(html).toContain('name="title"')
    expect(html).toContain('name="hero_image_key"')
    expect(html).toContain('name="intro"')
    expect(html).toContain('name="content_json[home_body]"')
    expect(html).toContain('name="content_html[home_body]"')
    expect(html).toContain('Activities preview coming soon')
    expect(html).toContain('Events preview coming soon')
  })
})

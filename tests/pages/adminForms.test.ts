/** @jsxImportSource hono/jsx */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { Hono } from 'hono'
import routes from '../../src/routes'
import type { Bindings } from '../../src/bindings'
import {
  createIntegrationEnv,
  issueAdminToken,
  buildCookieHeader,
  ADMIN_ORIGIN,
} from '../integration/editor.helpers'

const CSRF_TOKEN = 'test-csrf-token'

describe('admin page forms and HTMX actions', () => {
  let app: Hono

  beforeAll(() => {
    app = new Hono()
    app.route('/', routes)
  })

  afterEach(() => {
    // Restore fetch if issueAdminToken mocked it
    if ((globalThis.fetch as any)?.mockRestore) {
      ;(globalThis.fetch as any).mockRestore()
    }
  })

  it('GET /admin/activities renders populated form with current items', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)

    const seed = await seedActivitiesPage(app, env)

    const cookies = {
      '__Host-access_token': seed.token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      'cf-connecting-ip': '1.1.1.1',
    })

    const res = await app.fetch(new Request(`${ADMIN_ORIGIN}/admin/activities`, { headers }), env as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Activities page')
    expect(html).toContain('name="title"')
    expect(html).toContain('data-activity-item')
    expect(html).toContain('Add activity')
  })

  it('POST /admin/activities/items adds a new activity and returns fragment', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)
    const seed = await seedActivitiesPage(app, env)

    const pageId = await latestPageId(env, 'activities')
    expect(pageId).toBeTruthy()

    const cookies = {
      '__Host-access_token': seed.token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const body = new URLSearchParams({
      page_id: String(pageId),
    })

    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'cf-connecting-ip': '1.1.1.1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-Request': 'true',
      'HX-CSRF-Token': CSRF_TOKEN,
    })

    const res = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/activities/items`, {
        method: 'POST',
        headers,
        body: body.toString(),
      }),
      env as any,
    )

    expect(res.status).toBe(200)
    const fragment = await res.text()
    expect(fragment).toContain('data-activity-item')
    expect(fragment).toContain('Untitled activity')

    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM activities WHERE page_id = ?')
      .bind(pageId)
      .all<{ count: number }>()
    expect(count.results?.[0]?.count).toBe(2)
  })

  it('DELETE /admin/activities/items/:id removes the activity', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)
    const seed = await seedActivitiesPage(app, env)

    const pageId = await latestPageId(env, 'activities')
    const existing = await env.DB.prepare('SELECT id FROM activities WHERE page_id = ? ORDER BY id LIMIT 1')
      .bind(pageId)
      .all<{ id: number }>()
    const itemId = existing.results?.[0]?.id
    expect(itemId).toBeTruthy()

    const cookies = {
      '__Host-access_token': seed.token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'cf-connecting-ip': '1.1.1.1',
      'HX-Request': 'true',
      'HX-CSRF-Token': CSRF_TOKEN,
    })

    const res = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/activities/items/${itemId}`, {
        method: 'DELETE',
        headers,
      }),
      env as any,
    )

    expect(res.status).toBe(200)

    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM activities WHERE page_id = ?')
      .bind(pageId)
      .all<{ count: number }>()
    expect(count.results?.[0]?.count).toBe(0)
  })

  it('POST /admin/events/items adds a new event fragment', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)
    const seed = await seedEventsPage(app, env)

    const pageId = await latestPageId(env, 'events')

    const cookies = {
      '__Host-access_token': seed.token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const body = new URLSearchParams({ page_id: String(pageId) })
    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'cf-connecting-ip': '1.1.1.1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-Request': 'true',
      'HX-CSRF-Token': CSRF_TOKEN,
    })

    const res = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/events/items`, {
        method: 'POST',
        headers,
        body: body.toString(),
      }),
      env as any,
    )

    expect(res.status).toBe(200)
    const fragment = await res.text()
    expect(fragment).toContain('data-event-item')
    expect(fragment).toContain('Untitled event')

    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM events WHERE page_id = ?')
      .bind(pageId)
      .all<{ count: number }>()
    expect(count.results?.[0]?.count).toBe(2)
  })

  it('POST /admin/activities/items/reorder updates item positions', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)
    const seed = await seedActivitiesPage(app, env, 2)

    const pageId = await latestPageId(env, 'activities')
    const ids = await env.DB.prepare('SELECT id FROM activities WHERE page_id = ? ORDER BY pos ASC').bind(pageId).all<{ id: number }>()
    expect(ids.results?.length).toBe(2)
    const [first, second] = ids.results!

    const cookies = {
      '__Host-access_token': seed.token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const body = new URLSearchParams({
      page_id: String(pageId),
      order: String(second.id),
    })
    body.append('order', String(first.id))

    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'cf-connecting-ip': '1.1.1.1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-Request': 'true',
      'HX-CSRF-Token': CSRF_TOKEN,
    })

    const res = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/activities/items/reorder`, {
        method: 'POST',
        headers,
        body: body.toString(),
      }),
      env as any,
    )

    expect(res.status).toBe(200)

    const rows = await env.DB.prepare('SELECT id, pos FROM activities WHERE page_id = ? ORDER BY id ASC')
      .bind(pageId)
      .all<{ id: number; pos: number }>()
    const positions = new Map(rows.results?.map((row) => [row.id, row.pos]))
    expect(positions.get(second.id)).toBe(0)
    expect(positions.get(first.id)).toBe(1)
  })

  it('full-page POST /admin/landing/save persists landing fields', async () => {
    const env = createIntegrationEnv()
    await clearPageTables(env)
    const { token } = await issueAdminToken(['admin'])

    const cookies = {
      '__Host-access_token': token,
      '__Host-csrf': CSRF_TOKEN,
    }

    const form = new URLSearchParams(
      Object.entries({
        csrf_token: CSRF_TOKEN,
        slug: 'landing',
        title: 'Temple Landing',
        hero_image_key: 'hero.jpg',
        donate_enabled: '1',
        'sections[0][kind]': 'welcome',
        'sections[0][pos]': '0',
        'sections[0][content_id]': 'landing_welcome',
        'sections[1][kind]': 'activities',
        'sections[1][pos]': '1',
        'sections[2][kind]': 'events',
        'sections[2][pos]': '2',
        'content_html[landing_welcome]': '<p>Welcome!</p>',
        'content_json[landing_welcome]': JSON.stringify({ type: 'doc', content: [] }),
      }),
    )

    const headers = new Headers({
      Cookie: buildCookieHeader(cookies),
      Host: 'admin.example.com',
      Origin: ADMIN_ORIGIN,
      'cf-connecting-ip': '1.1.1.1',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-Token': CSRF_TOKEN,
    })

    const res = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/admin/landing/save`, {
        method: 'POST',
        headers,
        body: form.toString(),
      }),
      env as any,
    )

    expect(res.status).toBe(303)
    const location = res.headers.get('Location')
    expect(location).toBeTruthy()
    const redirect = new URL(`${ADMIN_ORIGIN}${location}`)
    expect(redirect.pathname).toBe('/admin/landing')
    expect(redirect.searchParams.get('saved')).toBe('1')

    const pageResult = await env.DB.prepare(
      'SELECT id, slug, title, hero_image_key, donate_enabled, version, status FROM pages WHERE slug = ? AND status = ? ORDER BY version DESC LIMIT 1',
    )
      .bind('landing', 'preview')
      .all<{ id: number; title: string; hero_image_key: string | null; donate_enabled: number; version: number; status: string }>()
    const savedPage = pageResult.results?.[0]
    expect(savedPage).toBeTruthy()
    expect(savedPage?.title).toBe('Temple Landing')
    expect(savedPage?.hero_image_key).toBe('hero.jpg')
    expect(savedPage?.donate_enabled).toBe(1)
    expect(savedPage?.version).toBe(1)
    expect(savedPage?.status).toBe('preview')

    const sections = await env.DB.prepare(
      'SELECT kind, content_html FROM sections WHERE page_id = ? AND kind = ? ORDER BY id DESC LIMIT 1',
    )
      .bind(savedPage?.id ?? 0, 'welcome')
      .all<{ kind: string; content_html: string | null }>()
    expect(sections.results?.[0]?.content_html).toContain('Welcome!')
  })
})

async function seedActivitiesPage(app: Hono, env: Bindings, itemCount = 1) {
  const { token, fetchSpy } = await issueAdminToken(['admin'])
  const cookies = {
    '__Host-access_token': token,
    '__Host-csrf': CSRF_TOKEN,
  }

  const form = new URLSearchParams({
    csrf_token: CSRF_TOKEN,
    slug: 'activities',
    title: 'Retreat Activities',
    'sections[0][kind]': 'activities',
    'sections[0][pos]': '0',
    'sections[0][content_id]': 'activities_intro',
    activities_layout: 'grid',
    'content_html[activities_intro]': '<p>Activities intro</p>',
    'content_json[activities_intro]': JSON.stringify({ type: 'doc', content: [] }),
  })

  for (let i = 0; i < itemCount; i += 1) {
    const index = String(i)
    const editorId = `activity_desc_seed_${i}`
    form.set(`activities[${index}][title]`, `Activity ${i + 1}`)
    form.set(`activities[${index}][pos]`, index)
    form.set(`activities[${index}][description_id]`, editorId)
    form.set(`activities[${index}][image_key]`, '')
    form.set(`activities[${index}][image_alt]`, '')
    form.set(`content_html[${editorId}]`, `<p>Description ${i + 1}</p>`)
    form.set(`content_json[${editorId}]`, JSON.stringify({ type: 'doc', content: [] }))
  }

  const headers = new Headers({
    Cookie: buildCookieHeader(cookies),
    Host: 'admin.example.com',
    Origin: ADMIN_ORIGIN,
    'cf-connecting-ip': '1.1.1.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'HX-Request': 'true',
    'X-CSRF-Token': CSRF_TOKEN,
  })

  const res = await app.fetch(
    new Request(`${ADMIN_ORIGIN}/admin/activities/save`, {
      method: 'POST',
      headers,
      body: form.toString(),
    }),
    env as any,
  )

  expect(res.status).toBe(200)

  return { token, fetchSpy }
}

async function seedEventsPage(app: Hono, env: Bindings) {
  const { token, fetchSpy } = await issueAdminToken(['admin'])
  const cookies = {
    '__Host-access_token': token,
    '__Host-csrf': CSRF_TOKEN,
  }

  const form = new URLSearchParams({
    csrf_token: CSRF_TOKEN,
    slug: 'events',
    title: 'Temple Events',
    'sections[0][kind]': 'events',
    'sections[0][pos]': '0',
    'sections[0][content_id]': 'events_intro',
    'content_html[events_intro]': '<p>Events intro</p>',
    'content_json[events_intro]': JSON.stringify({ type: 'doc', content: [] }),
    'events[0][title]': 'Opening Ceremony',
    'events[0][pos]': '0',
    'events[0][description_id]': 'event_desc_seed',
    'content_html[event_desc_seed]': '<p>Event description</p>',
    'content_json[event_desc_seed]': JSON.stringify({ type: 'doc', content: [] }),
  })

  const headers = new Headers({
    Cookie: buildCookieHeader(cookies),
    Host: 'admin.example.com',
    Origin: ADMIN_ORIGIN,
    'cf-connecting-ip': '1.1.1.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'HX-Request': 'true',
    'X-CSRF-Token': CSRF_TOKEN,
  })

  const res = await app.fetch(
    new Request(`${ADMIN_ORIGIN}/admin/events/save`, {
      method: 'POST',
      headers,
      body: form.toString(),
    }),
    env as any,
  )

  expect(res.status).toBe(200)

  return { token, fetchSpy }
}

async function latestPageId(env: Bindings, slug: string): Promise<number> {
  const lookup = await env.DB.prepare('SELECT id FROM pages WHERE slug = ? AND status = ? ORDER BY version DESC LIMIT 1')
    .bind(slug, 'preview')
    .all<{ id: number }>()
  return lookup.results?.[0]?.id ?? 0
}

async function clearPageTables(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

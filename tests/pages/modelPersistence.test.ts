import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { Hono } from 'hono'
import type { Bindings } from '../../src/bindings'
import { createIntegrationEnv, issueAdminToken } from '../integration/editor.helpers'

const CSRF_TOKEN = 'test-csrf-token'

function buildApp(routesModule: any) {
  const app = new Hono()
  app.route('/', routesModule)
  return app
}

async function clearPageTables(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

function buildFormRequest(path: string, fields: Record<string, string>, token: string): Request {
  const params = new URLSearchParams(fields)
  return new Request(`https://example.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-CSRF-Token': CSRF_TOKEN,
      'HX-Request': 'true',
      Cookie: `__Host-csrf=${CSRF_TOKEN}; __Host-access_token=${token}`,
      Origin: 'https://admin.example.com',
      Host: 'admin.example.com',
    },
    body: params.toString(),
  })
}

function landingFields(versionLabel: string): Record<string, string> {
  return {
    title: `Landing ${versionLabel}`,
    hero_image_key: `hero-${versionLabel}.png`,
    donate_enabled: '1',
    'sections[0][kind]': 'welcome',
    'sections[0][pos]': '0',
    'sections[0][content_html]': `<p>Welcome ${versionLabel}</p>`,
    'sections[0][content_json]': JSON.stringify({ type: 'doc', content: [] }),
  }
}

function activitiesFields(title: string): Record<string, string> {
  return {
    title,
    donate_enabled: '0',
    'sections[0][kind]': 'activities',
    'sections[0][pos]': '0',
    'sections[0][content_html]': `<p>Activities intro for ${title}</p>`,
    'sections[0][content_json]': JSON.stringify({ type: 'doc', content: [] }),
    'activities[0][title]': `Activity A for ${title}`,
    'activities[0][pos]': '0',
    'activities[0][description_html]': `<p>Description for ${title}</p>`,
    'activities[0][description_json]': JSON.stringify({ type: 'doc', content: [] }),
  }
}

describe('pages model persistence flow', () => {
  let app: Hono
  let env: Bindings
  let adminToken: string
  let fetchSpy: ReturnType<typeof vi.spyOn> | null

  beforeAll(async () => {
    const { default: routes } = await import('../../src/routes')
    app = buildApp(routes)
  })

  afterAll(() => {
    vi.resetModules()
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await clearPageTables(env)
    const issued = await issueAdminToken(['admin'])
    adminToken = issued.token
    fetchSpy = issued.fetchSpy
  })

  afterEach(() => {
    fetchSpy?.mockRestore()
    fetchSpy = null
  })

  it('redirects full-page save submissions back to the editor with indicators', async () => {
    const params = new URLSearchParams({
      csrf_token: CSRF_TOKEN,
      title: 'Redirect landing',
      donate_enabled: '1',
      'sections[0][kind]': 'welcome',
      'sections[0][pos]': '0',
      'sections[0][content_html]': '<p>Redirect welcome</p>',
      'sections[0][content_json]': JSON.stringify({ type: 'doc', content: [] }),
    })

    const headers = new Headers({
      'Content-Type': 'application/x-www-form-urlencoded',
      'HX-CSRF-Token': CSRF_TOKEN,
      Cookie: `__Host-csrf=${CSRF_TOKEN}; __Host-access_token=${adminToken}`,
      Origin: 'https://admin.example.com',
      Host: 'admin.example.com',
    })

    const request = new Request('https://example.com/admin/landing/save', {
      method: 'POST',
      headers,
      body: params.toString(),
    })

    const res = await app.fetch(request, env as any)
    expect(res.status).toBe(303)
    const location = res.headers.get('Location')
    expect(location).toBeTruthy()
    const redirect = new URL(`https://example.com${location}`)
    expect(redirect.pathname).toBe('/admin/landing')
    expect(redirect.searchParams.get('saved')).toBe('1')
    expect(redirect.searchParams.get('pageId')).toBeTruthy()
    expect(redirect.searchParams.get('version')).toBe('1')
  })

  it('saves preview drafts and increments version per slug', async () => {
    const firstSave = await app.fetch(
      buildFormRequest('/admin/landing/save', landingFields('v1'), adminToken),
      env as any,
    )
    expect(firstSave.status).toBe(200)
    const firstJson = await firstSave.json()
    expect(firstJson.version).toBe(1)

    const firstPreview = await env.DB.prepare(
      'SELECT slug, version, title FROM pages WHERE slug = ? AND status = ? ORDER BY version ASC',
    )
      .bind('landing', 'preview')
      .all<{ slug: string; version: number; title: string }>()
    expect(firstPreview.results?.map((row) => row.version)).toEqual([1])

    const publishCount = await env.DB.prepare('SELECT COUNT(*) as count FROM pages WHERE status = ?')
      .bind('published')
      .all<{ count: number }>()
    expect(publishCount.results?.[0]?.count).toBe(0)

    const secondSave = await app.fetch(
      buildFormRequest('/admin/landing/save', landingFields('v2'), adminToken),
      env as any,
    )
    expect(secondSave.status).toBe(200)
    const secondJson = await secondSave.json()
    expect(secondJson.version).toBe(2)

    const previewVersions = await env.DB.prepare(
      'SELECT version FROM pages WHERE slug = ? AND status = ? ORDER BY version ASC',
    )
      .bind('landing', 'preview')
      .all<{ version: number }>()
    expect(previewVersions.results?.map((row) => row.version)).toEqual([2])
  })

  it('promotes the latest preview snapshot to published status', async () => {
    await app.fetch(buildFormRequest('/admin/landing/save', landingFields('publish'), adminToken), env as any)

    const publishRes = await app.fetch(
      buildFormRequest('/admin/landing/publish', { _csrf: CSRF_TOKEN }, adminToken),
      env as any,
    )
    expect(publishRes.status).toBe(200)
    const publishJson = await publishRes.json()
    expect(publishJson.version).toBe(1)

    const publishPage = await env.DB.prepare(
      'SELECT id, slug, version FROM pages WHERE slug = ? AND status = ?',
    )
      .bind('landing', 'published')
      .all<{ id: number; slug: string; version: number }>()
    expect(publishPage.results?.length).toBe(1)
    expect(publishPage.results?.[0]?.version).toBe(1)

    const counts = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM sections WHERE page_id IN (SELECT id FROM pages WHERE status = 'preview')) as preview_sections,
         (SELECT COUNT(*) FROM sections WHERE page_id IN (SELECT id FROM pages WHERE status = 'published')) as publish_sections`,
    ).all<{ preview_sections: number; publish_sections: number }>()

    expect(counts.results?.[0]?.preview_sections).toBe(0)
    expect(counts.results?.[0]?.publish_sections).toBe(1)
  })

  it('serves published content for public routes and ignores unpublished preview versions', async () => {
    await app.fetch(buildFormRequest('/admin/landing/save', landingFields('live'), adminToken), env as any)

    const publishRes = await app.fetch(
      buildFormRequest('/admin/landing/publish', { _csrf: CSRF_TOKEN }, adminToken),
      env as any,
    )
    const publishJson = await publishRes.json()
    const publicRequest = new Request(`https://example.com/landing/${publishJson.pageId}`)
    const publicRes = await app.fetch(publicRequest, env as any)
    expect(publicRes.status).toBe(200)
    const publicHtml = await publicRes.text()
    expect(publicHtml).toContain('Welcome live')

    // Save new preview without publishing
    await app.fetch(
      buildFormRequest('/admin/landing/save', landingFields('draft'), adminToken),
      env as any,
    )

    const publicAfter = await app.fetch(publicRequest, env as any)
    expect(publicAfter.status).toBe(200)
    const publicAfterHtml = await publicAfter.text()
    expect(publicAfterHtml).toContain('Welcome live')
    expect(publicAfterHtml).not.toContain('Welcome draft')
  })

  it('maintains independent version counters per slug', async () => {
    const landingFirst = await app.fetch(
      buildFormRequest('/admin/landing/save', landingFields('landing-1'), adminToken),
      env as any,
    )
    const landingFirstJson = await landingFirst.json()
    expect(landingFirstJson.version).toBe(1)

    const activitiesSave = await app.fetch(
      buildFormRequest('/admin/activities/save', activitiesFields('Activities main'), adminToken),
      env as any,
    )
    const activitiesJson = await activitiesSave.json()
    expect(activitiesJson.version).toBe(1)

    const landingSecond = await app.fetch(
      buildFormRequest('/admin/landing/save', landingFields('landing-2'), adminToken),
      env as any,
    )
    const landingSecondJson = await landingSecond.json()
    expect(landingSecondJson.version).toBe(2)

    const versions = await env.DB.prepare(
      'SELECT slug, version FROM pages WHERE status = ? ORDER BY slug, version',
    )
      .bind('preview')
      .all<{ slug: string; version: number }>()

    expect(versions.results).toEqual([
      { slug: 'activities', version: 1 },
      { slug: 'landing', version: 2 },
    ])
  })
})

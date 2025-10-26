/** @jsxImportSource hono/jsx */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import routes from '../../src/routes'
import type { Bindings } from '../../src/bindings'
import {
  createIntegrationEnv,
  issueAdminToken,
  buildCookieHeader,
  ADMIN_ORIGIN,
} from '../integration/editor.helpers'
import {
  PUBLIC_CACHE_CONTROL,
} from '../../src/utils/pages/cache'

const CSRF_TOKEN = 'cache-test-csrf'
const PUBLIC_ORIGIN = 'https://example.com'

let app: Hono
let env: Bindings
let adminToken: string
let fetchSpy: ReturnType<typeof issueAdminToken>['fetchSpy'] | null

describe('pages cache behaviour', () => {
  beforeAll(() => {
    app = new Hono()
    app.route('/', routes)
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await resetDatabase(env)
    const issued = await issueAdminToken(['admin'])
    adminToken = issued.token
    fetchSpy = issued.fetchSpy
  })

  afterEach(() => {
    fetchSpy?.mockRestore()
    fetchSpy = null
  })

  it('stores rendered HTML and landing pointer on publish', async () => {
    const saveRes = await submitSave('/admin/landing/save', landingFields('Cache landing test'), adminToken)
    expect(saveRes.status).toBe(200)
    const publishRes = await submitPublish('/admin/landing/publish', adminToken)
    expect(publishRes.status).toBe(200)
    const publishJson = await publishRes.json()

    const htmlKey = `pages:html:landing:${publishJson.pageId}:v${publishJson.version}`
    const cachedHtml = await env.PAGES_CACHE.get(htmlKey)
    expect(typeof cachedHtml).toBe('string')
    expect(cachedHtml).toContain('Cache landing test')

    const landingPointer = await env.PAGES_CACHE.get('pages:pointer:landing:current')
    expect(landingPointer).toEqual({ id: publishJson.pageId, version: publishJson.version })

    const pagePointer = await env.PAGES_CACHE.get(`pages:pointer:landing:${publishJson.pageId}`)
    expect(pagePointer).toEqual({ version: publishJson.version })
  })

  it('serves cached HTML with Cache-Control and ETag on warm public route', async () => {
    const saveRes = await submitSave(
      '/admin/activities/save',
      activitiesFields('Cached Activities'),
      adminToken,
    )
    expect(saveRes.status).toBe(200)
    const publishRes = await submitPublish('/admin/activities/publish', adminToken)
    const publishJson = await publishRes.json()

    await resetDatabase(env)

    const first = await fetchPublic(`/activities/${publishJson.pageId}`)
    expect(first.status).toBe(200)
    const cacheControl = first.headers.get('Cache-Control')
    const etag = first.headers.get('ETag')
    expect(cacheControl).toBe(PUBLIC_CACHE_CONTROL)
    expect(etag).toBeTruthy()
    const body = await first.text()
    expect(body).toContain('Cached Activities')

    const second = await fetchPublic(`/activities/${publishJson.pageId}`, {
      headers: { 'If-None-Match': etag ?? '' },
    })
    expect(second.status).toBe(304)
    expect(second.headers.get('Cache-Control')).toBe(PUBLIC_CACHE_CONTROL)
    expect(second.headers.get('ETag')).toBe(etag)
  })

  it('uses landing pointer to serve cached HTML at "/"', async () => {
    await submitSave('/admin/landing/save', landingFields('Pointer landing content'), adminToken)
    const publishRes = await submitPublish('/admin/landing/publish', adminToken)
    const publishJson = await publishRes.json()
    await resetDatabase(env)

    const res = await fetchPublic('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe(PUBLIC_CACHE_CONTROL)
    expect(res.headers.get('ETag')).toBeTruthy()
    const html = await res.text()
    expect(html).toContain('Pointer landing content')
    expect(html).toContain(String(publishJson.pageId))
  })

  it('preview routes remain uncached with Cache-Control: no-store', async () => {
    await submitSave('/admin/landing/save', landingFields('Preview draft'), adminToken)
    const headers = new Headers({
      Cookie: buildCookieHeader(adminCookies(adminToken)),
      Host: 'admin.example.com',
      'cf-connecting-ip': '1.1.1.1',
    })
    const res = await appFetch('/preview/landing', { headers })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})

async function submitSave(path: string, fields: Record<string, string>, token: string) {
  const params = new URLSearchParams({ csrf_token: CSRF_TOKEN, ...fields })
  const headers = new Headers({
    Cookie: buildCookieHeader(adminCookies(token)),
    Host: 'admin.example.com',
    Origin: ADMIN_ORIGIN,
    'cf-connecting-ip': '1.1.1.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'HX-Request': 'true',
    'HX-CSRF-Token': CSRF_TOKEN,
  })

  return appFetch(path, {
    method: 'POST',
    body: params.toString(),
    headers,
  })
}

async function submitPublish(path: string, token: string) {
  const params = new URLSearchParams({ csrf_token: CSRF_TOKEN })
  const headers = new Headers({
    Cookie: buildCookieHeader(adminCookies(token)),
    Host: 'admin.example.com',
    Origin: ADMIN_ORIGIN,
    'cf-connecting-ip': '1.1.1.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'HX-CSRF-Token': CSRF_TOKEN,
  })

  return appFetch(path, {
    method: 'POST',
    body: params.toString(),
    headers,
  })
}

async function fetchPublic(path: string, init: RequestInit = {}) {
  return appFetch(path, { origin: PUBLIC_ORIGIN, ...init })
}

async function appFetch(
  path: string,
  init: RequestInit & { origin?: string } = {},
): Promise<Response> {
  const { origin = ADMIN_ORIGIN, ...options } = init
  const request = new Request(`${origin}${path}`, options)
  return app.fetch(request, env as any)
}

function adminCookies(token: string): Record<string, string> {
  return {
    '__Host-access_token': token,
    '__Host-csrf': CSRF_TOKEN,
  }
}

function landingFields(welcome: string): Record<string, string> {
  return {
    slug: 'landing',
    title: 'Landing Page',
    hero_image_key: 'landing-kv.jpg',
    donate_enabled: '1',
    'sections[0][kind]': 'welcome',
    'sections[0][pos]': '0',
    'sections[0][content_html]': `<p>${welcome}</p>`,
    'sections[0][content_json]': JSON.stringify({ type: 'doc', content: [] }),
    'sections[1][kind]': 'activities',
    'sections[1][pos]': '1',
    'sections[2][kind]': 'events',
    'sections[2][pos]': '2',
  }
}

function activitiesFields(title: string): Record<string, string> {
  const editorId = 'activities_intro_cache'
  return {
    slug: 'activities',
    title,
    activities_layout: 'grid',
    'sections[0][kind]': 'activities',
    'sections[0][pos]': '0',
    'sections[0][content_id]': editorId,
    'content_html[activities_intro_cache]': `<p>${title}</p>`,
    'content_json[activities_intro_cache]': JSON.stringify({ type: 'doc', content: [] }),
    'activities[0][title]': 'Cached Activities',
    'activities[0][pos]': '0',
    'activities[0][description_id]': 'activity_desc_cache',
    'content_html[activity_desc_cache]': '<p>Cache hit</p>',
    'content_json[activity_desc_cache]': JSON.stringify({ type: 'doc', content: [] }),
  }
}

async function resetDatabase(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

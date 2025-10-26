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
const CSRF_TOKEN = 'test-csrf-token'
const PUBLIC_ORIGIN = 'https://example.com'

let app: Hono
let env: Bindings

describe('pages end-to-end flows', () => {
  let adminToken: string
  let fetchSpy: ReturnType<typeof issueAdminToken>['fetchSpy'] | null

  beforeAll(() => {
    app = new Hono()
    app.route('/', routes)
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

  it('creates, previews, and publishes landing page with matching public HTML', async () => {
    const saveRes = await submitSave('/admin/landing/save', landingFields('Welcome pilgrims'), adminToken)
    expect(saveRes.status).toBe(200)
    const saveJson = await saveRes.json()
    expect(saveJson.version).toBe(1)

    const previewHtml = await fetchPreview('/preview/landing', adminToken)

    const publishRes = await submitPublish('/admin/landing/publish', adminToken)
    expect(publishRes.status).toBe(200)
    const publishJson = await publishRes.json()
    expect(publishJson.version).toBe(1)

    const publicHtml = await fetchPublic(`/landing/${publishJson.pageId}`)
    expect(publicHtml).toBe(previewHtml)
    expect(publicHtml).toContain('Welcome pilgrims')
  })

  it('keeps public content unchanged until republish after new preview save', async () => {
    // Publish initial version
    await submitSave('/admin/landing/save', landingFields('Version one'), adminToken)
    const firstPublish = await submitPublish('/admin/landing/publish', adminToken)
    const { pageId, version: publishedVersion } = await firstPublish.json()
    expect(publishedVersion).toBe(1)

    const publicBefore = await fetchPublic(`/landing/${pageId}`)
    expect(publicBefore).toContain('Version one')

    // Save new preview without publishing
    await submitSave('/admin/landing/save', landingFields('Draft version two'), adminToken)
    const previewHtml = await fetchPreview('/preview/landing', adminToken)
    expect(previewHtml).toContain('Draft version two')

    const publicAfter = await fetchPublic(`/landing/${pageId}`)
    expect(publicAfter).toContain('Version one')
    expect(publicAfter).not.toContain('Draft version two')
  })

  it('publishes activities page with configured order and layout', async () => {
    const saveRes = await submitSave(
      '/admin/activities/save',
      activitiesFields([
        {
          title: 'Second Activity',
          pos: 1,
          descriptionHtml: '<p>Second description</p>',
        },
        {
          title: 'First Activity',
          pos: 0,
          descriptionHtml: '<p>First description</p>',
        },
      ]),
      adminToken,
    )
    const saveJson = await saveRes.json()
    expect(saveJson.version).toBe(1)

    const publishRes = await submitPublish('/admin/activities/publish', adminToken)
    const publishJson = await publishRes.json()
    const publicHtml = await fetchPublic(`/activities/${publishJson.pageId}`)
    expect(publicHtml).toContain('data-layout="carousel"')
    expect(publicHtml.indexOf('First Activity')).toBeLessThan(publicHtml.indexOf('Second Activity'))
  })

  it('publishes events page with sorted upcoming events', async () => {
    const saveRes = await submitSave(
      '/admin/events/save',
      eventsFields([
        {
          title: 'Later Event',
          pos: 0,
          startDate: '2030-06-01',
          descriptionHtml: '<p>Later event</p>',
        },
        {
          title: 'Soon Event',
          pos: 1,
          startDate: '2030-01-01',
          descriptionHtml: '<p>Soon event</p>',
        },
      ]),
      adminToken,
    )
    const saveJson = await saveRes.json()
    expect(saveJson.version).toBe(1)

    const previewHtml = await fetchPreview('/preview/events', adminToken)
    expect(previewHtml.indexOf('Soon Event')).toBeLessThan(previewHtml.indexOf('Later Event'))

    const publishRes = await submitPublish('/admin/events/publish', adminToken)
    const publishJson = await publishRes.json()
    const publicHtml = await fetchPublic(`/events/${publishJson.pageId}`)
    expect(publicHtml.indexOf('Soon Event')).toBeLessThan(publicHtml.indexOf('Later Event'))
  })

  it('maintains version semantics across save and publish cycles', async () => {
    const first = await submitSave('/admin/activities/save', activitiesFields([], 'First Title'), adminToken)
    expect((await first.json()).version).toBe(1)

    const second = await submitSave('/admin/activities/save', activitiesFields([], 'Second Title'), adminToken)
    const secondJson = await second.json()
    expect(secondJson.version).toBe(2)

    const publish = await submitPublish('/admin/activities/publish', adminToken)
    const publishJson = await publish.json()
    expect(publishJson.version).toBe(2)

    const third = await submitSave('/admin/activities/save', activitiesFields([], 'Third Title'), adminToken)
    const thirdJson = await third.json()
    expect(thirdJson.version).toBe(3)

    const publicHtml = await fetchPublic(`/activities/${publishJson.pageId}`)
    expect(publicHtml).toContain('Second Title')
    expect(publicHtml).not.toContain('Third Title')
  })
})

async function submitSave(path: string, fields: Record<string, string>, token: string) {
  const params = new URLSearchParams({
    csrf_token: CSRF_TOKEN,
    ...fields,
  })

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
  const params = new URLSearchParams({
    csrf_token: CSRF_TOKEN,
  })

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

async function fetchPreview(path: string, token: string): Promise<string> {
  const headers = new Headers({
    Cookie: buildCookieHeader(adminCookies(token)),
    Host: 'admin.example.com',
    'cf-connecting-ip': '1.1.1.1',
  })
  const res = await appFetch(path, { headers })
  expect(res.status).toBe(200)
  const html = await res.text()
  return normalizeHtml(html)
}

async function fetchPublic(path: string): Promise<string> {
  const res = await appFetch(path, { origin: PUBLIC_ORIGIN })
  expect(res.status).toBe(200)
  const html = await res.text()
  return normalizeHtml(html)
}

async function appFetch(path: string, init: RequestInit & { origin?: string } = {}): Promise<Response> {
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

function normalizeHtml(html: string): string {
  const start = html.indexOf('<main')
  if (start === -1) {
    return html.trim()
  }
  return html.slice(start).trim()
}

function landingFields(welcome: string): Record<string, string> {
  return {
    slug: 'landing',
    title: 'Temple Landing',
    hero_image_key: 'landing-hero.jpg',
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

type ActivitySeed = {
  title: string
  pos: number
  descriptionHtml: string
}

function activitiesFields(
  activities: ActivitySeed[],
  title = 'Retreat Activities',
): Record<string, string> {
  const params: Record<string, string> = {
    slug: 'activities',
    title,
    activities_layout: 'carousel',
    'sections[0][kind]': 'activities',
    'sections[0][pos]': '0',
    'sections[0][content_id]': 'activities_intro',
    'content_html[activities_intro]': '<p>Activities intro</p>',
    'content_json[activities_intro]': JSON.stringify({ type: 'doc', content: [] }),
  }

  activities.forEach((activity, index) => {
    const editorId = `activity_desc_e2e_${index}`
    params[`activities[${index}][title]`] = activity.title
    params[`activities[${index}][pos]`] = String(activity.pos)
    params[`activities[${index}][description_id]`] = editorId
    params[`content_html[${editorId}]`] = activity.descriptionHtml
    params[`content_json[${editorId}]`] = JSON.stringify({ type: 'doc', content: [] })
  })

  return params
}

type EventSeed = {
  title: string
  pos: number
  startDate: string
  descriptionHtml: string
}

function eventsFields(events: EventSeed[]): Record<string, string> {
  const params: Record<string, string> = {
    slug: 'events',
    title: 'Temple Events',
    events_hide_past: '1',
    'sections[0][kind]': 'events',
    'sections[0][pos]': '0',
    'sections[0][content_id]': 'events_intro',
    'content_html[events_intro]': '<p>Events intro</p>',
    'content_json[events_intro]': JSON.stringify({ type: 'doc', content: [] }),
  }

  events.forEach((event, index) => {
    const editorId = `event_desc_e2e_${index}`
    params[`events[${index}][title]`] = event.title
    params[`events[${index}][pos]`] = String(event.pos)
    params[`events[${index}][start_date]`] = event.startDate
    params[`events[${index}][description_id]`] = editorId
    params[`content_html[${editorId}]`] = event.descriptionHtml
    params[`content_json[${editorId}]`] = JSON.stringify({ type: 'doc', content: [] })
  })

  return params
}

async function clearPageTables(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

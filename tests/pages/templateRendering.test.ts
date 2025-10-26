/** @jsxImportSource hono/jsx */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import routes from '../../src/routes'
import type { Bindings } from '../../src/bindings'
import { createIntegrationEnv, issueAdminToken, buildCookieHeader, ADMIN_ORIGIN } from '../integration/editor.helpers'
import { PreviewRepo, type PreviewPageInput } from '../../src/repositories/previewRepo'
import { PublishRepo } from '../../src/repositories/publishRepo'

describe('shared page templates', () => {
  let app: Hono
  let env: Bindings

  beforeAll(() => {
    app = new Hono()
    app.route('/', routes)
  })

  beforeEach(async () => {
    env = createIntegrationEnv()
    await clearPageTables(env)
  })

  afterEach(() => {
    if ((globalThis.fetch as any)?.mockRestore) {
      ;(globalThis.fetch as any).mockRestore()
    }
    vi.useRealTimers()
  })

  it('renders landing page with hero, donate button, sections, activities, and events', async () => {
    const { publish } = await saveAndPublish(env, {
      slug: 'landing',
      title: 'Maa Nanda Temple',
      heroImageKey: 'landing-hero.jpg',
      donateEnabled: true,
      sections: [
        { kind: 'welcome', pos: 0, contentHtml: '<p>Welcome pilgrims</p>' },
        {
          kind: 'activities',
          pos: 1,
          contentHtml: '<p>Featured activities</p>',
          configJson: JSON.stringify({ activities_layout: 'grid' }),
        },
        {
          kind: 'events',
          pos: 2,
          contentHtml: '<p>Preview upcoming events</p>',
          configJson: JSON.stringify({ events_hide_past: false }),
        },
      ],
      activities: [
        { title: 'Morning Yoga', pos: 0, descriptionHtml: '<p>Start the day with guided yoga.</p>' },
      ],
      events: [
        {
          title: 'Festival of Lights',
          pos: 0,
          startDate: '2030-01-05',
          descriptionHtml: '<p>Celebrate with us.</p>',
        },
      ],
    })

    const res = await app.fetch(new Request(`https://example.com/landing/${publish.page.id}`), env as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Maa Nanda Temple')
    expect(html).toContain('href="/donate"')
    expect(html).toContain('Welcome pilgrims')
    expect(html).toContain('Featured activities')
    expect(html).toContain('Morning Yoga')
    expect(html).toContain('Festival of Lights')
    expect(html).toContain('src="/media/landing-hero.jpg"')
  })

  it('respects activities layout config and item ordering', async () => {
    const { publish } = await saveAndPublish(env, {
      slug: 'activities',
      title: 'Ashram Activities',
      heroImageKey: null,
      donateEnabled: false,
      sections: [
        {
          kind: 'activities',
          pos: 0,
          contentHtml: '<p>Choose your experience.</p>',
          configJson: JSON.stringify({ activities_layout: 'carousel' }),
        },
      ],
      activities: [
        { title: 'Meditation Circle', pos: 2, descriptionHtml: '<p>Meditate together</p>' },
        { title: 'Herbal Workshop', pos: 1, descriptionHtml: '<p>Learn ancient remedies</p>' },
      ],
      events: [],
    })

    const res = await app.fetch(new Request(`https://example.com/activities/${publish.page.id}`), env as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('data-layout="carousel"')
    const firstIndex = html.indexOf('Herbal Workshop')
    const secondIndex = html.indexOf('Meditation Circle')
    expect(firstIndex).toBeGreaterThan(-1)
    expect(secondIndex).toBeGreaterThan(-1)
    expect(firstIndex).toBeLessThan(secondIndex)
  })

  it('sorts events by start_date and hides past events when configured', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'))

    const { publish } = await saveAndPublish(env, {
      slug: 'events',
      title: 'Trust Events',
      heroImageKey: null,
      donateEnabled: false,
      sections: [
        {
          kind: 'events',
          pos: 0,
          contentHtml: '<p>Stay informed about temple gatherings.</p>',
          configJson: JSON.stringify({ events_hide_past: true }),
        },
      ],
      activities: [],
      events: [
        {
          title: 'Winter Retreat',
          pos: 0,
          startDate: '2024-12-20',
          endDate: '2024-12-22',
          descriptionHtml: '<p>Past event should be hidden.</p>',
        },
        {
          title: 'Spring Cleanse',
          pos: 1,
          startDate: '2025-02-10',
          descriptionHtml: '<p>Upcoming cleanse workshop.</p>',
        },
        {
          title: 'New Year Blessings',
          pos: 2,
          startDate: '2025-01-03',
          descriptionHtml: '<p>Special blessings to start the year.</p>',
        },
      ],
    })

    const res = await app.fetch(new Request(`https://example.com/events/${publish.page.id}`), env as any)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).not.toContain('Winter Retreat')
    const firstIndex = html.indexOf('New Year Blessings')
    const secondIndex = html.indexOf('Spring Cleanse')
    expect(firstIndex).toBeGreaterThan(-1)
    expect(secondIndex).toBeGreaterThan(-1)
    expect(firstIndex).toBeLessThan(secondIndex)
  })

  it('renders identical HTML for preview and public routes with the same data', async () => {
    const { publish } = await saveAndPublish(env, {
      slug: 'activities',
      title: 'Daily Programs',
      heroImageKey: null,
      donateEnabled: false,
      sections: [
        {
          kind: 'activities',
          pos: 0,
          contentHtml: '<p>Programs for all ages.</p>',
          configJson: JSON.stringify({ activities_layout: 'grid' }),
        },
      ],
      activities: [
        { title: 'Sunrise Chanting', pos: 0, descriptionHtml: '<p>Start your day with mantra.</p>' },
      ],
      events: [],
    })

    const { token } = await issueAdminToken(['admin'])
    const cookieHeader = buildCookieHeader({
      '__Host-access_token': token,
      '__Host-csrf': 'csrf-token',
    })

    const previewHeaders = new Headers({
      Cookie: cookieHeader,
      Host: 'admin.example.com',
      'cf-connecting-ip': '1.1.1.1',
    })

    const previewRes = await app.fetch(
      new Request(`${ADMIN_ORIGIN}/preview/activities`, { headers: previewHeaders }),
      env as any,
    )
    expect(previewRes.status).toBe(200)

    const publicRes = await app.fetch(
      new Request(`https://example.com/activities/${publish.page.id}`),
      env as any,
    )
    expect(publicRes.status).toBe(200)

    const previewHtml = normalizeHtml(await previewRes.text())
    const publicHtml = normalizeHtml(await publicRes.text())
    expect(previewHtml).toBe(publicHtml)
  })
})

async function saveAndPublish(env: Bindings, input: PreviewPageInput) {
  const previewRepo = new PreviewRepo(env)
  const preview = await previewRepo.saveDraft(input)
  const publishRepo = new PublishRepo(env)
  const publish = await publishRepo.publishFromPreview(preview)
  return { preview, publish }
}

async function clearPageTables(env: Bindings) {
  const tables = ['sections', 'activities', 'events', 'pages']
  for (const table of tables) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
}

function normalizeHtml(html: string): string {
  const start = html.indexOf('<main')
  if (start === -1) {
    return html.trim()
  }
  return html.slice(start).trim()
}

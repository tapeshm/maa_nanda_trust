/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { assertPageSlug, type PageSlug } from '../../config/pages'
import { ensureCsrf } from '../../middleware/csrf'
import { PreviewRepo } from '../../repositories/previewRepo'
import { ActivitiesList } from '../../templates/admin/activitiesForm'
import { EventsList } from '../../templates/admin/eventsForm'
import { mapActivities, mapEvents } from './pageHelpers'

// [D3:pages.step-04:admin-items-router] HTMX endpoints for managing nested page items.
const itemsRoutes = new Hono<{ Bindings: Bindings }>()

itemsRoutes.post('/:slug/items', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  if (!isRepeatableSlug(slug)) {
    return c.json({ ok: false, error: 'Unsupported slug' }, 400)
  }

  const params = await readFormParams(c)
  const pageId = await resolvePageId(slug, params, c.env)
  if (!pageId) {
    return c.json({ ok: false, error: 'Missing page context' }, 400)
  }

  const env = c.env
  const { table } = tableOptions(slug)
  const nextPos = await nextPosition(env, table, pageId)
  const title = slug === 'activities' ? 'Untitled activity' : 'Untitled event'

  if (slug === 'activities') {
    await env.DB.prepare(
      `INSERT INTO activities (page_id, title, pos)
       VALUES (?, ?, ?)`,
    )
      .bind(pageId, title, nextPos)
      .run()
  } else {
    await env.DB.prepare(
      `INSERT INTO events (page_id, title, pos)
       VALUES (?, ?, ?)`,
    )
      .bind(pageId, title, nextPos)
      .run()
  }

  const csrfToken = ensureCsrf(c)
  const repo = new PreviewRepo(c.env)
  const snapshot = await repo.getById(pageId)
  const fragment =
    slug === 'activities'
      ? <ActivitiesList items={mapActivities(snapshot)} csrfToken={csrfToken} />
      : <EventsList items={mapEvents(snapshot)} csrfToken={csrfToken} />

  return c.html(fragment)
})

itemsRoutes.delete('/:slug/items/:itemId', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  if (!isRepeatableSlug(slug)) {
    return c.json({ ok: false, error: 'Unsupported slug' }, 400)
  }

  const itemId = Number.parseInt(c.req.param('itemId'), 10)
  if (!Number.isFinite(itemId)) {
    return c.json({ ok: false, error: 'Invalid item id' }, 400)
  }

  const env = c.env
  const { table } = tableOptions(slug)
  const lookup = await env.DB.prepare(`SELECT page_id FROM ${table} WHERE id = ? LIMIT 1`).bind(itemId).all<{ page_id: number }>()
  const pageId = lookup.results?.[0]?.page_id ?? null

  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(itemId).run()

  if (!pageId) {
    return c.html('', 200)
  }

  const csrfToken = ensureCsrf(c)
  const repo = new PreviewRepo(c.env)
  const snapshot = await repo.getById(pageId)
  const fragment =
    slug === 'activities'
      ? <ActivitiesList items={mapActivities(snapshot)} csrfToken={csrfToken} />
      : <EventsList items={mapEvents(snapshot)} csrfToken={csrfToken} />

  return c.html(fragment)
})

itemsRoutes.post('/:slug/items/reorder', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  if (!isRepeatableSlug(slug)) {
    return c.json({ ok: false, error: 'Unsupported slug' }, 400)
  }

  const params = await readFormParams(c)
  const pageId = await resolvePageId(slug, params, c.env)
  if (!pageId) {
    return c.json({ ok: false, error: 'Missing page context' }, 400)
  }

  const orderValues = [...params.getAll('order'), ...params.getAll('order[]')]
  const ids = normalizeOrderIds(orderValues)
  const env = c.env
  const { table } = tableOptions(slug)

  await Promise.all(
    ids.map((id, index) =>
      env.DB.prepare(`UPDATE ${table} SET pos = ? WHERE id = ? AND page_id = ?`)
        .bind(index, id, pageId)
        .run(),
    ),
  )

  const csrfToken = ensureCsrf(c)
  const repo = new PreviewRepo(c.env)
  const snapshot = await repo.getById(pageId)
  const fragment =
    slug === 'activities'
      ? <ActivitiesList items={mapActivities(snapshot)} csrfToken={csrfToken} />
      : <EventsList items={mapEvents(snapshot)} csrfToken={csrfToken} />

  return c.html(fragment)
})

export default itemsRoutes

function isRepeatableSlug(slug: PageSlug): slug is 'activities' | 'events' {
  return slug === 'activities' || slug === 'events'
}

function tableOptions(slug: 'activities' | 'events'): { table: string } {
  if (slug === 'activities') return { table: 'activities' }
  return { table: 'events' }
}

async function nextPosition(env: Bindings, table: string, pageId: number): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(MAX(pos), -1) + 1 AS next_pos FROM ${table} WHERE page_id = ?`,
  )
    .bind(pageId)
    .all<{ next_pos: number }>()
  const value = results?.[0]?.next_pos ?? 0
  return typeof value === 'number' ? value : Number(value) || 0
}

async function resolvePageId(
  slug: 'activities' | 'events',
  params: URLSearchParams,
  env: Bindings,
): Promise<number | null> {
  const raw = params.get('page_id') ?? params.get('pageId')
  const pageId = raw !== null ? Number.parseInt(String(raw), 10) : NaN
  if (Number.isFinite(pageId) && pageId > 0) {
    return pageId
  }
  const repo = new PreviewRepo(env)
  const latest = await repo.getLatest(slug)
  return latest?.page.id ?? null
}

function normalizeOrderIds(values: string[]): number[] {
  return values
    .flatMap((value) => value.split(',').map((part) => Number.parseInt(part, 10)))
    .filter((parsed) => Number.isFinite(parsed) && parsed > 0)
}

async function readFormParams(c: any): Promise<URLSearchParams> {
  const clone = c.req.raw.clone()
  const text = await clone.text()
  return new URLSearchParams(text)
}

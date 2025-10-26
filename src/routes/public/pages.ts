import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import type { Bindings } from '../../bindings'
import { isPageSlug, type PageSlug } from '../../config/pages'
import { PublishRepo, type PublishSnapshot } from '../../repositories/publishRepo'
import {
  computeHtmlEtag,
  getCachedHtml,
  getLandingPointer,
  getPageVersion,
  putCachedHtml,
  PUBLIC_CACHE_CONTROL,
} from '../../utils/pages/cache'
import { renderPublishedHtml } from '../../utils/pages/render'
import { renderLandingEmptyState } from '../../templates/landingTemplate'

// [D3:pages.step-03:public-router] Public pages served from published snapshots with edge caching.
const publicPages = new Hono<{ Bindings: Bindings }>()

publicPages.get('/', async (c) => {
  const repo = new PublishRepo(c.env)
  const pointer = await getLandingPointer(c.env)

  if (pointer) {
    const cached = await getCachedHtml(c.env, 'landing', pointer.id, pointer.version)
    if (cached) {
      return respondWithHtml(c, cached)
    }

    const snapshot = await repo.getById(pointer.id)
    if (snapshot && snapshot.page.slug === 'landing') {
      const rendered = await renderAndCache(c.env, 'landing', snapshot)
      return respondWithHtml(c, rendered)
    }
  }

  const latest = await repo.getLatestForSlug('landing')
  if (!latest) {
    return respondWithEmptyLanding(c)
  }

  const rendered = await renderAndCache(c.env, 'landing', latest)
  return respondWithHtml(c, rendered)
})

publicPages.get('/:slug/:id', async (c, next: Next) => {
  const { slug, id } = c.req.param()
  if (!isPageSlug(slug)) {
    return next()
  }

  if (!/^\d+$/.test(id)) {
    return c.notFound()
  }

  const pageId = Number.parseInt(id, 10)
  const pointerVersion = await getPageVersion(c.env, slug, pageId)

  if (pointerVersion !== null) {
    const cached = await getCachedHtml(c.env, slug, pageId, pointerVersion)
    if (cached) {
      return respondWithHtml(c, cached)
    }
  }

  const repo = new PublishRepo(c.env)
  const snapshot = await repo.getById(pageId)
  if (!snapshot || snapshot.page.slug !== slug) {
    return c.notFound()
  }

  const rendered = await renderAndCache(c.env, slug, snapshot)
  return respondWithHtml(c, rendered)
})

export default publicPages

type HtmlPayload = { html: string; etag?: string | null }

async function renderAndCache(
  env: Bindings,
  slug: PageSlug,
  snapshot: PublishSnapshot,
): Promise<HtmlPayload> {
  const html = await renderPublishedHtml(slug, snapshot, { signedIn: false })
  const etag = await putCachedHtml(env, slug, snapshot.page.id, snapshot.page.version, html)
  return { html, etag }
}

async function respondWithHtml(c: Context<{ Bindings: Bindings }>, payload: HtmlPayload) {
  const etag = payload.etag ?? (await computeHtmlEtag(payload.html))
  if (etagMatches(c.req.header('If-None-Match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: buildCacheHeaders(etag),
    })
  }
  const res = c.html(payload.html)
  const headers = buildCacheHeaders(etag)
  headers.forEach((value, key) => res.headers.set(key, value))
  return res
}

async function respondWithEmptyLanding(c: Context<{ Bindings: Bindings }>) {
  c.header('Cache-Control', 'no-store')
  return c.html(await renderLandingEmptyState({ signedIn: false }))
}

function buildCacheHeaders(etag: string): Headers {
  const headers = new Headers()
  headers.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  headers.set('ETag', etag)
  return headers
}

function etagMatches(header: string | undefined, etag: string): boolean {
  if (!header) return false
  const candidates = header
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return candidates.includes(etag)
}

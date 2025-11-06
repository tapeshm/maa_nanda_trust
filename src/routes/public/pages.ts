import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import type { Bindings } from '../../bindings'
import { isPageSlug, type PageSlug } from '../../config/pages'
import { PublishRepo, type PublishSnapshot } from '../../repositories/publishRepo'
import {
  computeHtmlEtag,
  getCachedHtml,
  getPageVersion,
  putCachedHtml,
  PUBLIC_CACHE_CONTROL,
} from '../../utils/pages/cache'
import { renderPublishedHtml } from '../../utils/pages/render'

//TODO: Remove when bypass logic is removed
import { ensureCsrf } from '../../middleware/csrf'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../templates/public/pages/landing'
import AboutPage from '../../templates/public/pages/about'

// [D3:pages.step-03:public-router] Public pages served from published snapshots with edge caching.
const publicPages = new Hono<{ Bindings: Bindings }>()

publicPages.get('/', async (c) => {
  ensureCsrf(c)
  const html = renderToString(LandingPage({}))
  return c.html(html)
})

publicPages.get('/about', (c) => {
  ensureCsrf(c)
  const html = renderToString(AboutPage({}))
  return c.html(html)
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

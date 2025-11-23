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
import { attachAuthContext } from '../../middleware/auth'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../templates/public/pages/landing'
import AboutPage from '../../templates/public/pages/about'
import EventsPage from '../../templates/public/pages/EventsPage'
import ProjectsPage from '../../templates/public/pages/ProjectsPage'
import ProjectDetailPage from '../../templates/public/pages/ProjectDetailPage'
import EventDetailPage from '../../templates/public/pages/EventDetailPage'
import TransparencyPage from '../../templates/public/pages/TransparencyPage'
import DonatePage from '../../templates/public/pages/DonatePage'
import { getProjects, getProjectById } from '../../data/projects.data';
import { getEvents, getEventById } from '../../data/events.data';
import { getLandingContent } from '../../data/landing.data';
import { getAboutContent } from '../../data/about.data';
import { getTransparencyContent } from '../../data/transparency.data';
import { getDonateContent } from '../../data/donate.data';

// [D3:pages.step-03:public-router] Public pages served from published snapshots with edge caching.
const publicPages = new Hono<{ Bindings: Bindings }>()

publicPages.use('*', attachAuthContext())

publicPages.get('/', async (c) => {
  ensureCsrf(c)
  const projects = await getProjects(c.env)
  const events = await getEvents(c.env)
  const landingContent = await getLandingContent(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  
  const html = renderToString(LandingPage({ projects, events, landingContent, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/about', async (c) => {
  ensureCsrf(c)
  const aboutContent = await getAboutContent(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  const html = renderToString(AboutPage({ aboutContent, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/donate', async (c) => {
  ensureCsrf(c)
  const donateContent = await getDonateContent(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  const html = renderToString(DonatePage({ donateContent, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/events', async (c) => {
  ensureCsrf(c)
  const events = await getEvents(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  const html = renderToString(EventsPage({ events: events, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/projects', async (c) => {
  ensureCsrf(c)
  const projects = await getProjects(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  const html = renderToString(ProjectsPage({ projects: projects, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/transparency', async (c) => {
  ensureCsrf(c)
  const transparencyContent = await getTransparencyContent(c.env)
  const isLoggedIn = !!c.get('auth')?.userId
  const html = renderToString(TransparencyPage({ transparencyContent, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/projects/:id', async (c) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  const project = await getProjectById(c.env, id)
  const isLoggedIn = !!c.get('auth')?.userId

  if (!project) {
    return c.notFound()
  }

  const html = renderToString(ProjectDetailPage({ project: project, isLoggedIn }))
  return c.html(html)
})

publicPages.get('/events/:id', async (c) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  const event = await getEventById(c.env, id)
  const isLoggedIn = !!c.get('auth')?.userId

  if (!event) {
    return c.notFound()
  }

  const html = renderToString(EventDetailPage({ event: event, isLoggedIn }))
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

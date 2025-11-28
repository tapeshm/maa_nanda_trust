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
  serveWithCache,
  buildCacheHeaders,
  etagMatches,
} from '../../utils/pages/cache'
import { renderPublishedHtml } from '../../utils/pages/render'

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
import { getProjects, getProjectById } from '../../data/projects.data'
import { getEvents, getEventById } from '../../data/events.data'
import { getLandingContent } from '../../data/landing.data'
import { getAboutContent } from '../../data/about.data'
import { getTransparencyContent } from '../../data/transparency.data'
import { getDonateContent } from '../../data/donate.data'

const publicPages = new Hono<{ Bindings: Bindings }>()

publicPages.use('*', attachAuthContext())

publicPages.get('/', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'landing', async () => {
    const projects = await getProjects(c.env)
    const events = await getEvents(c.env)
    const landingContent = await getLandingContent(c.env)
    return renderToString(LandingPage({ projects, events, landingContent }))
  })
})

publicPages.get('/about', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'about', async () => {
    const aboutContent = await getAboutContent(c.env)
    return renderToString(AboutPage({ aboutContent }))
  })
})

publicPages.get('/donate', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'donate', async () => {
    const donateContent = await getDonateContent(c.env)
    return renderToString(DonatePage({ donateContent }))
  })
})

publicPages.get('/events', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'events:list', async () => {
    const events = await getEvents(c.env)
    return renderToString(EventsPage({ events: events }))
  })
})

publicPages.get('/projects', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'projects:list', async () => {
    const projects = await getProjects(c.env)
    return renderToString(ProjectsPage({ projects: projects }))
  })
})

publicPages.get('/transparency', (c) => {
  ensureCsrf(c)
  return serveWithCache(c, 'transparency', async () => {
    const transparencyContent = await getTransparencyContent(c.env)
    return renderToString(TransparencyPage({ transparencyContent }))
  })
})

publicPages.get('/projects/:id', (c) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  return serveWithCache(c, `projects:detail:${id}`, async () => {
    const project = await getProjectById(c.env, id)

    if (!project) {
      return null
    }

    return renderToString(ProjectDetailPage({ project: project }))
  })
})

publicPages.get('/events/:id', (c) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  return serveWithCache(c, `events:detail:${id}`, async () => {
    const event = await getEventById(c.env, id)

    if (!event) {
      return null
    }

    return renderToString(EventDetailPage({ event: event }))
  })
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

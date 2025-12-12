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
import { type Language, DEFAULT_LANGUAGE } from '../../utils/i18n'

const publicPages = new Hono<{ Bindings: Bindings }>()

publicPages.use('*', attachAuthContext())

const renderLanding = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `landing:${lang}`, async () => {
    const projects = await getProjects(c.env, lang)
    const events = await getEvents(c.env, lang)
    const landingContent = await getLandingContent(c.env, lang)
    return renderToString(LandingPage({ projects, events, landingContent, lang, activePath: c.req.path }))
  })
}

const renderAbout = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `about:${lang}`, async () => {
    const aboutContent = await getAboutContent(c.env, lang)
    return renderToString(AboutPage({ aboutContent, lang, activePath: c.req.path }))
  })
}

const renderDonate = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `donate:${lang}`, async () => {
    const donateContent = await getDonateContent(c.env, lang)
    return renderToString(DonatePage({ donateContent, lang, activePath: c.req.path }))
  })
}

const renderTransparency = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `transparency:${lang}`, async () => {
    const transparencyContent = await getTransparencyContent(c.env, lang)
    return renderToString(TransparencyPage({ transparencyContent, lang, activePath: c.req.path }))
  })
}

const renderEvents = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `events:list:${lang}`, async () => {
    const events = await getEvents(c.env, lang)
    return renderToString(EventsPage({ events: events, lang, activePath: c.req.path }))
  })
}

const renderProjects = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  return serveWithCache(c, `projects:list:${lang}`, async () => {
    const projects = await getProjects(c.env, lang)
    return renderToString(ProjectsPage({ projects: projects, lang, activePath: c.req.path }))
  })
}

const renderProjectDetail = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  return serveWithCache(c, `projects:detail:${id}:${lang}`, async () => {
    const project = await getProjectById(c.env, id, lang)

    if (!project) {
      return null
    }

    return renderToString(ProjectDetailPage({ project: project, lang, activePath: c.req.path }))
  })
}

const renderEventDetail = (lang: Language) => (c: Context) => {
  ensureCsrf(c)
  const id = c.req.param('id')
  return serveWithCache(c, `events:detail:${id}:${lang}`, async () => {
    const event = await getEventById(c.env, id, lang)

    if (!event) {
      return null
    }

    return renderToString(EventDetailPage({ event: event, lang, activePath: c.req.path }))
  })
}

// English Routes
publicPages.get('/', renderLanding('en'))
publicPages.get('/about', renderAbout('en'))
publicPages.get('/donate', renderDonate('en'))
publicPages.get('/events', renderEvents('en'))
publicPages.get('/projects', renderProjects('en'))
publicPages.get('/transparency', renderTransparency('en'))
publicPages.get('/projects/:id', renderProjectDetail('en'))
publicPages.get('/events/:id', renderEventDetail('en'))

// Hindi Routes
publicPages.get('/hi', renderLanding('hi'))
publicPages.get('/hi/about', renderAbout('hi'))
publicPages.get('/hi/donate', renderDonate('hi'))
publicPages.get('/hi/events', renderEvents('hi'))
publicPages.get('/hi/projects', renderProjects('hi'))
publicPages.get('/hi/transparency', renderTransparency('hi'))
publicPages.get('/hi/projects/:id', renderProjectDetail('hi'))
publicPages.get('/hi/events/:id', renderEventDetail('hi'))

// Legacy Snapshot Routes (English only for now)
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
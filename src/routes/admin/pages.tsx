/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import Layout from '../../templates/layout'
import { EditorAssets } from '../../templates/components/editor'
import { assertPageSlug, PAGE_EDITOR_IDS, type PageSectionKind, type PageSlug } from '../../config/pages'
import { PreviewRepo, type PreviewSnapshot } from '../../repositories/previewRepo'
import { PublishRepo, type PublishSnapshot } from '../../repositories/publishRepo'
import type { JSONContent } from '@tiptap/core'
import LandingForm, { type LandingFormProps } from '../../templates/admin/landingForm'
import ActivitiesForm, {
  ActivitiesList,
  type ActivitiesFormProps,
} from '../../templates/admin/activitiesForm'
import EventsForm, { EventsList, type EventsFormProps } from '../../templates/admin/eventsForm'
import {
  EMPTY_CONTENT,
  parseJsonContent,
  resolveActivitiesLayout,
  resolveEventsHidePast,
  mapActivities,
  mapEvents,
} from './pageHelpers'

// [D3:pages.step-04:admin-router] Admin page editor routes with full forms and HTMX fragments.
const adminPages = new Hono<{ Bindings: Bindings }>()

adminPages.get('/:slug', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  const repo = new PreviewRepo(c.env)
  const snapshot = await repo.getLatest(slug)
  const csrfToken = ensureCsrf(c)
  const signedIn = Boolean((c.get('auth') as any)?.claims)

  const extraHead = <EditorAssets />

  let body: ReturnType<typeof LandingForm>
  if (slug === 'landing') {
    const landing = buildLandingFormProps(slug, snapshot, csrfToken)
    const versionParam = c.req.query('version') ?? (snapshot ? String(snapshot.page.version) : undefined)
    const pageIdParam = c.req.query('pageId') ?? (snapshot ? String(snapshot.page.id) : undefined)
    const statusBanner = renderLandingStatusBanner({
      slug,
      saved: c.req.query('saved') === '1',
      published: c.req.query('published') === '1',
      error: c.req.query('error') === '1',
      message: c.req.query('message') ?? undefined,
      version: versionParam,
      pageId: pageIdParam,
    })
    body = (
      <section class="mx-auto max-w-4xl space-y-6 py-8">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-50">Landing page</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Manage hero content and welcome copy. Published content is controlled by preview/publish actions.
          </p>
        </header>
        {statusBanner}
        <LandingForm {...landing} />
      </section>
    )
  } else if (slug === 'activities') {
    const activities = buildActivitiesFormProps(slug, snapshot, csrfToken)
    body = (
      <section class="mx-auto max-w-5xl space-y-6 py-8">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-50">Activities page</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Curate activities, choose layout, and edit intro content. Use HTMX controls to add, remove, or refresh items.
          </p>
        </header>
        <ActivitiesForm {...activities} />
      </section>
    )
  } else {
    const events = buildEventsFormProps(slug, snapshot, csrfToken)
    body = (
      <section class="mx-auto max-w-5xl space-y-6 py-8">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-50">Events page</h1>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            List upcoming events with optional images and dates. Descriptions support rich text editing.
          </p>
        </header>
        <EventsForm {...events} />
      </section>
    )
  }

  return c.html(
    <Layout
      title={`Admin • ${capitalize(slug)}`}
      admin={true}
      signedIn={signedIn}
      csrfToken={csrfToken}
      extraHead={extraHead}
    >
      {body}
    </Layout>,
  )
})

// Fragment endpoints used by HTMX; reuse form list renderers so indexes remain consistent.
adminPages.get('/:slug/items/fragment', requireAuth(), requireAdmin, async (c) => {
  const slug = assertPageSlug(c.req.param('slug'))
  const repo = new PreviewRepo(c.env)
  const snapshot = await repo.getLatest(slug)
  const csrfToken = ensureCsrf(c)

  if (slug === 'activities') {
    const items = mapActivities(snapshot)
    return c.html(<ActivitiesList items={items} csrfToken={csrfToken} />)
  }
  if (slug === 'events') {
    const items = mapEvents(snapshot)
    return c.html(<EventsList items={items} csrfToken={csrfToken} />)
  }

  return c.newResponse(null, { status: 204 })
})

export default adminPages

function buildLandingFormProps(slug: PageSlug, snapshot: PreviewSnapshot | null, csrfToken: string): LandingFormProps {
  const editorId = PAGE_EDITOR_IDS[slug]
  const sectionOrder: Array<{ kind: PageSectionKind; pos: number; contentId?: string | null }> = [
    { kind: 'welcome', pos: 0, contentId: editorId },
    { kind: 'activities', pos: 1 },
    { kind: 'events', pos: 2 },
  ]

  let title = ''
  let heroImageKey: string | null = null
  let donateEnabled = false
  let html = ''
  let json: JSONContent = EMPTY_CONTENT

  if (snapshot) {
    title = snapshot.page.title
    heroImageKey = snapshot.page.heroImageKey
    donateEnabled = snapshot.page.donateEnabled
    const welcomeSection = snapshot.sections.find((section) => section.kind === 'welcome')
    if (welcomeSection) {
      html = welcomeSection.contentHtml ?? ''
      json = parseJsonContent(welcomeSection.contentJson)
      sectionOrder[0] = {
        kind: 'welcome',
        pos: welcomeSection.pos,
        contentId: editorId,
      }
    }

    const activitySection = snapshot.sections.find((section) => section.kind === 'activities')
    if (activitySection) {
      sectionOrder[1] = {
        kind: 'activities',
        pos: activitySection.pos,
      }
    }

    const eventsSection = snapshot.sections.find((section) => section.kind === 'events')
    if (eventsSection) {
      sectionOrder[2] = {
        kind: 'events',
        pos: eventsSection.pos,
      }
    }
  }

  return {
    csrfToken,
    action: `/admin/${slug}/save`,
    title,
    heroImageKey,
    donateEnabled,
    sections: sectionOrder,
    editor: {
      id: editorId,
      html,
      json,
    },
  }
}

function renderLandingStatusBanner(params: {
  slug: PageSlug
  saved: boolean
  published: boolean
  error: boolean
  message?: string
  version?: string
  pageId?: string
}) {
  const { slug, saved, published, error, message, version, pageId } = params

  if (error) {
    return (
      <div class="rounded-lg border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-100">
        <p class="font-semibold">We couldn't save your changes</p>
        <p class="mt-1 text-xs text-rose-700/80 dark:text-rose-200/80">{message ?? 'Please review the form, fix any issues, and try again.'}</p>
      </div>
    )
  }

  if (published) {
    const versionLabel = version ? `Version ${version}` : 'Latest version'
    const publicUrl = pageId ? `/${slug}/${pageId}` : null
    return (
      <div class="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold">{versionLabel} published successfully</p>
            <p class="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
              Your changes are now live. You can continue editing anytime.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            {publicUrl ? (
              <a
                href={publicUrl}
                class="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                View live page
              </a>
            ) : null}
            <a
              href={`/preview/${slug}`}
              class="inline-flex items-center rounded-md border border-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              Preview again
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (saved) {
    const versionLabel = version ? `Version ${version}` : 'Draft saved'
    return (
      <div class="rounded-lg border border-indigo-200 bg-indigo-50/80 p-4 text-sm text-indigo-900 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-100">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold">{versionLabel}</p>
            <p class="mt-1 text-xs text-indigo-700/80 dark:text-indigo-200/80">Review the preview to confirm everything looks right.</p>
          </div>
          <div>
            <a
              href={`/preview/${slug}`}
              class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Preview latest draft
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function buildActivitiesFormProps(
  slug: PageSlug,
  snapshot: PreviewSnapshot | null,
  csrfToken: string,
): ActivitiesFormProps {
  const editorId = PAGE_EDITOR_IDS[slug]
  let title = ''
  let layout: 'grid' | 'carousel' = 'grid'
  let html = ''
  let json: JSONContent = EMPTY_CONTENT
  let sectionPos = 0
  const items = mapActivities(snapshot)

  if (snapshot) {
    title = snapshot.page.title
    const section = snapshot.sections.find((s) => s.kind === 'activities')
    if (section) {
      html = section.contentHtml ?? ''
      json = parseJsonContent(section.contentJson)
      layout = resolveActivitiesLayout(section)
      sectionPos = section.pos
    }
  }

  const configJson = JSON.stringify({ activities_layout: layout })

  return {
    csrfToken,
    action: `/admin/${slug}/save`,
    addAction: `/admin/${slug}/items`,
    reorderAction: `/admin/${slug}/items/reorder`,
    pageId: snapshot?.page.id ?? null,
    title,
    layout,
    section: {
      kind: 'activities',
      pos: sectionPos,
      contentId: editorId,
      configJson,
    },
    introEditor: {
      id: editorId,
      html,
      json,
    },
    items,
  }
}

function buildEventsFormProps(
  slug: PageSlug,
  snapshot: PreviewSnapshot | null,
  csrfToken: string,
): EventsFormProps {
  const editorId = PAGE_EDITOR_IDS[slug]
  let title = ''
  let html = ''
  let json: JSONContent = EMPTY_CONTENT
  let sectionPos = 0
  let configJson = JSON.stringify({ events_hide_past: false })
  let hidePast = false
  const items = mapEvents(snapshot)
  if (snapshot) {
    title = snapshot.page.title
    const section = snapshot.sections.find((s) => s.kind === 'events')
    if (section) {
      html = section.contentHtml ?? ''
      json = parseJsonContent(section.contentJson)
      sectionPos = section.pos
      hidePast = resolveEventsHidePast(section)
      configJson = section.configJson ?? JSON.stringify({ events_hide_past: hidePast })
    }
  }

  return {
    csrfToken,
    action: `/admin/${slug}/save`,
    addAction: `/admin/${slug}/items`,
    reorderAction: `/admin/${slug}/items/reorder`,
    pageId: snapshot?.page.id ?? null,
    title,
    section: {
      kind: 'events',
      pos: sectionPos,
      contentId: editorId,
      configJson,
    },
    introEditor: {
      id: editorId,
      html,
      json,
    },
    hidePast,
    items,
  }
}

function capitalize(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

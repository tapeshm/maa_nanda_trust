/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { assertPageSlug, PAGE_SLUGS, type PageSlug } from '../../config/pages'
import { PreviewRepo, type PreviewSnapshot } from '../../repositories/previewRepo'
import { renderLanding } from '../../templates/landingTemplate'
import { renderActivitiesPage } from '../../templates/activitiesTemplate'
import { renderEventsPage } from '../../templates/eventsTemplate'
import { renderGenericPage } from '../../templates/genericPageTemplate'
import { PublishRepo } from '../../repositories/publishRepo'
import { renderPublishedHtml } from '../../utils/pages/render'

// [D3:pages.step-05:preview-renderer] Render preview pages with shared SSR templates.
const previewPages = new Hono<{ Bindings: Bindings }>()

type PreviewRenderOptions = {
  signedIn?: boolean
  toolbar?: unknown
}

const RENDERERS: Record<PageSlug, (snapshot: PreviewSnapshot, options: PreviewRenderOptions) => ReturnType<typeof renderLanding>> = {
  landing: (snapshot, options) => renderLanding(snapshot, options),
  activities: (snapshot, options) => renderActivitiesPage(snapshot, options),
  events: (snapshot, options) => renderEventsPage(snapshot, options),
  about: (snapshot, options) => renderGenericPage(snapshot, options),
  transparency: (snapshot, options) => renderGenericPage(snapshot, options),
}

for (const slug of PAGE_SLUGS) {
  previewPages.get(`/${slug}`, requireAuth(), requireAdmin, async (c) => {
    const pageSlug = assertPageSlug(slug)
    const repo = new PreviewRepo(c.env)
    const snapshot = await repo.getLatest(pageSlug)
    if (!snapshot) {
      const publishRepo = new PublishRepo(c.env)
      const published = await publishRepo.getLatestForSlug(pageSlug)
      if (!published) {
        return c.notFound()
      }
      c.header('Cache-Control', 'no-store')
      const rendered = await renderPublishedHtml(pageSlug, published, { signedIn: true })
      return c.html(rendered)
    }

    const csrfToken = ensureCsrf(c)
    const toolbar = buildPreviewToolbar(pageSlug, snapshot, csrfToken)
    c.header('Cache-Control', 'no-store')
    //TODO: Don't hardcode signedIn=true
    return c.html(RENDERERS[pageSlug](snapshot, { signedIn: true, toolbar }))
  })
}

export default previewPages

function buildPreviewToolbar(slug: PageSlug, snapshot: PreviewSnapshot, csrfToken: string) {
  const publishAction = `/admin/${slug}/publish`
  const publishRedirect = `/admin/${slug}?published=1&pageId=${snapshot.page.id}&version=${snapshot.page.version}`
  const editHref = `/admin/${slug}`
  const versionLabel = `Version ${snapshot.page.version}`

  return (
    <>
      <div class="space-y-1">
        <p class="font-semibold">Previewing {titleForSlug(slug)}</p>
        <p class="text-xs text-indigo-700/80 dark:text-indigo-200/80">{versionLabel}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <form
          method="post"
          action={publishAction}
          hx-post={publishAction}
          hx-redirect={publishRedirect}
          hx-swap="none"
          class="inline-flex"
        >
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <button
            type="submit"
            class="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Publish now
          </button>
        </form>
        <a
          href={editHref}
          class="inline-flex items-center rounded-md border border-indigo-500 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
        >
          Continue editing
        </a>
      </div>
    </>
  )
}

function titleForSlug(slug: PageSlug): string {
  if (slug === 'landing') return 'Landing page'
  if (slug === 'activities') return 'Activities page'
  if (slug === 'events') return 'Events page'
  return slug
}

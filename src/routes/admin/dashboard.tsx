/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { isHtmx } from '../../utils/request'
import AdminLayout, {
  ADMIN_DASHBOARD_PANELS,
  type AdminDashboardPanel,
} from '../../templates/admin/layout'
import { EditorAssets } from '../../templates/components/editor'
import { homeExists } from './home.data'
import HomeForm from '../../templates/admin/dashboard/homeForm'

type HomeMode = 'preview' | 'edit'
type NonHomePanel = Exclude<AdminDashboardPanel, 'home'>

const PANEL_COPY: Record<AdminDashboardPanel, { heading: string; description: string }> = {
  home: {
    heading: 'Home overview',
    description: 'Landing page summary and quick actions will appear here.',
  },
  'about-us': {
    heading: 'About-us',
    description: 'Manage About-us content and supporting sections.',
  },
  activities: {
    heading: 'Activities',
    description: 'Configure activities listings and layout options.',
  },
  events: {
    heading: 'Events',
    description: 'Create, edit, and schedule upcoming events.',
  },
  settings: {
    heading: 'Settings',
    description: 'Administrative settings and configuration will live here.',
  },
}

const adminDashboard = new Hono<{ Bindings: Bindings }>()

adminDashboard.get('/dashboard', requireAuth(), requireAdmin, async (c) => {
  return handleHomeRequest(c, 'auto')
})

adminDashboard.get('/dashboard/home', requireAuth(), requireAdmin, async (c) => {
  return handleHomeRequest(c, 'auto')
})

adminDashboard.get('/dashboard/home/preview', requireAuth(), requireAdmin, async (c) => {
  return handleHomeRequest(c, 'preview')
})

adminDashboard.get('/dashboard/home/edit', requireAuth(), requireAdmin, async (c) => {
  return handleHomeRequest(c, 'edit')
})

adminDashboard.get('/dashboard/:panel', requireAuth(), requireAdmin, async (c) => {
  const slug = c.req.param('panel')
  const panel = getPanelSlug(slug)
  if (!panel) {
    return c.notFound()
  }

  if (panel === 'home') {
    return handleHomeRequest(c, 'auto')
  }

  if (isHtmx(c)) {
    return c.html(renderGenericPanel(panel))
  }

  return renderGenericFullPage(c, panel)
})

export default adminDashboard

async function handleHomeRequest(
  c: Parameters<typeof adminDashboard.get>[1],
  mode: HomeMode | 'auto',
) {
  const hasData = await homeExists(c.env)
  const resolvedMode: HomeMode = mode === 'auto' ? (hasData ? 'preview' : 'edit') : mode
  const htmx = isHtmx(c)
  const csrfToken = htmx ? undefined : ensureCsrf(c)
  const panel = renderHomePanel(resolvedMode, { hasData, csrfToken })
  if (htmx) {
    return c.html(panel)
  }

  const title = `Admin Dashboard – ${PANEL_COPY.home.heading}`
  return c.html(
    <AdminLayout title={title} activePanel="home" csrfToken={csrfToken} extraHead={<EditorAssets />}>
      {panel}
    </AdminLayout>,
  )
}

function getPanelSlug(input: string | undefined): AdminDashboardPanel | null {
  if (!input) return null
  const match = ADMIN_DASHBOARD_PANELS.find((item) => item.slug === input)
  return match ? match.slug : null
}

function renderGenericFullPage(
  c: Parameters<typeof adminDashboard.get>[1],
  panel: NonHomePanel,
) {
  const csrfToken = ensureCsrf(c)
  const title = `Admin Dashboard – ${PANEL_COPY[panel].heading}`
  return c.html(
    <AdminLayout title={title} activePanel={panel} csrfToken={csrfToken}>
      {renderGenericPanel(panel)}
    </AdminLayout>,
  )
}

function renderGenericPanel(panel: NonHomePanel) {
  const copy = PANEL_COPY[panel]
  return (
    <section
      data-panel={panel}
      class="space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-white/10"
    >
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{copy.heading}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">{copy.description}</p>
      </div>
      <div class="rounded-md border border-dashed border-gray-300 p-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Placeholder content for {copy.heading}
      </div>
    </section>
  )
}

function renderHomePanel(
  mode: HomeMode,
  options: { hasData: boolean; csrfToken?: string },
) {
  const attrs: Record<string, string> = {
    'data-panel': 'home',
    'data-mode': mode,
  }
  if (mode === 'preview' && options.hasData) {
    attrs['data-has-data'] = 'true'
  }

  return (
    <div {...attrs} class="space-y-6">
      {renderHomeBanner(mode)}
      {mode === 'preview' ? renderHomePreview(options.hasData) : <HomeForm csrfToken={options.csrfToken} />}
    </div>
  )
}

function renderHomeBanner(mode: HomeMode) {
  const previewActive = mode === 'preview'
  const editActive = mode === 'edit'
  const baseClasses =
    'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  const previewClasses = previewActive
    ? `${baseClasses} bg-indigo-600 text-white shadow-sm focus-visible:outline-indigo-600`
    : `${baseClasses} border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus-visible:outline-indigo-600 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-950`
  const editClasses = editActive
    ? `${baseClasses} bg-indigo-600 text-white shadow-sm focus-visible:outline-indigo-600`
    : `${baseClasses} border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus-visible:outline-indigo-600 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-950`

  return (
    <div
      data-home-banner
      data-mode={mode}
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
    >
      <div class="font-semibold">Home panel</div>
      <div class="flex flex-wrap items-center gap-2">
        <a
          href="/admin/dashboard/home/preview"
          hx-get="/admin/dashboard/home/preview"
          hx-target="#admin-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class={previewClasses}
        >
          Preview
        </a>
        <a
          href="/admin/dashboard/home/edit"
          hx-get="/admin/dashboard/home/edit"
          hx-target="#admin-content"
          hx-swap="innerHTML"
          hx-push-url="true"
          class={editClasses}
        >
          Edit form
        </a>
      </div>
    </div>
  )
}

function renderHomePreview(hasData: boolean) {
  if (!hasData) {
    return (
      <div class="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        No Home content has been saved yet. Switch to the edit form to start drafting the Home page.
      </div>
    )
  }

  return (
    <div class="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-white/10">
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview placeholder</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          The fully rendered Home page preview will appear here once content rendering is connected. For now, this placeholder confirms preview mode is active.
        </p>
      </div>
      <div class="rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Preview snapshot placeholder
      </div>
    </div>
  )
}

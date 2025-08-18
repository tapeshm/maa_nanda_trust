import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import type { Bindings } from '../bindings'
import { adminAuth } from '../middleware/auth'
import AdminLayout from '../templates/adminLayout'
import Dashboard from '../templates/admin/dashboard'
import ContentListPage from '../templates/admin/contentList'
import ContentEditorPage from '../templates/admin/contentEditor'
import ErrorPage from '../templates/error'
import {
  listContent,
  getContent,
  upsertContent,
  listFinance,
  listMedia,
} from '../utils/db'

/**
 * Schema for validating content submission.  The JSON field is the
 * serialised blocks array from Editor.js.  The slug and title must be
 * non‑empty strings.  We do not perform slug sanitisation here; any
 * server‑side slug normalisation should be done before calling
 * upsertContent.
 */
const contentSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  json: z.string().min(2, 'Content is required'),
})

const app = new Hono<{ Bindings: Bindings }>()

// Apply basic auth to all admin routes.  This ensures that the user
// must authenticate before any admin handler runs.
app.use('*', adminAuth)

// Dashboard overview.  Aggregates counts and totals from the database
// and renders the dashboard component inside the admin layout.
app.get('/', async (c) => {
  const [pages, finance, media] = await Promise.all([
    listContent(c.env),
    listFinance(c.env),
    listMedia(c.env),
  ])
  const totals = finance.reduce(
    (acc, rec) => {
      if (rec.type === 'credit') acc.credit += rec.amount
      else acc.debit += rec.amount
      return acc
    },
    { credit: 0, debit: 0 },
  )
  return c.html(
    <AdminLayout title="Dashboard">
      <Dashboard
        contentCount={pages.length}
        mediaCount={media.length}
        totals={totals}
      />
    </AdminLayout>,
  )
})

// List all pages
app.get('/content', async (c) => {
  const pages = await listContent(c.env)
  return c.html(
    <AdminLayout title="Pages">
      <ContentListPage pages={pages} />
    </AdminLayout>,
  )
})

// Form for creating a new page.  We pass empty blocks array and empty slug.
app.get('/content/new', (c) => {
  return c.html(
    <AdminLayout title="Create Page">
      <ContentEditorPage slug="" title="" blocks={[]} isNew={true} />
    </AdminLayout>,
  )
})

// Edit an existing page
app.get('/content/:slug', async (c) => {
  const slug = c.req.param('slug')
  const record = await getContent(c.env, slug)
  if (!record) {
    return c.html(
      <AdminLayout title="Not Found">
        <ErrorPage message="Page not found" status={404} />
      </AdminLayout>,
      404,
    )
  }
  const blocks = JSON.parse(record.json)
  return c.html(
    <AdminLayout title={`Edit ${record.title}`}>
      <ContentEditorPage
        slug={record.slug}
        title={record.title}
        blocks={blocks}
        isNew={false}
      />
    </AdminLayout>,
  )
})

// Create or update a content page.  We expect slug, title and json
// fields from a form submission.  After saving we clear the cached
// rendered page in KV and redirect back to the edit form using a 303
// response.
app.post('/content', zValidator('form', contentSchema), async (c) => {
  const data = c.req.valid('form')
  await upsertContent(c.env, data.slug.trim(), data.title.trim(), data.json)
  // Invalidate the cached page so the next public view will re-render
  await c.env.KV.delete(`page:${data.slug.trim()}`)
  return c.redirect(`/admin/content/${encodeURIComponent(data.slug.trim())}`, 303)
})

export default app

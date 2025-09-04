import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import type { Bindings } from '../bindings'
import { supabaseAuth, requireAdmin } from '../middleware/auth'
import AdminLayout from '../templates/adminLayout'
import Dashboard from '../templates/admin/dashboard'
import ContentListPage from '../templates/admin/contentList'
import ErrorPage from '../templates/error'
import { listContent, getContent, upsertContent, listFinance, listMedia, deleteContent } from '../utils/db'

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

// Apply Supabase auth and require an admin/trustee role for all admin routes.
const useSupabaseAuth = (c: any, next: any) => {
  const projectUrl = (c.env as any).SUPABASE_URL
  const publishableKey = (c.env as any).SUPABASE_PUBLISHABLE_KEY
  const jwksUri = (c.env as any).JWKS_URL
  const hmacJwtSecret = (c.env as any).SUPABASE_JWT_SECRET
  const expectedIssuerEnv = (c.env as any).SUPABASE_ISSUER as string | undefined
  let issuer = expectedIssuerEnv
  if (!issuer && projectUrl) {
    try {
      const u = new URL(projectUrl)
      issuer = `${u.origin}/auth/v1`
      if (hmacJwtSecret && u.hostname !== '127.0.0.1') {
        issuer = `http://127.0.0.1:${u.port || '54321'}/auth/v1`
      }
    } catch {}
  }
  return supabaseAuth({
    projectUrl,
    publishableKey,
    jwksUri,
    hmacJwtSecret,
    expected: issuer ? { issuer } : undefined,
  })(c, next)
}

app.use('*', useSupabaseAuth)
app.use('*', requireAdmin)

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
// Removed Editor.js-based new content form

// Edit an existing page
// Removed Editor.js-based edit page route

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

// Delete a content page by slug
app.post('/content/:slug/delete', async (c) => {
  const slug = c.req.param('slug')
  await deleteContent(c.env, slug)
  await c.env.KV.delete(`page:${slug}`)
  return c.redirect('/admin/content', 303)
})

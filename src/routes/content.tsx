/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import Layout from '../templates/layout'
import Page from '../templates/page'
import {
  getContent,
  listMedia,
} from '../utils/db'
import { getCached, setCached } from '../utils/cache'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabaseAuth, extractRolesFromClaims, requireAdmin } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings }>()
// Attach auth context for all content routes so we can toggle UI state
app.use('*', supabaseAuthFromEnv as any)

/**
 * Render a page by slug.  Looks up the content block in D1, caches the
 * rendered HTML in KV and returns a 404 if not found.
 */
async function renderSlugPage(c: any, slug: string): Promise<Response> {
  const { env } = c
  const roles = extractRolesFromClaims(c.get('auth')?.claims || null)
  const isAdmin = roles.has('admin') || roles.has('trustee')
  const signedIn = !!(c.get('auth')?.userId)
  // Try to read from cache first
  let html = await getCached(env, `page:${slug}`)
  let title = slug
  if (!html) {
    const record = await getContent(env, slug)
    if (!record) {
      return c.html(
        <Layout title="Not Found" admin={isAdmin}>
          <Page html="<h1>Page not found But I found you!</h1>" />
        </Layout>,
        404,
      )
    }
    // Editor.js renderer removed; keep content empty for now
    html = ''
    title = record.title
    // Cache the rendered HTML for 5 minutes
    await setCached(env, `page:${slug}`, html, 300)
  }
  return c.html(
    <Layout title={title} admin={isAdmin} signedIn={signedIn}>
      <Page html={html!} />
    </Layout>,
  )
}

// Simple landing page powered by content fragments in D1. When the user
// has an admin/trustee role, inline edit forms are displayed for each
// fragment; otherwise content is rendered read‑only.
app.get('/', supabaseAuthFromEnv, async (c) => {
  const auth = c.get('auth')
  const roles = extractRolesFromClaims(auth?.claims || null)
  const isAdmin = roles.has('admin') || roles.has('trustee')
  const signedIn = !!auth?.userId

  const titleRec = await getContent(c.env, 'home:title')
  const section1 = await getContent(c.env, 'home:section1')
  const section2 = await getContent(c.env, 'home:section2')

  const heroTitle = safePlainTextFromBlocks(titleRec?.json) || 'Welcome to Temple Trust'
  // Editor.js renderer removed; render empty sections for now
  const s1Html = ''
  const s2Html = ''

  return c.html(
    <Layout title="Home" admin={isAdmin} signedIn={signedIn} hero={{ title: heroTitle }}>
      <div class="prose prose-slate max-w-none dark:prose-invert">
        <section class="mb-8">
          <h2 class="text-xl font-semibold mb-2">Section One</h2>
          <div dangerouslySetInnerHTML={{ __html: s1Html }} />
          {isAdmin && (
            <div class="mt-3 border rounded p-3 bg-white dark:bg-gray-800">
              <form
                id="editor-form-home-section1"
                hx-post={`/_edit/${encodeURIComponent('home:section1')}`}
                hx-target="#editor-status-home-section1"
                hx-swap="innerHTML"
              >
                <input type="hidden" id="editor-content-home-section1" name="content" />
                <div id="editor-home-section1" data-editor="true" data-editor-type="simple" data-slug="home:section1" data-script-id="init-home-section1" class="border rounded p-2 bg-white dark:bg-gray-900" />
                <div class="mt-2 flex items-center gap-2">
                  <button type="submit" data-action="save" data-target="home:section1" data-input-id="editor-content-home-section1" class="inline-flex items-center rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">Save Section One</button>
                  <button type="button" data-action="cancel" class="inline-flex items-center rounded bg-gray-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-500">Cancel</button>
                </div>
                <script type="application/json" id="init-home-section1">{section1?.json || '[]'}</script>
                <div id="editor-status-home-section1" class="mt-2 text-sm text-gray-500" />
              </form>
            </div>
          )}
        </section>
        <section>
          <h2 class="text-xl font-semibold mb-2">Section Two</h2>
          <div dangerouslySetInnerHTML={{ __html: s2Html }} />
          {isAdmin && (
            <div class="mt-3 border rounded p-3 bg-white dark:bg-gray-800">
              <form
                id="editor-form-home-section2"
                hx-post={`/_edit/${encodeURIComponent('home:section2')}`}
                hx-target="#editor-status-home-section2"
                hx-swap="innerHTML"
              >
                <input type="hidden" id="editor-content-home-section2" name="content" />
                <div id="editor-home-section2" data-editor="true" data-editor-type="simple" data-slug="home:section2" data-script-id="init-home-section2" class="border rounded p-2 bg-white dark:bg-gray-900" />
                <div class="mt-2 flex items-center gap-2">
                  <button type="submit" data-action="save" data-target="home:section2" data-input-id="editor-content-home-section2" class="inline-flex items-center rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">Save Section Two</button>
                  <button type="button" data-action="cancel" class="inline-flex items-center rounded bg-gray-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-500">Cancel</button>
                </div>
                <script type="application/json" id="init-home-section2">{section2?.json || '[]'}</script>
                <div id="editor-status-home-section2" class="mt-2 text-sm text-gray-500" />
              </form>
            </div>
          )}
        </section>
      </div>
      {isAdmin ? <script type="module" src="/assets/editor.js"></script> : null}
    </Layout>,
  )
})

// Edit form component (server-side JSX)
function EditFragmentForm(props: { slug: string; label: string; initial: string }) {
  return (
    <form method="post" action={`/_edit/${encodeURIComponent(props.slug)}`} class="mt-4 border rounded p-3 bg-white dark:bg-gray-800">
      <label class="block text-sm font-medium mb-1">{props.label}</label>
      <textarea name="content" rows={4} class="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900" placeholder="Enter content...">
        {props.initial}
      </textarea>
      <div class="mt-2 flex items-center gap-2">
        <button type="submit" class="inline-flex items-center rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">Save</button>
        <span class="text-xs text-gray-500">Saves as a paragraph block</span>
      </div>
    </form>
  )
}

// Minimal safe plain text extractor from stored blocks JSON (Editor.js)
function safePlainTextFromBlocks(json?: string): string {
  if (!json) return ''
  try {
    const blocks = JSON.parse(json)
    if (!Array.isArray(blocks)) return ''
    // pick first non-empty text from header/paragraph
    for (const b of blocks) {
      if (b?.type === 'header' && b?.data?.text) return String(b.data.text)
      if (b?.type === 'paragraph' && b?.data?.text) return String(b.data.text)
    }
  } catch {}
  return ''
}

// Handle simple inline edits; stores content as a single paragraph (or header for title)
const editSchema = z.object({ content: z.string().min(0) })
import { upsertContent } from '../utils/db'
app.post('/_edit/:slug', supabaseAuthFromEnv, requireAdmin, zValidator('form', editSchema), async (c) => {
  const slug = c.req.param('slug')
  const { content } = c.req.valid('form')
  try { console.log('[edit] received', { slug, length: (content || '').length, htmx: !!c.req.header('HX-Request') }) } catch {}
  const isTitle = slug === 'home:title'
  let jsonToStore: string
  // Accept Editor.js blocks JSON (array or { blocks: [...] })
  try {
    const parsed = JSON.parse(content || '[]')
    if (Array.isArray(parsed)) jsonToStore = JSON.stringify(parsed)
    else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).blocks)) jsonToStore = JSON.stringify((parsed as any).blocks)
    else throw new Error('not editorjs')
  } catch {
    // Fallback: wrap plain text into blocks
    const trimmed = String(content || '').trim()
    const blocks = isTitle
      ? [{ type: 'header', data: { level: 2, text: trimmed || 'Welcome to Temple Trust' } }]
      : [{ type: 'paragraph', data: { text: trimmed || '' } }]
    jsonToStore = JSON.stringify(blocks)
  }
  const title = isTitle ? 'Home Title' : slug
  await upsertContent(c.env, slug, title, jsonToStore)
  // If this is an htmx request, return a small success snippet (no redirect)
  if (c.req.header('HX-Request')) {
    return c.html(
      <span class="text-green-600">Saved ✓</span>
    )
  }
  return c.redirect('/', 303)
})

// Wrapper to apply Supabase auth based on runtime env variables (no strict role requirement)
function supabaseAuthFromEnv(c: any, next: any) {
  const projectUrl = (c.env as any).SUPABASE_URL
  const publishableKey = (c.env as any).SUPABASE_PUBLISHABLE_KEY
  const jwksUri = (c.env as any).JWKS_URL
  const hmacJwtSecret = (c.env as any).SUPABASE_JWT_SECRET
  const expectedIssuerEnv = (c.env as any).SUPABASE_ISSUER as string | undefined
  if (!projectUrl || !publishableKey) {
    // Provide default empty auth context and continue
    c.set('auth', {
      token: null,
      claims: null,
      userId: null,
      getClient: () => {
        throw new Error('Supabase client not configured')
      },
    })
    return next()
  }
  let issuer = expectedIssuerEnv
  if (!issuer) {
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

// About page
app.get('/about', (c) => renderSlugPage(c, 'about'))

// Activities page
app.get('/activities', (c) => renderSlugPage(c, 'activities'))

// Gallery page – display images stored in R2.  Renders a simple grid of
// thumbnails.  The actual images are served by the `/media/:key` route.
app.get('/gallery', async (c) => {
  const media = await listMedia(c.env)
  const galleryHtml = media
    .map(
      (m) =>
        `<div class="overflow-hidden rounded shadow"><img src="/media/${m.key}" alt="${m.filename}" class="object-cover w-full h-48" /></div>`,
    )
    .join('')
  const roles = extractRolesFromClaims(c.get('auth')?.claims || null)
  const isAdmin = roles.has('admin') || roles.has('trustee')
  const signedIn = !!(c.get('auth')?.userId)
  return c.html(
    <Layout title="Gallery" admin={isAdmin} signedIn={signedIn}>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        dangerouslySetInnerHTML={{ __html: galleryHtml }}
      />
    </Layout>,
  )
})

// Generic slug page fallback.  If the slug matches a known route above it
// will never reach this handler due to earlier matching.  Otherwise we
// attempt to render a content block with that slug.
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  return renderSlugPage(c, slug)
})

export default app

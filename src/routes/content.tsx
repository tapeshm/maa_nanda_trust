/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import Layout from '../templates/layout'
import Page from '../templates/page'
import { renderEditorJS } from '../utils/editor'
import {
  getContent,
  listMedia,
} from '../utils/db'
import { getCached, setCached } from '../utils/cache'

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Render a page by slug.  Looks up the content block in D1, caches the
 * rendered HTML in KV and returns a 404 if not found.
 */
async function renderSlugPage(c: any, slug: string): Promise<Response> {
  const { env } = c
  // Try to read from cache first
  let html = await getCached(env, `page:${slug}`)
  let title = slug
  if (!html) {
    const record = await getContent(env, slug)
    if (!record) {
      return c.html(
        <Layout title="Not Found">
          <Page html="<h1>Page not found But I found you!</h1>" />
        </Layout>,
        404,
      )
    }
    const blocks = JSON.parse(record.json)
    html = renderEditorJS(blocks)
    title = record.title
    // Cache the rendered HTML for 5 minutes
    await setCached(env, `page:${slug}`, html, 300)
  }
  return c.html(
    <Layout title={title}>
      <Page html={html!} />
    </Layout>,
  )
}

// Home page
app.get('/', (c) => renderSlugPage(c, 'home'))

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
  return c.html(
    <Layout title="Gallery">
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

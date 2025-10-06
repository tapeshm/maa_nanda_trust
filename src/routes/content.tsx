/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import Layout from '../templates/layout'
import Page from '../templates/page'
import { ensureCsrf } from '../middleware/csrf'
import { getEditorDocument } from '../models/editorDocuments'
import { selectRenderedHtml } from '../utils/editor/render'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Welcome to Temple Trust" signedIn={!!c.get('auth')?.claims} csrfToken={csrfToken}>
      <Page html="<p>The site scaffold is ready. Content management will be added soon.</p>" />
    </Layout>,
  )
})

app.get('/:slug/:id', async (c) => {
  const csrfToken = ensureCsrf(c)
  const { slug, id } = c.req.param()
  const record = await getEditorDocument(c.env, slug, id)

  if (!record) {
    return c.html(
      <Layout title="Not Found" signedIn={!!c.get('auth')?.claims} csrfToken={csrfToken}>
        <Page html="<p>The requested page could not be found.</p>" />
      </Layout>,
      404,
    )
  }

  const { html } = selectRenderedHtml(record.contentJson, record.contentHtml, {
    profile: record.profile,
    slug: record.slug,
    documentId: record.documentId,
  })

  return c.html(
    <Layout
      title={record.slug}
      signedIn={!!c.get('auth')?.claims}
      csrfToken={csrfToken}
    >
      <Page html={html} />
    </Layout>,
  )
})

app.get('*', (c) => {
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Not Found" signedIn={!!c.get('auth')?.claims} csrfToken={csrfToken}>
      <Page html="<p>This page has not been created yet.</p>" />
    </Layout>,
    404,
  )
})

export default app

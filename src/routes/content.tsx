/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../bindings'
import Layout from '../templates/layout'
import Page from '../templates/page'
import { ensureCsrf } from '../middleware/csrf'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Welcome to Temple Trust" signedIn={!!c.get('auth')?.claims} csrfToken={csrfToken}>
      <Page html="<p>The site scaffold is ready. Content management will be added soon.</p>" />
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

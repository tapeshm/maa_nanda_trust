/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { ensureCsrf } from '../../middleware/csrf'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import EditorPage from '../../templates/admin/editorPage'
import Layout from '../../templates/layout'

// [D3:editor-tiptap.step-04:admin-router] Router for admin editor pages.
const admin = new Hono<{ Bindings: Bindings }>()

admin.get('/', requireAuth(), requireAdmin, (c) => {
  const csrfToken = ensureCsrf(c)
  return c.html(
    <Layout title="Admin" signedIn={true} csrfToken={csrfToken}>
      <div class="prose max-w-none">
        <h1>Admin</h1>
        <p>Open the demo editor page:</p>
        <p>
          <a class="inline-block rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500" href="/admin/demo/1">Open Editor</a>
        </p>
      </div>
    </Layout>,
  )
})

admin.get('/:slug/:id', requireAuth(), requireAdmin, (c) => {
  const csrfToken = ensureCsrf(c)
  // Generate a per-response nonce for CSP to allow inline JSON payload scripts.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const nonce = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  try {
    ;(c as any).set('cspNonce', nonce)
  } catch {
    /* no-op */
  }

  const { slug, id } = c.req.param()
  return c.html(
    <EditorPage
      title={`Edit ${slug} ${id}`}
      csrfToken={csrfToken}
      editors={[
        { id: 'editor_main', profile: 'full' },
      ]}
      initialPayloads={{ editor_main: { type: 'doc', content: [{ type: 'paragraph' }] } }}
      nonce={nonce}
    />,
  )
})

export default admin

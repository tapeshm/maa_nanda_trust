/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Bindings } from '../../bindings'
import { ensureCsrf } from '../../middleware/csrf'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import EditorPage, { type JSONContent } from '../../templates/admin/editorPage'
import Layout from '../../templates/layout'
import upload from './upload'
import saveContent from './saveContent'
import { getEditorDocument } from '../../models/editorDocuments'
import { renderFallbackHtml } from '../../utils/editor/render'
import { logEditorSuccess } from '../../observability/editorLogs'

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

admin.get('/:slug/:id', requireAuth(), requireAdmin, async (c) => {
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
  const existing = await getEditorDocument(c.env, slug, id)
  let initialPayload: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
  if (existing) {
    try {
      initialPayload = JSON.parse(existing.contentJson) as JSONContent
    } catch {
      initialPayload = { type: 'doc', content: [{ type: 'paragraph' }] }
    }
  }
  const initialPayloads = { editor_main: initialPayload }
  const initialHtml = existing
    ? {
        editor_main:
          existing.contentHtml && existing.contentHtml.length > 0
            ? existing.contentHtml
            : renderFallbackHtml(initialPayload, {
                profile: existing.profile,
                slug: existing.slug,
                documentId: existing.documentId,
              }),
      }
    : {
        editor_main: '',
      }
  const etags = existing ? { editor_main: existing.updatedAt } : undefined

  logEditorSuccess(c, 'editor.mount', {
    route: '/admin/:slug/:id',
    slug,
    documentId: id,
    profile: existing?.profile ?? 'full',
    status: existing ? 'existing' : 'new',
  })

  return c.html(
    <EditorPage
      title={`Edit ${slug} ${id}`}
      csrfToken={csrfToken}
      editors={[
        { id: 'editor_main', profile: 'full', documentId: id },
      ]}
      initialPayloads={initialPayloads}
      initialHtml={initialHtml}
      etags={etags}
      nonce={nonce}
      slug={slug}
      />,
  )
})

admin.route('/', upload)
admin.route('/', saveContent)

export default admin

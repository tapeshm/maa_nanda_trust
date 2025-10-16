/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import Layout from '../layout'
import { EditorAssets, EditorInstance } from '../components/editor'
import type { EditorSpec, JSONContent } from '../components/editor'
import { EDITOR_DATA_ATTRIBUTES } from '../../editor/constants'

export type { JSONContent } from '../components/editor'

const { form: DATA_ATTR_EDITOR_FORM } = EDITOR_DATA_ATTRIBUTES

// [D3:editor-tiptap.step-04:editor-template] Admin editor page template with SSR JSON payloads.
const EditorPage: FC<{
  title: string
  csrfToken: string
  editors: EditorSpec[]
  initialPayloads?: Record<string, JSONContent>
  initialHtml?: Record<string, string>
  etags?: Record<string, string>
  slug: string
  nonce?: string
}> = ({ title, csrfToken, editors, initialPayloads = {}, initialHtml = {}, etags = {}, slug, nonce }) => {
  const head = <EditorAssets />

  // [D3:editor-tiptap.step-05:hx-headers] Preserve double quotes in hx-headers for HTMX.
  const csrfHeaderJson = JSON.stringify({ 'X-CSRF-Token': csrfToken })
  const hxHeaders = raw(`'${csrfHeaderJson.replace(/'/g, '&#39;')}'`)

  return (
    <Layout title={title} signedIn={true} csrfToken={csrfToken} extraHead={head}>
      <main class="mx-auto max-w-5xl px-4 py-8">
        <h1 class="text-2xl font-semibold mb-4">{title}</h1>

        <form
          method="post"
          hx-post="/admin/save-content"
          hx-headers={hxHeaders}
          {...{ [DATA_ATTR_EDITOR_FORM.attr]: '' }}
          class="space-y-8"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="csrf_token" value={csrfToken} />

          {editors.map((spec) => (
            <EditorInstance
              spec={spec}
              payload={initialPayloads[spec.id]}
              html={initialHtml[spec.id]}
              etag={etags[spec.id]}
              nonce={nonce}
            />
          ))}

          <div class="flex justify-end gap-3">
            <button
              type="submit"
              class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Save changes
            </button>
          </div>
        </form>
      </main>
    </Layout>
  )
}

export default EditorPage

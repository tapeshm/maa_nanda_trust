/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import Layout from '../layout'
import { resolveAsset } from '../../utils/assets'
import { MENUBAR_CLASSNAME, MENUBAR_BUTTON_CLASSNAME } from '../../frontend/editor/styles'

type EditorSpec = {
  id: string
  profile?: 'basic' | 'full'
  documentId?: string
}

export type JSONContent = {
  type: 'doc'
  content?: any[]
}

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
  const asset = resolveAsset('editor')

  const head = (
    <>
      {asset.styles.map((href) => (
        <link rel="stylesheet" href={href} key={href} />
      ))}
      <script src={asset.script} type="module" defer></script>
    </>
  )

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
          data-editor-form
          class="space-y-8"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="csrf_token" value={csrfToken} />

          {editors.map(({ id, profile = 'basic', documentId }) => {
            const payload = initialPayloads[id] ?? { type: 'doc', content: [] }
            const scriptId = `${id}__content`
            const serialized = JSON.stringify(payload)
            const htmlValue = initialHtml[id] ?? ''
            const etag = etags[id]
            const docId = documentId ?? id
            const imageAltId = `${id}__alt-input`

            return (
              <section class="space-y-2" id={`${id}__section`}>
                <div
                  id={`${id}__toolbar`}
                  class={MENUBAR_CLASSNAME}
                  data-editor-toolbar
                  data-editor-for={id}
                >
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="bold"
                    aria-pressed="false"
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="italic"
                    aria-pressed="false"
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="heading-2"
                    aria-pressed="false"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="heading-3"
                    aria-pressed="false"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="bullet-list"
                    aria-pressed="false"
                  >
                    Bullets
                  </button>
                  <button
                    type="button"
                    class={MENUBAR_BUTTON_CLASSNAME}
                    data-editor-command="ordered-list"
                    aria-pressed="false"
                  >
                    Ordered
                  </button>
                  {profile === 'full' ? (
                    <button
                      type="button"
                      class={MENUBAR_BUTTON_CLASSNAME}
                      data-editor-command="image"
                      aria-pressed="false"
                      title="Insert image"
                    >
                      Image
                    </button>
                  ) : null}
                </div>
                {profile === 'full' ? (
                  <>
                    <input
                      id={`${id}__image-input`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="hidden"
                    />
                    <div class="space-y-2 text-sm text-zinc-700">
                      <label class="flex flex-col gap-1" htmlFor={imageAltId}>
                        <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Image alternative text
                        </span>
                        <input
                          id={imageAltId}
                          name="image_alt"
                          type="text"
                          placeholder="Describe the image"
                          class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          maxLength={250}
                        />
                      </label>
                      <p class="text-xs text-zinc-500">
                        Provide a short description for screen readers. Leave blank only when the image is decorative.
                      </p>
                    </div>
                  </>
                ) : null}
                {/* [D3:editor-tiptap.step-11:editor-content-class] Editor content uses contentClass() via EDITOR_CLASSNAME (applied by Tiptap editorProps) */}
                <div
                  id={id}
                  data-editor
                  data-editor-profile={profile}
                  data-editor-toolbar-id={`${id}__toolbar`}
                  data-editor-image-input-id={profile === 'full' ? `${id}__image-input` : undefined}
                  data-editor-alt-id={profile === 'full' ? imageAltId : undefined}
                />
                <script id={scriptId} type="application/json" nonce={nonce}>
                  {serialized}
                </script>
                <input
                  type="hidden"
                  name={`content_json[${id}]`}
                  data-editor-field={id}
                  value={serialized}
                />
                <input
                  type="hidden"
                  name={`content_html[${id}]`}
                  data-editor-html-field={id}
                  value={htmlValue}
                />
                <input type="hidden" name={`profile[${id}]`} value={profile} />
                <input type="hidden" name={`document_id[${id}]`} value={docId} />
                {etag ? <input type="hidden" name={`etag[${id}]`} value={etag} /> : null}
              </section>
            )
          })}

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

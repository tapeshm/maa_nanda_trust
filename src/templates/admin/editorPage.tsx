/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import Layout from '../layout'
import { resolveAsset } from '../../utils/assets'
import {
  MENUBAR_CLASSNAME,
  MENUBAR_BUTTON_CLASSNAME,
  IMAGE_PANEL_CLASSNAME,
  IMAGE_PANEL_SECTION_CLASSNAME,
  IMAGE_PANEL_LABEL_CLASSNAME,
  IMAGE_PANEL_BUTTONS_CLASSNAME,
  IMAGE_PANEL_BUTTON_CLASSNAME,
  IMAGE_PANEL_INPUT_CLASSNAME,
} from '../../frontend/editor/styles'

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
            const imageAltId = `${id}__image-alt-input`
            const imagePanelId = `${id}__image-panel`

            return (
              <section class="space-y-2" id={`${id}__section`}>
                {/* [D3:editor-tiptap.step-13:toolbar-a11y] Add role and aria-labelledby for accessibility */}
                <div
                  id={`${id}__toolbar`}
                  class={MENUBAR_CLASSNAME}
                  data-editor-toolbar
                  data-editor-for={id}
                  role="group"
                  aria-label="Formatting toolbar"
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
                {/* [D3:editor-tiptap.step-14:image-panel-template] ImagePanel with contextual controls for full profile */}
                {profile === 'full' ? (
                  <>
                    <input
                      id={`${id}__image-input`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="hidden"
                    />
                    <div
                      id={imagePanelId}
                      class={`${IMAGE_PANEL_CLASSNAME} hidden`}
                      hidden
                      data-image-panel
                      data-editor-for={id}
                      role="group"
                      aria-label="Image controls"
                    >
                      <div class={IMAGE_PANEL_SECTION_CLASSNAME}>
                        <label class={IMAGE_PANEL_LABEL_CLASSNAME}>Size</label>
                        <div class={IMAGE_PANEL_BUTTONS_CLASSNAME} role="radiogroup" aria-label="Image size">
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-size="s"
                            aria-pressed="false"
                            title="Resize to small (33% width)"
                          >
                            Small
                          </button>
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-size="m"
                            aria-pressed="false"
                            title="Resize to medium (50% width)"
                          >
                            Medium
                          </button>
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-size="l"
                            aria-pressed="false"
                            title="Resize to large (75% width)"
                          >
                            Large
                          </button>
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-size="xl"
                            aria-pressed="false"
                            title="Original size (100% width)"
                          >
                            Original
                          </button>
                        </div>
                      </div>
                      <div class={IMAGE_PANEL_SECTION_CLASSNAME}>
                        <label class={IMAGE_PANEL_LABEL_CLASSNAME}>Alignment</label>
                        <div class={IMAGE_PANEL_BUTTONS_CLASSNAME} role="radiogroup" aria-label="Image alignment">
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-align="left"
                            aria-pressed="false"
                            title="Align left"
                          >
                            ← Left
                          </button>
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-align="center"
                            aria-pressed="false"
                            title="Align center"
                          >
                            ↔ Center
                          </button>
                          <button
                            type="button"
                            class={IMAGE_PANEL_BUTTON_CLASSNAME}
                            data-align="right"
                            aria-pressed="false"
                            title="Align right"
                          >
                            → Right
                          </button>
                        </div>
                      </div>
                      <div class={IMAGE_PANEL_SECTION_CLASSNAME}>
                        <label class={IMAGE_PANEL_LABEL_CLASSNAME} htmlFor={imageAltId}>
                          Alt text
                        </label>
                        <input
                          id={imageAltId}
                          type="text"
                          class={IMAGE_PANEL_INPUT_CLASSNAME}
                          placeholder="Describe the image"
                          maxlength={250}
                        />
                        <p class="text-xs text-zinc-500 mt-1">
                          Provide a short description for screen readers. Leave blank only when the image is
                          decorative.
                        </p>
                      </div>
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
                  data-editor-image-panel-id={profile === 'full' ? imagePanelId : undefined}
                  data-editor-image-alt-id={profile === 'full' ? imageAltId : undefined}
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

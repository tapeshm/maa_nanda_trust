/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import type { JSONContent as TiptapJSONContent, EditorProfile } from '../../frontend/editor/types'
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
import {
  DEFAULT_EDITOR_PROFILE,
  EDITOR_DATA_ATTRIBUTES,
  isFullEditorProfile,
} from '../../editor/constants'

export type JSONContent = TiptapJSONContent

export type EditorSpec = {
  id: string
  profile?: EditorProfile
  documentId?: string
}

type EditorAssetsProps = {
  entry?: string
}

const DEFAULT_ENTRY = 'editor'
const EMPTY_CONTENT: JSONContent = { type: 'doc', content: [] }

const {
  toolbar: DATA_ATTR_TOOLBAR,
  toolbarFor: DATA_ATTR_TOOLBAR_FOR,
  command: DATA_ATTR_COMMAND,
  root: DATA_ATTR_EDITOR_ROOT,
  profile: DATA_ATTR_EDITOR_PROFILE,
  toolbarId: DATA_ATTR_EDITOR_TOOLBAR_ID,
  imageInputId: DATA_ATTR_EDITOR_IMAGE_INPUT_ID,
  imagePanelId: DATA_ATTR_EDITOR_IMAGE_PANEL_ID,
  imageAltId: DATA_ATTR_EDITOR_IMAGE_ALT_ID,
  hiddenJsonField: DATA_ATTR_EDITOR_HIDDEN_JSON,
  hiddenHtmlField: DATA_ATTR_EDITOR_HIDDEN_HTML,
} = EDITOR_DATA_ATTRIBUTES

/**
 * Shared editor asset includes for server-rendered templates.
 * Injects the compiled editor CSS and JS bundles via the manifest.
 */
export const EditorAssets: FC<EditorAssetsProps> = ({ entry = DEFAULT_ENTRY }) => {
  const asset = resolveAsset(entry)

  return (
    <>
      {asset.styles.map((href) => (
        <link rel="stylesheet" href={href} key={href} />
      ))}
      <script src={asset.script} type="module" defer></script>
    </>
  )
}

type EditorInstanceProps = {
  spec: EditorSpec
  payload?: JSONContent
  html?: string
  etag?: string
  nonce?: string
}

/**
 * Server-side rendering helper that emits the toolbar, editor root, and hidden
 * form inputs required for Tiptap hydration.
 */
export const EditorInstance: FC<EditorInstanceProps> = ({
  spec,
  payload = EMPTY_CONTENT,
  html = '',
  etag,
  nonce,
}) => {
  const { id, profile = DEFAULT_EDITOR_PROFILE, documentId } = spec
  const serialized = JSON.stringify(payload)
  const serializedScript = serialized
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  const scriptId = `${id}__content`
  const docId = documentId ?? id
  const imageInputId = `${id}__image-input`
  const imagePanelId = `${id}__image-panel`
  const imageAltId = `${id}__image-alt-input`
  const isFull = isFullEditorProfile(profile)
  const toolbarDataAttrs: Record<string, string> = {
    [DATA_ATTR_TOOLBAR.attr]: '',
    [DATA_ATTR_TOOLBAR_FOR.attr]: id,
  }
  const editorDataAttrs: Record<string, string> = {
    [DATA_ATTR_EDITOR_ROOT.attr]: '',
    [DATA_ATTR_EDITOR_PROFILE.attr]: profile,
    [DATA_ATTR_EDITOR_TOOLBAR_ID.attr]: `${id}__toolbar`,
  }
  const imagePanelDataAttrs: Record<string, string> = {
    [DATA_ATTR_TOOLBAR_FOR.attr]: id,
  }
  if (isFull) {
    editorDataAttrs[DATA_ATTR_EDITOR_IMAGE_INPUT_ID.attr] = imageInputId
    editorDataAttrs[DATA_ATTR_EDITOR_IMAGE_PANEL_ID.attr] = imagePanelId
    editorDataAttrs[DATA_ATTR_EDITOR_IMAGE_ALT_ID.attr] = imageAltId
  }

  return (
    <section class="space-y-2" id={`${id}__section`}>
      {/* Formatting toolbar with data attributes consumed by the editor bootstrap. */}
      <div
        id={`${id}__toolbar`}
        class={MENUBAR_CLASSNAME}
        {...toolbarDataAttrs}
        role="group"
        aria-label="Formatting toolbar"
      >
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'bold' }}
          aria-pressed="false"
        >
          Bold
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'italic' }}
          aria-pressed="false"
        >
          Italic
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'heading-2' }}
          aria-pressed="false"
        >
          H2
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'heading-3' }}
          aria-pressed="false"
        >
          H3
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'blockquote' }}
          aria-pressed="false"
        >
          Quote
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'bullet-list' }}
          aria-pressed="false"
        >
          Bullets
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'ordered-list' }}
          aria-pressed="false"
        >
          Ordered
        </button>
        <button
          type="button"
          class={MENUBAR_BUTTON_CLASSNAME}
          {...{ [DATA_ATTR_COMMAND.attr]: 'section-break' }}
          aria-pressed="false"
          title="Insert section break"
        >
          Section break
        </button>
        {isFull ? (
          <button
            type="button"
            class={MENUBAR_BUTTON_CLASSNAME}
            {...{ [DATA_ATTR_COMMAND.attr]: 'image' }}
            aria-pressed="false"
            title="Insert image"
          >
            Image
          </button>
        ) : null}
      </div>

      {/* Contextual image panel controls, only rendered for the full profile. */}
      {isFull ? (
        <>
          <input id={imageInputId} type="file" accept="image/png,image/jpeg,image/webp" class="hidden" />
          <div
            id={imagePanelId}
            class={`${IMAGE_PANEL_CLASSNAME} hidden`}
            hidden
            data-image-panel
            {...imagePanelDataAttrs}
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
              <label class={IMAGE_PANEL_LABEL_CLASSNAME}>Text wrapping</label>
              <div class={IMAGE_PANEL_BUTTONS_CLASSNAME} role="radiogroup" aria-label="Image wrapping">
                <button
                  type="button"
                  class={IMAGE_PANEL_BUTTON_CLASSNAME}
                  data-wrap="text"
                  aria-pressed="false"
                  title="Allow text to flow around the image"
                >
                  Wrap text
                </button>
                <button
                  type="button"
                  class={IMAGE_PANEL_BUTTON_CLASSNAME}
                  data-wrap="break"
                  aria-pressed="false"
                  title="Break text below the image"
                >
                  Break text
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
                Provide a short description for screen readers. Leave blank only when the image is decorative.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {/* Editor mount point for client-side hydration. */}
      <div
        id={id}
        {...editorDataAttrs}
      />
      <script id={scriptId} type="application/json" nonce={nonce}>
        {raw(serializedScript)}
      </script>
      <input
        type="hidden"
        name={`content_json[${id}]`}
        {...{ [DATA_ATTR_EDITOR_HIDDEN_JSON.attr]: id }}
        value={serialized}
      />
      <input
        type="hidden"
        name={`content_html[${id}]`}
        {...{ [DATA_ATTR_EDITOR_HIDDEN_HTML.attr]: id }}
        value={html}
      />
      <input type="hidden" name={`profile[${id}]`} value={profile} />
      <input type="hidden" name={`document_id[${id}]`} value={docId} />
      {etag ? <input type="hidden" name={`etag[${id}]`} value={etag} /> : null}
    </section>
  )
}

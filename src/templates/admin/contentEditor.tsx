import type { FC } from 'hono/jsx'
import { html } from 'hono/html'

/**
 * Content editor page for administrators.  Utilises Editor.js loaded
 * from a CDN to provide a rich text editing experience.  When the form
 * is submitted the Editor.js instance is saved and its blocks array is
 * serialised into the hidden `json` field.  The slug field is read‑only
 * when editing an existing page.
 */
const ContentEditorPage: FC<{
  slug: string
  title: string
  blocks: any[]
  isNew?: boolean
}> = ({ slug, title, blocks, isNew = false }) => {
  return (
    <div>
      <h1 class="text-2xl font-semibold mb-4">
        {isNew ? 'Create New Page' : 'Edit Page'}
      </h1>
      <form
        id="editor-form"
        action="/admin/content"
        method="post"
        class="space-y-4"
      >
        <div>
          <label class="block text-sm font-medium mb-1">Slug</label>
          {isNew ? (
            <input
              type="text"
              name="slug"
              value={slug}
              required
              class="w-full border rounded px-2 py-1"
            />
          ) : (
            <input
              type="text"
              name="slug"
              value={slug}
              readOnly
              class="w-full border rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
            />
          )}
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={title}
            required
            class="w-full border rounded px-2 py-1"
          />
        </div>
        {/* Hidden input that will be populated with the JSON output from Editor.js */}
        <input type="hidden" name="json" id="json-input" />
        <div>
          <label class="block text-sm font-medium mb-1">Content</label>
          <div
            id="editorjs"
            class="min-h-[300px] border rounded px-2 py-2 bg-white"
          ></div>
        </div>
        <div>
          <button
            type="submit"
            class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </form>
      {/* Load Editor.js core and common tools from CDN.  Only the
          paragraph tool is built in; additional tools must be loaded
          separately【895794428309586†L106-L183】. */}
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.28.2"></script>
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0"></script>
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/list@1.7.0"></script>
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@2.5.0"></script>
      {/* Pass initial blocks data into the script by serialising the JSON.
          We wrap the JSON in a script tag of type application/json so it
          can be safely read without executing code. */}
      <script id="initial-data" type="application/json">
        {JSON.stringify({ blocks: blocks ?? [] })}
      </script>
      {/* Initialise Editor.js and intercept form submission to store
          content.  We use the html helper so the script is not escaped
          【162090446222088†L232-L244】. */}
      {
        html`<script>
          (function () {
            const dataElement = document.getElementById('initial-data');
            const initial = dataElement ? JSON.parse(dataElement.textContent) : { blocks: [] };
            const editor = new EditorJS({
              holder: 'editorjs',
              placeholder: 'Start typing...',
              tools: {
                header: Header,
                list: List,
                quote: Quote,
              },
              data: initial,
            });
            const form = document.getElementById('editor-form');
            form.addEventListener('submit', async function (event) {
              // Save the editor content before the form is submitted
              const output = await editor.save();
              const input = document.getElementById('json-input');
              input.value = JSON.stringify(output.blocks);
            });
          })();
        </script>`
      }
    </div>
  )
}

export default ContentEditorPage
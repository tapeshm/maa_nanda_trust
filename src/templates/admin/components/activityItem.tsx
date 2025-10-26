/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import { EditorInstance } from '../../components/editor'
import { EDITOR_PROFILE_BASIC } from '../../../editor/constants'
import { resolveMediaUrl } from '../../../utils/pages/media'

type ActivityEditorData = {
  id: string
  html: string
  json: JSONContent
}

export type ActivityItemView = {
  id: number | null
  title: string
  imageKey: string | null
  imageAlt: string | null
  pos: number
  editor: ActivityEditorData
}

type ActivityItemProps = {
  index: number
  item: ActivityItemView
  csrfToken: string
}

const ActivityItem: FC<ActivityItemProps> = ({ index, item, csrfToken }) => {
  const { id, title, imageKey, imageAlt, pos, editor } = item
  const mediaKey = imageKey ?? ''
  const previewUrl = mediaKey ? resolveMediaUrl(mediaKey) : ''
  const rowId = id ?? 0
  return (
    <article
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      data-activity-item
      data-item-id={rowId}
    >
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Activity #{index + 1}</h3>
        {id !== null ? (
          <button
            type="button"
            class="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
            hx-delete={`/admin/activities/items/${id}`}
            hx-target="closest [data-activity-item]"
            hx-swap="delete"
            hx-headers={`{"HX-CSRF-Token":"${csrfToken}"}`}
          >
            Remove
          </button>
        ) : null}
      </header>

      <input type="hidden" name={`activities[${index}][id]`} value={id ?? ''} />
      <input type="hidden" name={`activities[${index}][pos]`} value={String(pos)} />
      <input type="hidden" name={`activities[${index}][description_id]`} value={editor.id} />

      <div class="mt-3 space-y-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Title
          <input
            type="text"
            name={`activities[${index}][title]`}
            value={title}
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            required
          />
        </label>
      </div>

      <section class="mt-3 space-y-3">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">Image</h4>
        <div
          class="flex flex-col gap-4 md:flex-row md:items-start"
          data-media-picker
          data-media-upload="/admin/upload-image"
        >
          <figure class="relative flex h-36 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <img
              src={mediaKey ? previewUrl : ''}
              alt="Activity image preview"
              class={`h-full w-full object-cover ${mediaKey ? '' : 'hidden'}`}
              data-media-preview
            />
            <div
              class={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-gray-500 dark:text-gray-300 ${mediaKey ? 'hidden' : ''}`}
              data-media-placeholder
            >
              <svg class="h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span>No image selected</span>
            </div>
          </figure>

          <div class="flex-1 space-y-3 text-sm">
            <label class="block">
              <span class="font-medium text-gray-700 dark:text-gray-200">Upload image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
                data-media-file
              />
            </label>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class={`inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${
                  mediaKey ? '' : 'hidden'
                }`}
                data-media-clear
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M6.28 5.22a.75.75 0 010 1.06L4.56 8l1.72 1.72a.75.75 0 01-1.06 1.06L3.5 9.06l-1.72 1.72a.75.75 0 11-1.06-1.06L2.44 8 .72 6.28A.75.75 0 011.78 5.22L3.5 6.94l1.72-1.72a.75.75 0 011.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Remove image
              </button>
            </div>

            <label class="block text-xs text-gray-600 dark:text-gray-300">
              Media key or URL
              <input
                type="text"
                name={`activities[${index}][image_key]`}
                value={mediaKey}
                data-media-manual
                class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
                placeholder="images/activity.jpg"
              />
            </label>

            <label class="block text-xs text-gray-600 dark:text-gray-300">
              Alt text
              <input
                type="text"
                name={`activities[${index}][image_alt]`}
                value={imageAlt ?? ''}
                class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
                placeholder="Describe the image"
              />
            </label>
          </div>
        </div>
      </section>

      <div class="mt-4 space-y-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">Description</p>
        <EditorInstance
          spec={{ id: editor.id, profile: EDITOR_PROFILE_BASIC, documentId: editor.id }}
          payload={editor.json}
          html={editor.html}
        />
      </div>
    </article>
  )
}

export default ActivityItem

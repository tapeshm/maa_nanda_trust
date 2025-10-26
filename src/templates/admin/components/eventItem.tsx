/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import { EditorInstance } from '../../components/editor'
import { EDITOR_PROFILE_BASIC } from '../../../editor/constants'

type EventEditorData = {
  id: string
  html: string
  json: JSONContent
}

export type EventItemView = {
  id: number | null
  title: string
  imageKey: string | null
  imageAlt: string | null
  startDate: string | null
  endDate: string | null
  pos: number
  editor: EventEditorData
}

type EventItemProps = {
  index: number
  item: EventItemView
  csrfToken: string
}

const EventItem: FC<EventItemProps> = ({ index, item, csrfToken }) => {
  const { id, title, imageKey, imageAlt, startDate, endDate, pos, editor } = item
  const rowId = id ?? 0
  return (
    <article
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      data-event-item
      data-item-id={rowId}
    >
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Event #{index + 1}</h3>
        {id !== null ? (
          <button
            type="button"
            class="text-sm text-red-600 hover:text-red-500 dark:text-red-400"
            hx-delete={`/admin/events/items/${id}`}
            hx-target="closest [data-event-item]"
            hx-swap="delete"
            hx-headers={`{"HX-CSRF-Token":"${csrfToken}"}`}
          >
            Remove
          </button>
        ) : null}
      </header>

      <input type="hidden" name={`events[${index}][id]`} value={id ?? ''} />
      <input type="hidden" name={`events[${index}][pos]`} value={String(pos)} />
      <input type="hidden" name={`events[${index}][description_id]`} value={editor.id} />

      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Title
          <input
            type="text"
            name={`events[${index}][title]`}
            value={title}
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            required
          />
        </label>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Image key
          <input
            type="text"
            name={`events[${index}][image_key]`}
            value={imageKey ?? ''}
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            placeholder="media/uploads/event.jpg"
          />
        </label>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Image alt text
          <input
            type="text"
            name={`events[${index}][image_alt]`}
            value={imageAlt ?? ''}
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            placeholder="Describe the image"
          />
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Start date
            <input
              type="date"
              name={`events[${index}][start_date]`}
              value={startDate ?? ''}
              class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            />
          </label>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
            End date
            <input
              type="date"
              name={`events[${index}][end_date]`}
              value={endDate ?? ''}
              class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
            />
          </label>
        </div>
      </div>

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

export default EventItem

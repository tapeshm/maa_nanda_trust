/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import EventItem, { type EventItemView } from './components/eventItem'
import { EditorInstance } from '../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../config/pages'

type EventsSectionView = {
  kind: 'events'
  pos: number
  contentId: string
  configJson: string
}

type EventsIntroEditor = {
  id: string
  html: string
  json: JSONContent
}

type EventsListProps = {
  items: EventItemView[]
  csrfToken: string
}

export const EventsList: FC<EventsListProps> = ({ items, csrfToken }) => (
  <div id="events-items" class="space-y-4">
    {items.length === 0 ? (
      <p class="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
        No events yet. Use “Add event” to create one.
      </p>
    ) : null}
    {items.map((item, index) => (
      <EventItem key={item.id ?? index} index={index} item={item} csrfToken={csrfToken} />
    ))}
  </div>
)

export type EventsFormProps = {
  csrfToken: string
  action: string
  addAction: string
  reorderAction: string
  pageId: number | null
  title: string
  section: EventsSectionView
  introEditor: EventsIntroEditor
  hidePast: boolean
  items: EventItemView[]
}

const EventsForm: FC<EventsFormProps> = ({
  csrfToken,
  action,
  addAction,
  reorderAction,
  pageId,
  title,
  section,
  introEditor,
  hidePast,
  items,
}) => {
  const editorProfile = PAGE_EDITOR_PROFILES.events
  const listPayload = JSON.stringify({ page_id: pageId ?? '' })

  return (
    <form method="post" action={action} class="space-y-6" hx-boost="true" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <input type="hidden" name="slug" value="events" />
      <input type="hidden" name="sections[0][kind]" value={section.kind} />
      <input type="hidden" name="sections[0][pos]" value={String(section.pos)} />
      <input type="hidden" name="sections[0][content_id]" value={section.contentId} />
      <input type="hidden" name="sections[0][config_json]" value={section.configJson} />

      <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Page title
        <input
          type="text"
          name="title"
          value={title}
          class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
          required
        />
      </label>

      <div class="flex items-center gap-2">
        <input type="hidden" name="events_hide_past" value="0" />
        <input
          id="events-hide-past"
          type="checkbox"
          name="events_hide_past"
          value="1"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={hidePast}
        />
        <label for="events-hide-past" class="text-sm font-medium text-gray-700 dark:text-gray-200">
          Hide past events automatically
        </label>
      </div>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Intro content</h2>
        <EditorInstance
          spec={{ id: introEditor.id, profile: editorProfile, documentId: introEditor.id }}
          payload={introEditor.json}
          html={introEditor.html}
        />
      </section>

      <section class="space-y-4">
        <header class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Events</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Add upcoming events with optional dates and images. Descriptions support rich text.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            hx-post={addAction}
            hx-target="#events-items"
            hx-swap="outerHTML"
            hx-headers={`{"HX-CSRF-Token":"${csrfToken}"}`}
            hx-vals={listPayload}
          >
            Add event
          </button>
        </header>

        <EventsList items={items} csrfToken={csrfToken} />

        <div class="flex justify-end">
          <button
            type="button"
            class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            hx-post={reorderAction}
            hx-target="#events-items"
            hx-swap="outerHTML"
            hx-headers={`{"HX-CSRF-Token":"${csrfToken}"}`}
            hx-vals={listPayload}
          >
            Refresh order
          </button>
        </div>
      </section>

      <div class="flex justify-end">
        <button
          type="submit"
          class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save events draft
        </button>
      </div>
    </form>
  )
}

export default EventsForm

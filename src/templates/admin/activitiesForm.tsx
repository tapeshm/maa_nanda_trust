/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import ActivityItem, { type ActivityItemView } from './components/activityItem'
import { EditorInstance } from '../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../config/pages'

type ActivitiesSectionView = {
  kind: 'activities'
  pos: number
  contentId: string
  configJson: string
}

type ActivitiesIntroEditor = {
  id: string
  html: string
  json: JSONContent
}

type ActivitiesListProps = {
  items: ActivityItemView[]
  csrfToken: string
}

export const ActivitiesList: FC<ActivitiesListProps> = ({ items, csrfToken }) => (
  <div id="activities-items" class="space-y-4">
    {items.length === 0 ? (
      <p class="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
        No activities yet. Use “Add activity” to create one.
      </p>
    ) : null}
    {items.map((item, index) => (
      <ActivityItem key={item.id ?? index} index={index} item={item} csrfToken={csrfToken} />
    ))}
  </div>
)

export type ActivitiesFormProps = {
  csrfToken: string
  action: string
  addAction: string
  reorderAction: string
  pageId: number | null
  title: string
  layout: 'grid' | 'carousel'
  section: ActivitiesSectionView
  introEditor: ActivitiesIntroEditor
  items: ActivityItemView[]
}

const ACTIVITIES_LAYOUT_OPTIONS: Array<{ value: 'grid' | 'carousel'; label: string }> = [
  { value: 'grid', label: 'Grid' },
  { value: 'carousel', label: 'Carousel' },
]

const ActivitiesForm: FC<ActivitiesFormProps> = ({
  csrfToken,
  action,
  addAction,
  reorderAction,
  pageId,
  title,
  layout,
  section,
  introEditor,
  items,
}) => {
  const editorProfile = PAGE_EDITOR_PROFILES.activities
  const listPayload = JSON.stringify({ page_id: pageId ?? '' })

  return (
    <form method="post" action={action} class="space-y-6" hx-boost="true" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <input type="hidden" name="slug" value="activities" />
      <input type="hidden" name="sections[0][kind]" value={section.kind} />
      <input type="hidden" name="sections[0][pos]" value={String(section.pos)} />
      <input type="hidden" name="sections[0][content_id]" value={section.contentId} />

      <div class="grid gap-6 lg:grid-cols-2">
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
        <fieldset class="space-y-2">
          <legend class="text-sm font-medium text-gray-700 dark:text-gray-200">Layout</legend>
          <input type="hidden" name="sections[0][config_json]" value={section.configJson} />
          <div class="flex flex-wrap gap-4">
            {ACTIVITIES_LAYOUT_OPTIONS.map((option) => (
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="radio"
                  name="activities_layout"
                  value={option.value}
                  class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={layout === option.value}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
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
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Activities</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Manage individual activity cards. Changes are saved when you submit the main form.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            hx-post={addAction}
            hx-target="#activities-items"
            hx-swap="outerHTML"
            hx-headers={`{"HX-CSRF-Token":"${csrfToken}"}`}
            hx-vals={listPayload}
          >
            Add activity
          </button>
        </header>

        <ActivitiesList items={items} csrfToken={csrfToken} />

        <div class="flex justify-end">
          <button
            type="button"
            class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            hx-post={reorderAction}
            hx-target="#activities-items"
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
          Save activities draft
        </button>
      </div>
    </form>
  )
}

export default ActivitiesForm

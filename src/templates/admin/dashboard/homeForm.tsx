/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import { EditorInstance } from '../../components/editor'

const EMPTY_EDITOR_CONTENT: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export type HomeFormProps = {
  csrfToken?: string
  action?: string
  method?: 'post' | 'get'
  title?: string
  heroImageKey?: string
  intro?: string
  editorHtml?: string
  editorJson?: JSONContent
}

const HomeForm: FC<HomeFormProps> = ({
  csrfToken,
  action = '#',
  method = 'post',
  title = '',
  heroImageKey = '',
  intro = '',
  editorHtml = '',
  editorJson = EMPTY_EDITOR_CONTENT,
}) => {
  return (
    <form
      data-home-form
      method={method}
      action={action}
      class="space-y-10"
    >
      {csrfToken ? <input type="hidden" name="csrf_token" value={csrfToken} /> : null}

      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Hero section</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Configure the hero title, background image, and short introduction shown on the Home page.
          </p>
        </div>
        <div class="md:col-span-2">
          <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
            <div class="px-4 py-6 sm:p-8">
              <div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
                <div class="sm:col-span-6">
                  <label htmlFor="home-title" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                    Title
                  </label>
                  <div class="mt-2">
                    <input
                      id="home-title"
                      name="title"
                      type="text"
                      value={title}
                      class="block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div class="sm:col-span-6">
                  <label htmlFor="home-hero-image" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                    Background image key
                  </label>
                  <div class="mt-2">
                    <input
                      id="home-hero-image"
                      name="hero_image_key"
                      type="text"
                      value={heroImageKey}
                      class="block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Provide an R2 media key for the hero background.</p>
                </div>

                <div class="sm:col-span-6">
                  <label htmlFor="home-intro" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                    Short intro
                  </label>
                  <div class="mt-2">
                    <textarea
                      id="home-intro"
                      name="intro"
                      rows={3}
                      class="block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-gray-500"
                    >{intro}</textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">General content</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Use the rich text editor to manage the main body content of the Home page.
          </p>
        </div>
        <div class="md:col-span-2">
          <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
            <div class="px-4 py-6 sm:p-8 space-y-4">
              <EditorInstance spec={{ id: 'home_body' }} html={editorHtml} payload={editorJson} />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Drag and drop images to embed them directly within the content.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Activities</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Placeholder card for featured activities. Detailed configuration will be wired in the next step.
          </p>
        </div>
        <div class="md:col-span-2">
          <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
            <div class="px-4 py-6 sm:p-8">
              <p class="text-sm leading-6 text-gray-700 dark:text-gray-300">
                Activities preview coming soon. Admins will be able to curate activity cards once the data model is connected.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Events</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Placeholder for upcoming events. Editing tools will be added alongside the events data model.
          </p>
        </div>
        <div class="md:col-span-2">
          <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
            <div class="px-4 py-6 sm:p-8">
              <p class="text-sm leading-6 text-gray-700 dark:text-gray-300">
                Events preview coming soon. Stay tuned for configuration options once events content is wired up.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div class="flex items-center justify-end gap-x-4 border-t border-gray-900/10 pt-6 dark:border-white/10">
        <button
          type="button"
          class="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Save disabled
        </button>
      </div>
    </form>
  )
}

export default HomeForm

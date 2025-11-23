/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import { EditorInstance } from '../../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../../config/pages'
import { EDITOR_PROFILE_FULL } from '../../../editor/constants'
import { resolveMediaUrl } from '../../../utils/pages/media'

export type GenericPageFormProps = {
  csrfToken: string
  action: string
  slug: string
  title: string
  heroImageKey: string | null
  editor: {
    id: string
    html: string
    json: JSONContent
  }
}

const GenericPageForm: FC<GenericPageFormProps> = ({
  csrfToken,
  action,
  slug,
  title,
  heroImageKey,
  editor,
}) => {
  const heroValue = heroImageKey ?? ''
  const previewUrl = heroValue ? resolveMediaUrl(heroValue) : ''
  
  return (
    <form method="post" action={action} class="space-y-6" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="_redirect" value={`/admin/dashboard/${slug === 'about' ? 'about-us' : slug}`} />
      <input type="hidden" name="sections[0][kind]" value="content" />
      <input type="hidden" name="sections[0][pos]" value="0" />
      <input type="hidden" name="sections[0][content_id]" value={editor.id} />

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
      </div>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Hero image</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Upload a featured image for the page hero section.
        </p>
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start"
          data-media-picker
          data-media-upload="/admin/upload-image"
        >
          <figure class="relative flex h-44 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <img
              src={heroValue ? previewUrl : ''}
              alt="Hero image preview"
              class={`h-full w-full object-cover ${heroValue ? '' : 'hidden'}`}
              data-media-preview
            />
            <div
              class={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-gray-500 dark:text-gray-300 ${heroValue ? 'hidden' : ''}`}
              data-media-placeholder
            >
              <svg class="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span>No hero image selected</span>
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
              <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                Supports JPG, PNG, or WebP up to 5&nbsp;MB.
              </span>
            </label>

            <button
              type="button"
              class={`inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${heroValue ? '' : 'hidden'
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

            <details class="text-xs text-gray-600 dark:text-gray-300">
              <summary class="cursor-pointer select-none text-sm font-medium text-indigo-600 dark:text-indigo-300">
                Use existing media key
              </summary>
              <label class="mt-2 block text-xs text-gray-600 dark:text-gray-300">
                Media key
                <input
                  type="text"
                  name="hero_image_key"
                  value={heroValue}
                  data-media-manual
                  class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
                  placeholder="images/hero.jpg"
                />
              </label>
            </details>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Content</h2>
        <EditorInstance
          spec={{ id: editor.id, profile: PAGE_EDITOR_PROFILES[slug as keyof typeof PAGE_EDITOR_PROFILES] ?? EDITOR_PROFILE_FULL, documentId: editor.id }}
          payload={editor.html} 
          html={editor.html}
        />
      </section>

      <div class="flex justify-end">
        <button
          type="submit"
          class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save {slug} draft
        </button>
      </div>
    </form>
  )
}

export default GenericPageForm

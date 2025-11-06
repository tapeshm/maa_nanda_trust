/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { JSONContent } from '@tiptap/core'
import type { PageSectionKind } from '../../config/pages'
import { EditorInstance } from '../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../config/pages'
import { EDITOR_PROFILE_FULL } from '../../editor/constants'
import { resolveMediaUrl } from '../../utils/pages/media'

type LandingSectionView = {
  kind: PageSectionKind
  pos: number
  contentId?: string | null
}

type LandingEditorData = {
  id: string
  html: string
  json: JSONContent
}

export type LandingFormProps = {
  csrfToken: string
  action: string
  title: string
  heroImageKey: string | null
  donateEnabled: boolean
  sections: LandingSectionView[]
  editor: LandingEditorData
}

const LandingForm: FC<LandingFormProps> = ({
  csrfToken,
  action,
  title,
  heroImageKey,
  donateEnabled,
  sections,
  editor,
}) => {
  const heroValue = heroImageKey ?? ''
  const previewUrl = heroValue ? resolveMediaUrl(heroValue) : ''
  return (
    <form method="post" action={action} class="space-y-6" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <input type="hidden" name="slug" value="landing" />

      {sections.map((section, index) => (
        <div>
          <input type="hidden" name={`sections[${index}][kind]`} value={section.kind} />
          <input type="hidden" name={`sections[${index}][pos]`} value={String(section.pos)} />
          {section.contentId ? (
            <input type="hidden" name={`sections[${index}][content_id]`} value={section.contentId} />
          ) : null}
        </div>
      ))}

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

      <div class="flex items-center gap-2">
        <input type="hidden" name="donate_enabled" value="0" />
        <input
          id="landing-donate"
          type="checkbox"
          name="donate_enabled"
          value="1"
          class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={donateEnabled}
        />
        <label for="landing-donate" class="text-sm font-medium text-gray-700 dark:text-gray-200">
          Show donate button
        </label>
      </div>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Hero image</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Upload a featured image for the landing page hero section. Use a landscape photo at least 1600×900.
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
                  placeholder="images/landing-hero.jpg"
                />
              </label>
            </details>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Welcome content</h2>
        <EditorInstance
          spec={{ id: editor.id, profile: PAGE_EDITOR_PROFILES.landing ?? EDITOR_PROFILE_FULL, documentId: editor.id }}
          payload={editor.json}
          html={editor.html}
        />
      </section>

      <section class="space-y-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Section order</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Sections determine how the landing page assembles welcome content, featured activities, and events.
        </p>
        <ol class="list-inside list-decimal text-sm text-gray-700 dark:text-gray-200">
          {sections
            .slice()
            .sort((a, b) => a.pos - b.pos)
            .map((section) => (
              <li>{section.kind}</li>
            ))}
        </ol>
      </section>

      <div class="flex justify-end">
        <button
          type="submit"
          class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save landing draft
        </button>
      </div>
    </form>
  )
}

export default LandingForm

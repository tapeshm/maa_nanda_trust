/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { DonatePageContentRaw } from '../../../data/donate'
import { EditorInstance } from '../../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../../config/pages'
import { EDITOR_PROFILE_FULL } from '../../../editor/constants'
import { resolveMediaUrl } from '../../../utils/pages/media'

export type DonatePageFormProps = {
  csrfToken: string
  donateContent: DonatePageContentRaw
}

const DonatePageForm: FC<DonatePageFormProps> = ({ csrfToken, donateContent }) => {
  const previewUrl = donateContent.qrCodeUrl ? resolveMediaUrl(donateContent.qrCodeUrl) : '';

  return (
    <form method="post" action="/admin/dashboard/donate/save" class="space-y-8 max-w-4xl" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      {/* QR Code Image */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">QR Code</h3>
        <div class="sm:col-span-7">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload QR Code Image</label>
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start"
              data-media-picker
              data-media-upload="/admin/upload-image"
            >
              <figure class="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800 shrink-0">
                <img
                  src={previewUrl}
                  alt="QR Code Preview"
                  class={`h-full w-full object-contain ${donateContent.qrCodeUrl ? '' : 'hidden'}`}
                  data-media-preview
                />
                <div
                  class={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm text-gray-500 dark:text-gray-300 ${donateContent.qrCodeUrl ? 'hidden' : ''}`}
                  data-media-placeholder
                >
                  <span>No QR Code selected</span>
                </div>
              </figure>

              <div class="flex-1 space-y-2 text-sm">
                <label class="block">
                  <span class="font-medium text-gray-700 dark:text-gray-200">Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="mt-1 block w-full text-sm text-gray-900 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
                    data-media-file
                  />
                </label>

                <button
                  type="button"
                  class={`inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${donateContent.qrCodeUrl ? '' : 'hidden'}`}
                  data-media-clear
                >
                  Remove
                </button>

                <div class="text-gray-600 dark:text-gray-300">
                  <label class="block mb-1">Media key</label>
                  <input
                    type="text"
                    name="qr_code_url"
                    value={donateContent.qrCodeUrl}
                    data-media-manual
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm dark:border-gray-600 dark:bg-gray-900"
                    placeholder="images/qr-code.png"
                  />
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Appeal Section */}
      <div class="pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Appeal Content</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (English)</label>
             <EditorInstance
              spec={{ id: 'appeal-editor-en', profile: PAGE_EDITOR_PROFILES.default ?? EDITOR_PROFILE_FULL, documentId: 'appeal-editor-en' }}
              payload={donateContent.appeal.en} 
              html={donateContent.appeal.en}
            />
          </div>
          <div class="sm:col-span-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Hindi)</label>
             <EditorInstance
              spec={{ id: 'appeal-editor-hi', profile: PAGE_EDITOR_PROFILES.default ?? EDITOR_PROFILE_FULL, documentId: 'appeal-editor-hi' }}
              payload={donateContent.appeal.hi} 
              html={donateContent.appeal.hi}
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <a href="/admin/dashboard" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-700">
          Cancel
        </a>
        <button
          type="submit"
          class="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
}

export default DonatePageForm
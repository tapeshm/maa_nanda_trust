/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { AboutPageContent } from '../../../data/about'
import { EditorInstance } from '../../components/editor'
import { PAGE_EDITOR_PROFILES } from '../../../config/pages'
import { EDITOR_PROFILE_FULL } from '../../../editor/constants'

import { resolveMediaUrl } from '../../../utils/pages/media'

export type AboutPageFormProps = {
  csrfToken: string
  aboutContent: AboutPageContent
}

const AboutPageForm: FC<AboutPageFormProps> = ({ csrfToken, aboutContent }) => {
  
  const valuesRowTemplate = `
    <div class="sm:col-span-4">
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Title</label>
      <input type="text" name="values_title[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
    </div>
    <div class="sm:col-span-7">
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
      <input type="text" name="values_description[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
    </div>
    <div class="sm:col-span-1 flex justify-end pt-6">
        <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="this.closest('.grid').remove()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
    </div>
  `;

  const trusteesRowTemplate = `
     <div class="sm:col-span-4 space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
          <input type="text" name="trustees_name[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Role</label>
          <input type="text" name="trustees_role[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Bio</label>
          <textarea name="trustees_bio[]" rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"></textarea>
        </div>
    </div>
    
    <div class="sm:col-span-7">
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Image</label>
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start"
        data-media-picker
        data-media-upload="/admin/upload-image"
      >
        <figure class="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800 shrink-0">
          <img
            src=""
            alt="Preview"
            class="h-full w-full object-cover hidden"
            data-media-preview
          />
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[10px] text-gray-500 dark:text-gray-300"
            data-media-placeholder
          >
            <span>No image</span>
          </div>
        </figure>

        <div class="flex-1 space-y-2 text-xs">
          <label class="block">
            <span class="font-medium text-gray-700 dark:text-gray-200">Upload</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="mt-1 block w-full text-xs text-gray-900 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
              data-media-file
            />
          </label>

          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 hidden"
            data-media-clear
          >
            Remove
          </button>

          <div class="text-gray-600 dark:text-gray-300">
            <label class="block mb-1">Media key</label>
            <input
              type="text"
              name="trustees_image_url[]"
              data-media-manual
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs dark:border-gray-600 dark:bg-gray-900"
              placeholder="images/..."
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sm:col-span-1 flex justify-end">
        <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="this.closest('.grid').remove()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
    </div>
  `;

  return (
    <form method="post" action="/admin/dashboard/about-us/save" class="space-y-8 max-w-4xl" data-editor-form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      {/* Hero Section */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Hero Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="hero_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <div class="mt-1">
              <input type="text" name="hero_title" id="hero_title" value={aboutContent.hero.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-6">
            <label for="hero_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <div class="mt-1">
              <textarea id="hero_description" name="hero_description" rows={3} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">{aboutContent.hero.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Mission</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="mission_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <div class="mt-1">
              <input type="text" name="mission_title" id="mission_title" value={aboutContent.mission.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
             <EditorInstance
              spec={{ id: 'mission-editor', profile: PAGE_EDITOR_PROFILES.default ?? EDITOR_PROFILE_FULL, documentId: 'mission-editor' }}
              payload={aboutContent.mission.description} 
              html={aboutContent.mission.description}
            />
          </div>
        </div>
      </div>

      {/* Vision Section */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Vision</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="vision_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <div class="mt-1">
              <input type="text" name="vision_title" id="vision_title" value={aboutContent.vision.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-6">
            <label for="vision_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <div class="mt-1">
              <textarea id="vision_description" name="vision_description" rows={3} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">{aboutContent.vision.description}</textarea>
            </div>
          </div>
        </div>
      </div>

       {/* Values Section (Dynamic List) */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Values</h3>
        <div id="values-list" class="space-y-4">
          {aboutContent.values.map((value, index) => (
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg relative group">
               <div class="sm:col-span-4">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Title</label>
                <input type="text" name={`values_title[]`} value={value.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div class="sm:col-span-7">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
                <input type="text" name={`values_description[]`} value={value.description} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div class="sm:col-span-1 flex justify-end pt-6">
                  <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="this.closest('.grid').remove()">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
              </div>
            </div>
          ))}
        </div>
        <div class="mt-4">
            <button type="button" id="add-value-btn" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                + Add Value
            </button>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
            document.getElementById('add-value-btn').addEventListener('click', function() {
                const list = document.getElementById('values-list');
                const newItem = document.createElement('div');
                newItem.className = 'grid grid-cols-1 gap-4 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg relative group animate-fade-in';
                newItem.innerHTML = ${JSON.stringify(valuesRowTemplate)};
                list.appendChild(newItem);
            });
        `}} />
      </div>

      {/* Trustees Section (Dynamic List) */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Trustees</h3>
        <div id="trustees-list" class="space-y-8">
          {aboutContent.trustees.map((trustee, index) => {
            const previewUrl = trustee.imageUrl ? resolveMediaUrl(trustee.imageUrl) : '';
            return (
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg relative group">
               <div class="sm:col-span-4 space-y-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
                    <input type="text" name={`trustees_name[]`} value={trustee.name} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Role</label>
                    <input type="text" name={`trustees_role[]`} value={trustee.role} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Bio</label>
                    <textarea name={`trustees_bio[]`} rows={3} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">{trustee.bio}</textarea>
                  </div>
              </div>
              
              <div class="sm:col-span-7">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Image</label>
                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-start"
                  data-media-picker
                  data-media-upload="/admin/upload-image"
                >
                  <figure class="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800 shrink-0">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      class={`h-full w-full object-cover ${trustee.imageUrl ? '' : 'hidden'}`}
                      data-media-preview
                    />
                    <div
                      class={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[10px] text-gray-500 dark:text-gray-300 ${trustee.imageUrl ? 'hidden' : ''}`}
                      data-media-placeholder
                    >
                      <span>No image</span>
                    </div>
                  </figure>

                  <div class="flex-1 space-y-2 text-xs">
                    <label class="block">
                      <span class="font-medium text-gray-700 dark:text-gray-200">Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        class="mt-1 block w-full text-xs text-gray-900 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
                        data-media-file
                      />
                    </label>

                    <button
                      type="button"
                      class={`inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${trustee.imageUrl ? '' : 'hidden'}`}
                      data-media-clear
                    >
                      Remove
                    </button>

                    <div class="text-gray-600 dark:text-gray-300">
                      <label class="block mb-1">Media key</label>
                      <input
                        type="text"
                        name="trustees_image_url[]"
                        value={trustee.imageUrl}
                        data-media-manual
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs dark:border-gray-600 dark:bg-gray-900"
                        placeholder="images/..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="sm:col-span-1 flex justify-end">
                  <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="this.closest('.grid').remove()">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
              </div>
            </div>
          )})}
        </div>
        <div class="mt-4">
            <button type="button" id="add-trustee-btn" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                + Add Trustee
            </button>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
            document.getElementById('add-trustee-btn').addEventListener('click', function() {
                const list = document.getElementById('trustees-list');
                const newItem = document.createElement('div');
                newItem.className = 'grid grid-cols-1 gap-6 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg relative group animate-fade-in';
                newItem.innerHTML = ${JSON.stringify(trusteesRowTemplate)};
                list.appendChild(newItem);
            });
        `}} />
      </div>

      {/* Story Section */}
      <div class="pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Our Story</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="story_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <div class="mt-1">
              <input type="text" name="story_title" id="story_title" value={aboutContent.story.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
             <EditorInstance
              spec={{ id: 'story-editor', profile: PAGE_EDITOR_PROFILES.default ?? EDITOR_PROFILE_FULL, documentId: 'story-editor' }}
              payload={aboutContent.story.description} 
              html={aboutContent.story.description}
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

export default AboutPageForm
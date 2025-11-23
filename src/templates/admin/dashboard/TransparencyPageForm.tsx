/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { TransparencyPageContent } from '../../../data/transparency'

export type TransparencyPageFormProps = {
  csrfToken: string
  transparencyContent: TransparencyPageContent
}

const TransparencyPageForm: FC<TransparencyPageFormProps> = ({ csrfToken, transparencyContent }) => {
  
  const propertyRowTemplate = `
    <div class="flex gap-4 items-start w-full">
      <input type="text" name="property_details[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <button type="button" class="text-red-500 hover:text-red-700 p-2" onclick="this.closest('.flex').remove()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  `;

  const documentRowTemplate = `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg relative group">
       <div class="sm:col-span-4">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
        <input type="text" name="document_names[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>
      <div class="sm:col-span-4">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">URL / Key</label>
        <input type="text" name="document_urls[]" placeholder="/documents/..." class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>
      <div class="sm:col-span-3">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
        <input type="text" name="document_descriptions[]" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>
      <div class="sm:col-span-1 flex justify-end pt-6">
          <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="this.closest('.grid').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
      </div>
    </div>
  `;

  return (
    <form method="post" action="/admin/dashboard/transparency/save" class="space-y-8 max-w-4xl">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      {/* Hero Section */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Hero Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="hero_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <div class="mt-1">
              <input type="text" name="hero_title" id="hero_title" value={transparencyContent.hero.title} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-6">
            <label for="hero_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <div class="mt-1">
              <textarea id="hero_description" name="hero_description" rows={2} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">{transparencyContent.hero.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Details */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Trust Details</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-3">
            <label for="trust_name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Trust Name</label>
            <div class="mt-1">
              <input type="text" name="trust_name" id="trust_name" value={transparencyContent.trustDetails.trustName} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-3">
            <label for="registration_number" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Registration Number</label>
            <div class="mt-1">
              <input type="text" name="registration_number" id="registration_number" value={transparencyContent.trustDetails.registrationNumber} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div class="sm:col-span-3">
            <label for="registration_date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Registration</label>
            <div class="mt-1">
              <input type="text" name="registration_date" id="registration_date" value={transparencyContent.trustDetails.dateOfRegistration} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Property Details (Dynamic List) */}
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Property Details</h3>
        <div id="property-list" class="space-y-3">
          {transparencyContent.propertyDetails.map((detail, index) => (
            <div class="flex gap-4 items-start w-full">
              <input type="text" name={`property_details[]`} value={detail} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              <button type="button" class="text-red-500 hover:text-red-700 p-2" onclick="this.closest('.flex').remove()">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div class="mt-4">
            <button type="button" id="add-property-btn" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                + Add Property
            </button>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
            document.getElementById('add-property-btn').addEventListener('click', function() {
                const list = document.getElementById('property-list');
                const newItem = document.createElement('div');
                // No extra class needed for wrapper div itself as template handles it, or just append raw HTML string to innerHTML if wrapper created?
                // Better to create wrapper div matching the row structure if row structure is complex, but here row is just flex div.
                // Actually, template is 'div.flex', so we create a placeholder, set innerHTML to template, then append first child.
                const temp = document.createElement('div');
                temp.innerHTML = ${JSON.stringify(propertyRowTemplate)};
                list.appendChild(temp.firstElementChild);
            });
        `}} />
      </div>

      {/* Documents Section (Dynamic List) */}
      <div class="pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Documents</h3>
        <div id="documents-list" class="space-y-4">
          {transparencyContent.documents.map((doc, index) => (
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg relative group">
               <div class="sm:col-span-4">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
                <input type="text" name={`document_names[]`} value={doc.name} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div class="sm:col-span-4">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">URL / Key</label>
                <input type="text" name={`document_urls[]`} value={doc.url} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div class="sm:col-span-3">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
                <input type="text" name={`document_descriptions[]`} value={doc.description} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
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
            <button type="button" id="add-document-btn" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                + Add Document
            </button>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
            document.getElementById('add-document-btn').addEventListener('click', function() {
                const list = document.getElementById('documents-list');
                const temp = document.createElement('div');
                temp.innerHTML = ${JSON.stringify(documentRowTemplate)};
                list.appendChild(temp.firstElementChild);
            });
        `}} />
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

export default TransparencyPageForm

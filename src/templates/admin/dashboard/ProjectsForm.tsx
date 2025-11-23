/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { Project } from '../../../data/projects'
import * as Editor from '../../components/editor'
import { resolveMediaUrl } from '../../../utils/pages/media'

export type ProjectsFormProps = {
  csrfToken: string;
  project?: Project;
}

const ProjectsForm: FC<ProjectsFormProps> = ({ csrfToken, project }) => {
  const isEditing = !!project;
  const imageUrl = project?.imageUrl || '';
  const previewUrl = imageUrl ? resolveMediaUrl(imageUrl) : '';

  // Helper to get team member at index
  const getTeamMember = (index: number) => {
    if (!project?.team || !project.team[index]) return { role: '', name: '' };
    return project.team[index];
  };

  return (
    <form
      method="post"
      action="/admin/save/project"
      class="space-y-10"
      data-editor-form
    >
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      {/* --- Basic Info --- */}
      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Basic Information</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Core details of the project. {isEditing ? "The Project ID is fixed." : "The Project ID will be auto-generated from the title."}
          </p>
        </div>
        <div class="md:col-span-2">
          <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 p-8">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-6">
              {isEditing && (
                <div class="sm:col-span-6">
                    <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Project ID</label>
                    <input type="hidden" name="id" value={project.id} />
                    <div class="mt-2 block w-full rounded-md border-0 bg-gray-100 px-3 py-1.5 text-base text-gray-500 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-gray-400 dark:ring-white/10">
                        {project.id}
                    </div>
                </div>
              )}

              <div class="sm:col-span-6">
                <label for="title" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Title</label>
                <input type="text" name="title" id="title" value={project?.title} required class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
              </div>
              <div class="sm:col-span-6">
                <label for="description" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Short Description</label>
                <textarea name="description" id="description" rows={2} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10">{project?.description}</textarea>
              </div>
              <div class="sm:col-span-6">
                <label for="longDescription" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Long Description</label>
                <Editor.EditorInstance
                  spec={{ id: 'project-long-description', profile: 'full' }}
                  payload={project?.longDescription || ''}
                  html={project?.longDescription || ''}
                />
              </div>
              
              {/* --- Image Upload (Data Media Picker) --- */}
              <div class="sm:col-span-6 space-y-3">
                <label class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Project Image</label>
                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-start"
                  data-media-picker
                  data-media-upload="/admin/upload-image"
                >
                  <figure class="relative flex h-44 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
                    <img
                      src={previewUrl}
                      alt="Project image preview"
                      class={`h-full w-full object-cover ${imageUrl ? '' : 'hidden'}`}
                      data-media-preview
                    />
                    <div
                      class={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-gray-500 dark:text-gray-300 ${imageUrl ? 'hidden' : ''}`}
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
                      <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Supports JPG, PNG, or WebP up to 5&nbsp;MB.
                      </span>
                    </label>

                    <button
                      type="button"
                      class={`inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 ${imageUrl ? '' : 'hidden'}`}
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
                          name="imageUrl"
                          value={imageUrl}
                          data-media-manual
                          class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
                          placeholder="images/project-image.jpg"
                        />
                      </label>
                    </details>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- Details --- */}
      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Project Details</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Location, dates, and status.
          </p>
        </div>
        <div class="md:col-span-2">
            <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 p-8">
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-6">
                    <div class="sm:col-span-4">
                        <label for="location" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Location</label>
                        <input type="text" name="location" id="location" value={project?.location} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                    </div>
                    <div class="sm:col-span-2">
                        <label for="status" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Status</label>
                        <select id="status" name="status" class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-2 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10">
                            <option selected={project?.status === 'Planned'}>Planned</option>
                            <option selected={project?.status === 'Ongoing'}>Ongoing</option>
                            <option selected={project?.status === 'Completed'}>Completed</option>
                        </select>
                    </div>
                    <div class="sm:col-span-3">
                        <label for="startDate" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Start Date</label>
                        <input type="date" name="startDate" id="startDate" value={project?.startDate} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                    </div>
                    <div class="sm:col-span-3">
                        <label for="endDate" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">End Date</label>
                        <input type="text" name="endDate" id="endDate" value={project?.endDate} placeholder="YYYY-MM-DD or 'N/A'" class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- Financials & Team --- */}
      <section class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div class="px-4 sm:px-0">
          <h2 class="text-base font-semibold leading-7 text-gray-900 dark:text-white">Financials & Team</h2>
          <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Budget details and team members.
          </p>
        </div>
        <div class="md:col-span-2">
            <div class="bg-white shadow-xs outline outline-gray-900/5 sm:rounded-xl dark:bg-gray-900 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 p-8">
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-6">
                    <div class="sm:col-span-3">
                        <label for="budget" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Budget</label>
                        <input type="number" name="budget" id="budget" value={project?.budget} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                    </div>
                    <div class="sm:col-span-3">
                        <label for="spent" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Amount Spent</label>
                        <input type="number" name="spent" id="spent" value={project?.spent} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                    </div>
                    
                    <div class="col-span-full border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Contact Person</h3>
                      <div class="grid grid-cols-1 gap-6 sm:grid-cols-6">
                        <div class="sm:col-span-3">
                          <label for="contactName" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Name</label>
                          <input type="text" name="contactName" id="contactName" value={project?.contactPerson?.name} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                        </div>
                         <div class="sm:col-span-3">
                          <label for="contactAvatar" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Avatar URL</label>
                          <input type="text" name="contactAvatar" id="contactAvatar" value={project?.contactPerson?.avatarUrl} class="mt-2 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                        </div>
                      </div>
                    </div>

                    <div class="col-span-full border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Team Members</h3>
                        <p class="text-xs text-gray-500 mb-4">Add up to 5 team members.</p>
                        <div class="space-y-3">
                            {[0, 1, 2, 3, 4].map(i => {
                                const member = getTeamMember(i);
                                return (
                                    <div class="flex gap-4">
                                        <div class="w-1/2">
                                            <input type="text" name="teamRole[]" placeholder="Role" value={member.role} class="block w-full rounded-md border-0 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                                        </div>
                                        <div class="w-1/2">
                                            <input type="text" name="teamName[]" placeholder="Name" value={member.name} class="block w-full rounded-md border-0 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-white dark:ring-white/10" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </section>

      <div class="flex items-center justify-end gap-x-4 border-t border-gray-900/10 pt-6 dark:border-white/10">
        <a href="/admin/dashboard/projects" class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Cancel</a>
        <button
          type="submit"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {isEditing ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}

export default ProjectsForm

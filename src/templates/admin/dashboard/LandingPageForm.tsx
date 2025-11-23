import type { FC } from 'hono/jsx'
import type { LandingPageContent } from '../../../data/landing'

export type LandingPageFormProps = {
  csrfToken: string
  landingContent: LandingPageContent
}

const LandingPageForm: FC<LandingPageFormProps> = ({ csrfToken, landingContent }) => {
  return (
    <form method="post" action="/admin/dashboard/home/save" class="space-y-8 max-w-4xl">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Hero Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="hero_eyebrow" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Eyebrow
            </label>
            <div class="mt-1">
              <input
                type="text"
                name="hero_eyebrow"
                id="hero_eyebrow"
                value={landingContent.hero.eyebrow}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-4">
            <label for="hero_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <div class="mt-1">
              <input
                type="text"
                name="hero_title"
                id="hero_title"
                value={landingContent.hero.title}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-6">
            <label for="hero_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div class="mt-1">
              <textarea
                id="hero_description"
                name="hero_description"
                rows={3}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >{landingContent.hero.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Welcome Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="welcome_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <div class="mt-1">
              <input
                type="text"
                name="welcome_title"
                id="welcome_title"
                value={landingContent.welcome.title}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-6">
            <label for="welcome_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div class="mt-1">
              <textarea
                id="welcome_description"
                name="welcome_description"
                rows={3}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >{landingContent.welcome.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Projects Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="projects_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <div class="mt-1">
              <input
                type="text"
                name="projects_title"
                id="projects_title"
                value={landingContent.projectsSection.title}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-6">
            <label for="projects_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div class="mt-1">
              <textarea
                id="projects_description"
                name="projects_description"
                rows={3}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >{landingContent.projectsSection.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Events Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-4">
            <label for="events_title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <div class="mt-1">
              <input
                type="text"
                name="events_title"
                id="events_title"
                value={landingContent.eventsSection.title}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-6">
            <label for="events_description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div class="mt-1">
              <textarea
                id="events_description"
                name="events_description"
                rows={3}
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >{landingContent.eventsSection.description}</textarea>
            </div>
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

export default LandingPageForm

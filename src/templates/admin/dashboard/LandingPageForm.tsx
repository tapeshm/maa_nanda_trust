import type { FC } from 'hono/jsx'
import type { LandingPageContentRaw } from '../../../data/landing'

export type LandingPageFormProps = {
  csrfToken: string
  landingContent: LandingPageContentRaw
}

const LocalizedInput = ({ label, id, values }: { label: string, id: string, values: { en: string, hi: string } }) => (
  <div class="sm:col-span-4">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for={`${id}_en`} class="block text-xs text-gray-500 dark:text-gray-400 mb-1">English</label>
        <input
          type="text"
          name={`${id}_en`}
          id={`${id}_en`}
          value={values.en}
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>
      <div>
        <label for={`${id}_hi`} class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hindi</label>
        <input
          type="text"
          name={`${id}_hi`}
          id={`${id}_hi`}
          value={values.hi}
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi"
        />
      </div>
    </div>
  </div>
)

const LocalizedTextarea = ({ label, id, values }: { label: string, id: string, values: { en: string, hi: string } }) => (
  <div class="sm:col-span-6">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label}
    </label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for={`${id}_en`} class="block text-xs text-gray-500 dark:text-gray-400 mb-1">English</label>
        <textarea
          id={`${id}_en`}
          name={`${id}_en`}
          rows={3}
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >{values.en}</textarea>
      </div>
      <div>
        <label for={`${id}_hi`} class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hindi</label>
        <textarea
          id={`${id}_hi`}
          name={`${id}_hi`}
          rows={3}
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi"
        >{values.hi}</textarea>
      </div>
    </div>
  </div>
)

const LandingPageForm: FC<LandingPageFormProps> = ({ csrfToken, landingContent }) => {
  return (
    <form method="post" action="/admin/dashboard/home/save" class="space-y-8 max-w-5xl">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      
      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Hero Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <LocalizedInput label="Eyebrow" id="hero_eyebrow" values={landingContent.hero.eyebrow} />
          <LocalizedInput label="Title" id="hero_title" values={landingContent.hero.title} />
          <LocalizedTextarea label="Description" id="hero_description" values={landingContent.hero.description} />
        </div>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Welcome Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <LocalizedInput label="Title" id="welcome_title" values={landingContent.welcome.title} />
          <LocalizedTextarea label="Description" id="welcome_description" values={landingContent.welcome.description} />
        </div>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Projects Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <LocalizedInput label="Title" id="projects_title" values={landingContent.projectsSection.title} />
          <LocalizedTextarea label="Description" id="projects_description" values={landingContent.projectsSection.description} />
        </div>
      </div>

      <div class="pb-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Events Section</h3>
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <LocalizedInput label="Title" id="events_title" values={landingContent.eventsSection.title} />
          <LocalizedTextarea label="Description" id="events_description" values={landingContent.eventsSection.description} />
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
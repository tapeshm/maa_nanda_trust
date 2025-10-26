/** @jsxImportSource hono/jsx */

import Layout from './layout'
import type { HtmlEscapedString } from 'hono/utils/html'
import {
  ActivitiesSection,
  buildActivityViews,
  getActivitiesSection,
} from './activitiesTemplate'
import {
  EventsSection,
  buildEventViews,
  getEventsSection,
  shouldHidePastEvents,
} from './eventsTemplate'
import RichText from './components/RichText'
import { resolveMediaUrl } from '../utils/pages/media'
import type { TemplateSnapshot } from '../types/pages'

type Snapshot = TemplateSnapshot
type SectionRecord = Snapshot['sections'][number]

export interface LandingRenderOptions {
  signedIn?: boolean
  currentDate?: string
  toolbar?: unknown
}

type RenderOutput = HtmlEscapedString | Promise<HtmlEscapedString>

export function renderLanding(
  snapshot: Snapshot,
  options: LandingRenderOptions = {},
): RenderOutput {
  const sections = sortSections(snapshot.sections)
  const activitiesSection = getActivitiesSection(snapshot.sections)
  const activityCards = buildActivityViews(snapshot.activities)
  const eventsSection = getEventsSection(snapshot.sections)
  const hidePast = shouldHidePastEvents(eventsSection)
  const currentDate = options.currentDate ?? new Date().toISOString().slice(0, 10)
  const eventCards = buildEventViews(snapshot.events, { hidePast, currentDate })

  return (
    <Layout title={snapshot.page.title} signedIn={options.signedIn} toolbar={options.toolbar}>
      <main class="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8" data-page="landing">
        <section class="grid gap-6 lg:grid-cols-[2fr,1fr]" data-hero>
          <div class="space-y-4">
            <p class="text-sm uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Temple Trust</p>
            <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{snapshot.page.title}</h1>
            {snapshot.page.donateEnabled ? (
              <div>
                <a
                  href="/donate"
                  class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Donate
                </a>
              </div>
            ) : null}
          </div>
          {snapshot.page.heroImageKey ? (
            <figure class="overflow-hidden rounded-2xl border border-gray-100 shadow-md dark:border-gray-700">
              <img
                src={resolveMediaUrl(snapshot.page.heroImageKey)}
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </figure>
          ) : null}
        </section>

        {sections.map((section) => {
          if (section.kind === 'welcome') {
            return (
              <section
                key={section.id ?? `welcome-${section.pos}`}
                data-section="welcome"
                data-pos={section.pos}
                class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-700"
              >
                <RichText html={section.contentHtml} />
              </section>
            )
          }

          if (section.kind === 'activities') {
            return (
              <ActivitiesSection
                key={section.id ?? `activities-${section.pos}`}
                section={activitiesSection}
                activities={activityCards}
              />
            )
          }

          if (section.kind === 'events') {
            return (
              <EventsSection
                key={section.id ?? `events-${section.pos}`}
                section={eventsSection}
                events={eventCards}
              />
            )
          }

          return null
        })}
      </main>
    </Layout>
  )
}

export function renderLandingEmptyState(options: LandingRenderOptions = {}): RenderOutput {
  return (
    <Layout title="Welcome" signedIn={options.signedIn} toolbar={options.toolbar}>
      <main class="mx-auto max-w-3xl space-y-6 px-4 py-16 text-center sm:px-6 lg:px-8" data-page="landing-empty">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          Maa Nanda Devi Trust
        </p>
        <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          No landing page is published yet
        </h1>
        <p class="mx-auto max-w-2xl text-base text-gray-600 dark:text-gray-300">
          Content is on the way. Please check back soon for updates and event details from the temple.
        </p>
        <div class="flex justify-center gap-4" role="group">
          <a
            href="/admin/landing"
            class="inline-flex items-center rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            Admin login
          </a>
          <a
            href="/"
            class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Go home
          </a>
        </div>
      </main>
    </Layout>
  )
}

// [D3:pages.step-05:section-sort] Ensure landing sections honour stored ordering.
function sortSections(sections: SectionRecord[]): SectionRecord[] {
  return sections.slice().sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos
    if (a.id && b.id) return a.id - b.id
    return 0
  })
}

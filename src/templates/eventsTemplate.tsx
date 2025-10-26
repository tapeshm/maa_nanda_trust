/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { HtmlEscapedString } from 'hono/utils/html'
import Layout from './layout'
import RichText from './components/RichText'
import { resolveMediaUrl } from '../utils/pages/media'
import type { TemplateSnapshot } from '../types/pages'

type Snapshot = TemplateSnapshot
type SectionRecord = Snapshot['sections'][number]
type EventRecord = Snapshot['events'][number]

type RenderOutput = HtmlEscapedString | Promise<HtmlEscapedString>

export interface EventsRenderOptions {
  signedIn?: boolean
  currentDate?: string
  toolbar?: unknown
}

export interface EventView {
  id: number
  title: string
  imageKey: string | null
  imageAlt: string | null
  startDate: string | null
  endDate: string | null
  descriptionHtml: string
  pos: number
}

// [D3:pages.step-05:events-view] Prepare event list respecting sort/filter rules.
export function buildEventViews(
  records: EventRecord[],
  {
    hidePast,
    currentDate,
  }: {
    hidePast: boolean
    currentDate: string
  },
): EventView[] {
  const today = currentDate

  return records
    .filter((event) => {
      if (!hidePast) return true
      const compareOn = event.endDate ?? event.startDate
      if (!compareOn) return true
      return compareOn >= today
    })
    .sort((a, b) => {
      const aStart = a.startDate
      const bStart = b.startDate
      if (aStart && bStart && aStart !== bStart) {
        return aStart.localeCompare(bStart)
      }
      if (aStart && !bStart) return -1
      if (!aStart && bStart) return 1
      return a.pos - b.pos || a.id - b.id
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      imageKey: event.imageKey ?? null,
      imageAlt: event.imageAlt ?? null,
      startDate: event.startDate ?? null,
      endDate: event.endDate ?? null,
      descriptionHtml: event.descriptionHtml ?? '',
      pos: event.pos,
    }))
}

export function shouldHidePastEvents(section: SectionRecord | null | undefined): boolean {
  if (!section?.configJson) return false
  try {
    const parsed = JSON.parse(section.configJson) as { events_hide_past?: boolean | string }
    const flag = parsed.events_hide_past
    if (typeof flag === 'string') {
      return flag.toLowerCase() === 'true'
    }
    return flag === true
  } catch {
    return false
  }
}

const EventCard: FC<{ event: EventView }> = ({ event }) => {
  const hasDates = Boolean(event.startDate || event.endDate)
  return (
    <article
      data-event-card
      data-pos={event.pos}
      class="flex h-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <header class="space-y-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
        {hasDates ? (
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {renderDateRange(event.startDate, event.endDate)}
          </p>
        ) : null}
      </header>
      {event.imageKey ? (
        <figure class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img
            src={resolveMediaUrl(event.imageKey)}
            alt={event.imageAlt ?? ''}
            class="h-48 w-full object-cover"
            loading="lazy"
          />
        </figure>
      ) : null}
      {event.descriptionHtml ? (
        <RichText
          html={event.descriptionHtml}
          className="text-sm text-gray-700 dark:text-gray-200"
        />
      ) : null}
    </article>
  )
}

const EventsList: FC<{ events: EventView[] }> = ({ events }) => {
  if (events.length === 0) {
    return (
      <p class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
        There are no upcoming events at the moment.
      </p>
    )
  }
  return (
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

export interface EventsSectionProps {
  section: SectionRecord | null
  events: EventView[]
}

export const EventsSection: FC<EventsSectionProps> = ({ section, events }) => (
  <section
    data-section="events"
    data-pos={section?.pos ?? 0}
    class="space-y-6 rounded-2xl bg-indigo-50 p-6 dark:bg-indigo-900/40"
  >
    <header class="space-y-2">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Events</h2>
      <RichText html={section?.contentHtml} />
    </header>
    <EventsList events={events} />
  </section>
)

export function getEventsSection(sections: SectionRecord[]): SectionRecord | null {
  const section = sections.find((entry) => entry.kind === 'events')
  return section ?? null
}

export function renderEventsPage(snapshot: Snapshot, options: EventsRenderOptions = {}): RenderOutput {
  const section = getEventsSection(snapshot.sections)
  const hidePast = shouldHidePastEvents(section)
  const currentDate = options.currentDate ?? new Date().toISOString().slice(0, 10)
  const events = buildEventViews(snapshot.events, { hidePast, currentDate })

  return (
    <Layout title={snapshot.page.title} signedIn={options.signedIn} toolbar={options.toolbar}>
      <main class="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8" data-page="events">
        <header class="space-y-3 text-center">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{snapshot.page.title}</h1>
          <RichText html={section?.contentHtml} />
        </header>
        <EventsSection section={section} events={events} />
      </main>
    </Layout>
  )
}

function renderDateRange(start: string | null, end: string | null): RenderOutput {
  if (start && end && start !== end) {
    return (
      <>
        <time dateTime={start}>{start}</time> – <time dateTime={end}>{end}</time>
      </>
    )
  }

  const single = end ?? start
  if (!single) {
    return <span>TBA</span>
  }

  return <time dateTime={single}>{single}</time>
}

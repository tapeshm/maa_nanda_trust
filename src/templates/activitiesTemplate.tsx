/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { HtmlEscapedString } from 'hono/utils/html'
import Layout from './layout'
import RichText from './components/RichText'
import { resolveMediaUrl } from '../utils/pages/media'
import type { TemplateSnapshot } from '../types/pages'

type Snapshot = TemplateSnapshot
type SectionRecord = Snapshot['sections'][number]
type ActivityRecord = Snapshot['activities'][number]

export type ActivityLayout = 'grid' | 'carousel'

export interface ActivityView {
  id: number
  title: string
  imageKey: string | null
  imageAlt: string | null
  descriptionHtml: string
  pos: number
}

export interface ActivitiesRenderOptions {
  signedIn?: boolean
  toolbar?: unknown
}

type RenderOutput = HtmlEscapedString | Promise<HtmlEscapedString>

// [D3:pages.step-05:activities-view] Normalise activity records for SSR templates.
export function buildActivityViews(records: ActivityRecord[]): ActivityView[] {
  return records
    .slice()
    .sort((a, b) => a.pos - b.pos || a.id - b.id)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      imageKey: activity.imageKey ?? null,
      imageAlt: activity.imageAlt ?? null,
      descriptionHtml: activity.descriptionHtml ?? '',
      pos: activity.pos,
    }))
}

export function parseActivitiesLayout(section: SectionRecord | null | undefined): ActivityLayout {
  if (!section?.configJson) return 'grid'
  try {
    const parsed = JSON.parse(section.configJson) as { activities_layout?: string }
    return parsed.activities_layout === 'carousel' ? 'carousel' : 'grid'
  } catch {
    return 'grid'
  }
}

const ActivityCard: FC<{ activity: ActivityView }> = ({ activity }) => (
  <article
    data-activity-card
    data-pos={activity.pos}
    class="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <div class="space-y-3">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{activity.title}</h3>
      {activity.imageKey ? (
        <figure class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <img
            src={resolveMediaUrl(activity.imageKey)}
            alt={activity.imageAlt ?? ''}
            class="h-48 w-full object-cover"
            loading="lazy"
          />
        </figure>
      ) : null}
      {activity.descriptionHtml ? (
        <RichText
          html={activity.descriptionHtml}
          className="text-sm text-gray-700 dark:text-gray-200"
        />
      ) : null}
    </div>
  </article>
)

export interface ActivityCardsProps {
  layout: ActivityLayout
  activities: ActivityView[]
}

export const ActivityCards: FC<ActivityCardsProps> = ({ layout, activities }) => {
  if (activities.length === 0) {
    return (
      <p class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
        Activities will appear here once published.
      </p>
    )
  }

  const containerClass =
    layout === 'carousel'
      ? 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div class={containerClass} data-layout={layout}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

export interface ActivitiesSectionProps {
  section: SectionRecord | null
  activities: ActivityView[]
}

export const ActivitiesSection: FC<ActivitiesSectionProps> = ({ section, activities }) => {
  if (!section && activities.length === 0) return null
  const layout = parseActivitiesLayout(section ?? null)

  return (
    <section
      data-section="activities"
      data-pos={section?.pos ?? 0}
      class="space-y-6 rounded-2xl bg-gray-50 p-6 dark:bg-gray-900/60"
    >
      <header class="space-y-2">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Activities</h2>
        <RichText html={section?.contentHtml} />
      </header>
      <ActivityCards layout={layout} activities={activities} />
    </section>
  )
}

export function getActivitiesSection(sections: SectionRecord[]): SectionRecord | null {
  const section = sections.find((entry) => entry.kind === 'activities')
  return section ?? null
}

export function renderActivitiesPage(
  snapshot: Snapshot,
  options: ActivitiesRenderOptions = {},
): RenderOutput {
  const section = getActivitiesSection(snapshot.sections)
  const activities = buildActivityViews(snapshot.activities)

  return (
    <Layout title={snapshot.page.title} signedIn={options.signedIn} toolbar={options.toolbar}>
      <main class="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8" data-page="activities">
        <header class="space-y-3 text-center">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{snapshot.page.title}</h1>
          <RichText html={section?.contentHtml} />
        </header>
        <ActivitiesSection section={section} activities={activities} />
      </main>
    </Layout>
  )
}

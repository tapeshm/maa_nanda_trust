import type { HtmlEscapedString } from 'hono/utils/html'
import type { PageSlug } from '../../config/pages'
import { renderLanding, type LandingRenderOptions } from '../../templates/landingTemplate'
import { renderActivitiesPage, type ActivitiesRenderOptions } from '../../templates/activitiesTemplate'
import { renderEventsPage, type EventsRenderOptions } from '../../templates/eventsTemplate'
import { renderGenericPage, type GenericRenderOptions } from '../../templates/genericPageTemplate'
import type { PublishSnapshot } from '../../repositories/publishRepo'

type RenderOptions = LandingRenderOptions & ActivitiesRenderOptions & EventsRenderOptions & GenericRenderOptions

type Rendered = HtmlEscapedString | Promise<HtmlEscapedString>

const RENDERERS: Record<PageSlug, (snapshot: PublishSnapshot, options: RenderOptions) => Rendered> = {
  landing: (snapshot, options) => renderLanding(snapshot, options),
  activities: (snapshot, options) => renderActivitiesPage(snapshot, options),
  events: (snapshot, options) => renderEventsPage(snapshot, options),
  about: (snapshot, options) => renderGenericPage(snapshot, options),
  transparency: (snapshot, options) => renderGenericPage(snapshot, options),
}

export async function renderPublishedHtml(
  slug: PageSlug,
  snapshot: PublishSnapshot,
  options: RenderOptions = {},
): Promise<string> {
  const rendered = RENDERERS[slug](snapshot, options)
  const value = await rendered
  return typeof value === 'string' ? value : String(value)
}

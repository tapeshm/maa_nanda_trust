import { EDITOR_PROFILE_BASIC, EDITOR_PROFILE_FULL } from '../editor/constants'

// [D3:pages.step-01:slugs] Supported page slugs for the page management feature.
export const PAGE_SLUGS = ['landing', 'activities', 'events', 'about', 'transparency'] as const
export type PageSlug = (typeof PAGE_SLUGS)[number]

export const PAGE_SLUG_SET = new Set<PageSlug>(PAGE_SLUGS)

export function isPageSlug(value: unknown): value is PageSlug {
  return typeof value === 'string' && PAGE_SLUG_SET.has(value as PageSlug)
}

export function assertPageSlug(value: string): PageSlug {
  if (isPageSlug(value)) return value
  throw new TypeError(`Unsupported page slug: ${value}`)
}

// [D3:pages.step-01:sections] Known section kinds for pages, mirroring the DDL contract.
export const PAGE_SECTION_KINDS = ['welcome', 'activities', 'events', 'content'] as const
export type PageSectionKind = (typeof PAGE_SECTION_KINDS)[number]

// [D3:pages.step-01:layouts] Activities page layout variants.
export const PAGE_ACTIVITIES_LAYOUTS = ['grid', 'carousel'] as const
export type PageActivitiesLayout = (typeof PAGE_ACTIVITIES_LAYOUTS)[number]

export const DEFAULT_ACTIVITIES_LAYOUT: PageActivitiesLayout = PAGE_ACTIVITIES_LAYOUTS[0]

// [D3:pages.step-01:routes] Stable route prefixes used across the feature.
export const PAGE_ROUTE_PREFIXES = {
  admin: '/admin',
  preview: '/preview',
  public: '/',
} as const

export const ADMIN_PAGE_PATH = (slug: PageSlug) => `${PAGE_ROUTE_PREFIXES.admin}/${slug}`
export const PREVIEW_PAGE_PATH = (slug: PageSlug) => `${PAGE_ROUTE_PREFIXES.preview}/${slug}`
export const PUBLIC_PAGE_PATH = (slug: PageSlug, id: string | number) =>
  `${PAGE_ROUTE_PREFIXES.public}${slug}/${id}`

// [D3:pages.step-01:editor] Default editor profiles per slug. Landing uses full editor for richer layout, others basic until configured.
export const PAGE_EDITOR_PROFILES: Record<PageSlug, typeof EDITOR_PROFILE_BASIC | typeof EDITOR_PROFILE_FULL> = {
  landing: EDITOR_PROFILE_FULL,
  activities: EDITOR_PROFILE_BASIC,
  events: EDITOR_PROFILE_BASIC,
  about: EDITOR_PROFILE_FULL,
  transparency: EDITOR_PROFILE_FULL,
}

// [D3:pages.step-01:payload-ids] Stable editor ids used when rendering forms; ensures consistency across admin UX.
export const PAGE_EDITOR_IDS: Record<PageSlug, string> = {
  landing: 'landing_welcome',
  activities: 'activities_intro',
  events: 'events_intro',
  about: 'about_content',
  transparency: 'transparency_content',
}

export const PAGE_VERSION_START = 1


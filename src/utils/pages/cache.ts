import { sha256 } from 'hono/utils/crypto'
import type { Bindings } from '../../bindings'
import type { PageSlug } from '../../config/pages'

const HTML_KEY_PREFIX = 'pages:html'
const META_KEY_PREFIX = 'pages:meta'
const PAGE_POINTER_PREFIX = 'pages:pointer'
const LANDING_POINTER_KEY = `${PAGE_POINTER_PREFIX}:landing:current`
const CACHE_TTL_SECONDS = 3600

export const PUBLIC_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'

function versionedHtmlKey(slug: PageSlug, pageId: number, version: number): string {
  return `${HTML_KEY_PREFIX}:${slug}:${pageId}:v${version}`
}

function pageVersionPointerKey(slug: PageSlug, pageId: number): string {
  return `${PAGE_POINTER_PREFIX}:${slug}:${pageId}`
}

type PointerRecord = { id?: number; version: number }

function coercePointer(value: unknown): PointerRecord | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return coercePointer(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && value !== null) {
    const maybeVersion = (value as any).version
    if (typeof maybeVersion !== 'number') return null
    const maybeId = (value as any).id
    return typeof maybeId === 'number'
      ? { id: maybeId, version: maybeVersion }
      : { version: maybeVersion }
  }
  return null
}

type CachedHtmlRecord = {
  html: string
  etag?: string | null
}

type CachedMetaRecord = {
  etag?: string | null
}

function versionedMetaKey(slug: PageSlug, pageId: number, version: number): string {
  return `${META_KEY_PREFIX}:${slug}:${pageId}:v${version}`
}

export async function getCachedHtml(
  env: Bindings,
  slug: PageSlug,
  pageId: number,
  version: number,
): Promise<CachedHtmlRecord | null> {
  const html = await env.PAGES_CACHE.get(versionedHtmlKey(slug, pageId, version))
  if (typeof html !== 'string') {
    return null
  }
  const meta = await env.PAGES_CACHE.get(versionedMetaKey(slug, pageId, version))
  const etag = coerceEtag(meta)
  return { html, etag }
}

export async function putCachedHtml(
  env: Bindings,
  slug: PageSlug,
  pageId: number,
  version: number,
  html: string,
): Promise<string> {
  const etag = await computeHtmlEtag(html)
  await env.PAGES_CACHE.put(versionedHtmlKey(slug, pageId, version), html, {
    expirationTtl: CACHE_TTL_SECONDS,
  })
  await env.PAGES_CACHE.put(
    versionedMetaKey(slug, pageId, version),
    JSON.stringify({ etag }),
    { expirationTtl: CACHE_TTL_SECONDS },
  )
  await env.PAGES_CACHE.put(pageVersionPointerKey(slug, pageId), JSON.stringify({ version }))
  if (slug === 'landing') {
    await env.PAGES_CACHE.put(LANDING_POINTER_KEY, JSON.stringify({ id: pageId, version }))
  }
  return etag
}

export async function getPageVersion(
  env: Bindings,
  slug: PageSlug,
  pageId: number,
): Promise<number | null> {
  const raw = await env.PAGES_CACHE.get(pageVersionPointerKey(slug, pageId))
  const pointer = coercePointer(raw)
  return pointer?.version ?? null
}

export async function getLandingPointer(
  env: Bindings,
): Promise<{ id: number; version: number } | null> {
  const raw = await env.PAGES_CACHE.get(LANDING_POINTER_KEY)
  const pointer = coercePointer(raw)
  if (!pointer || typeof pointer.id !== 'number') {
    return null
  }
  return { id: pointer.id, version: pointer.version }
}

export async function setLandingPointer(env: Bindings, id: number, version: number): Promise<void> {
  await env.PAGES_CACHE.put(LANDING_POINTER_KEY, JSON.stringify({ id, version }))
}

export async function computeHtmlEtag(html: string): Promise<string> {
  const hash = await sha256(html)
  return `"${hash}"`
}

function coerceEtag(meta: unknown): string | undefined {
  if (!meta) return undefined
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta)
      return coerceEtag(parsed)
    } catch {
      return undefined
    }
  }
  if (typeof meta === 'object') {
    const value = (meta as CachedMetaRecord).etag
    return typeof value === 'string' ? value : undefined
  }
  return undefined
}

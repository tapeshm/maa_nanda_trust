const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g
const WHITESPACE_PATTERN = /\s/
const JAVASCRIPT_PROTOCOL_PATTERN = /^javascript:/i
const MAILTO_PROTOCOL_PATTERN = /^mailto:/i
const TEL_PROTOCOL_PATTERN = /^tel:/i
const RELATIVE_LINK_PATTERN = /^([/#]).*/

export interface NormalizeLinkResult {
  href: string
}

export function normalizeLinkHref(rawHref: unknown): NormalizeLinkResult | null {
  if (typeof rawHref !== 'string') {
    return null
  }

  const trimmed = rawHref.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (WHITESPACE_PATTERN.test(trimmed)) {
    return null
  }

  if (CONTROL_CHAR_PATTERN.test(trimmed)) {
    return null
  }

  if (JAVASCRIPT_PROTOCOL_PATTERN.test(trimmed)) {
    return null
  }

  if (RELATIVE_LINK_PATTERN.test(trimmed)) {
    return { href: trimmed }
  }

  if (MAILTO_PROTOCOL_PATTERN.test(trimmed) || TEL_PROTOCOL_PATTERN.test(trimmed)) {
    return { href: trimmed }
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:') {
      return null
    }
    return { href: url.toString() }
  } catch {
    return null
  }
}

export function isAllowedLinkHref(value: unknown): boolean {
  return normalizeLinkHref(value) !== null
}

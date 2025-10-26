export function resolveMediaUrl(key: string): string {
  if (!key) return ''
  if (/^https?:\/\//.test(key)) return key
  if (key.startsWith('/')) return key
  return `/media/${encodeURI(key)}`
}

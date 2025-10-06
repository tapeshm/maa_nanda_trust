// [D3:auth.step-02:csp-config]
import type { Context } from 'hono'

/** Build a CSP string based on environment. */
export function buildCsp(c: Context): string {
  const env = (c.env as any) || {}
  const mode = String(env.ENV || 'development')
  const isDev = mode !== 'production'
  let nonce: string | undefined
  try {
    nonce = ((c as any).get('cspNonce') as any) as string | undefined
  } catch {
    /* no-op */
  }

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'self'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'script-src': isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    'style-src': isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
  }

  if (nonce && directives['script-src']) {
    directives['script-src'] = [...directives['script-src'], `'nonce-${nonce}'`]
  }

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ')
}

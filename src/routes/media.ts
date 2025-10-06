import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Bindings } from '../bindings'

// [D3:editor-tiptap.step-06:media-router] Public media delivery routes backed by R2.
const media = new Hono<{ Bindings: Bindings }>()

const KEY_PATTERN = /^[A-Za-z0-9/_\-.]+$/
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

// [D3:editor-tiptap.step-06:key-validate] Ensure media keys remain within the R2 namespace without traversal.
function isValidKey(raw: string | undefined): raw is string {
  if (!raw) return false
  if (!KEY_PATTERN.test(raw)) return false
  if (raw.includes('..')) return false
  return true
}

function normalizeKey(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  if (!isValidKey(decoded)) return null
  return decoded
}

async function respondWithObject(c: Context<{ Bindings: Bindings }>, key: string, method: 'GET' | 'HEAD') {
  const object = await c.env.R2.get(key)
  if (!object) {
    return c.text('Not Found', 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata?.(headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream')
  }
  headers.set('Cache-Control', CACHE_CONTROL)
  headers.set('X-Content-Type-Options', 'nosniff')

  if (method === 'HEAD') {
    return new Response(null, { headers })
  }

  return new Response(object.body, { headers })
}

media.get('/:key{.+}', async (c) => {
  const key = normalizeKey(c.req.param('key'))
  if (!key) {
    return c.text('Bad Request', 400)
  }
  return respondWithObject(c, key, 'GET')
})

media.on('HEAD', '/:key{.+}', async (c) => {
  const key = normalizeKey(c.req.param('key'))
  if (!key) {
    return c.text('Bad Request', 400)
  }
  return respondWithObject(c, key, 'HEAD')
})

export default media

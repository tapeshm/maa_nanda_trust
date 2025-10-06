import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { csrfProtect } from '../../middleware/csrf'
import { rateLimit } from '../../middleware/rateLimit'
import { getTrustedOrigins, getNumber } from '../../utils/env'
import { getEditorDocument, upsertEditorDocument } from '../../models/editorDocuments'
import { isSafeEditorHtml, renderFallbackHtml } from '../../utils/editor/render'
import { logEditorError, logEditorSuccess } from '../../observability/editorLogs'

const router = new Hono<{ Bindings: Bindings }>()

router.use('*', csrfProtect())
router.use('*', rateLimit((c) => c.env))

const SAVE_ROUTE = '/admin/save-content'

function logSaveFailure(
  c: Context<{ Bindings: Bindings }>,
  reason: string,
  options: { slug?: string | null; documentId?: string | null; status: number } = { status: 400 },
) {
  logEditorError(c, 'editor.save.fail', {
    route: SAVE_ROUTE,
    slug: options.slug ?? null,
    documentId: options.documentId ?? null,
    status: options.status,
    reason,
  })
}

function logSaveSuccess(
  c: Context<{ Bindings: Bindings }>,
  details: { slug: string; documentId: string; profile: string },
) {
  logEditorSuccess(c, 'editor.save.ok', {
    route: SAVE_ROUTE,
    slug: details.slug,
    documentId: details.documentId,
    profile: details.profile,
  })
}

function ensureTrustedOrigin(c: any): Response | null {
  const origins = getTrustedOrigins(c)
  if (origins.length === 0) {
    return null
  }

  const origin = c.req.header('Origin')
  if (!origin || !origins.includes(origin)) {
    console.warn('[editor] origin rejected', {
      origin,
      allowedOrigins: origins,
    })
    return c.text('Forbidden', 403)
  }

  const host = c.req.header('Host') ?? new URL(c.req.url).host
  if (!origins.some((allowed) => allowed.includes(host))) {
    console.warn('[editor] host rejected', {
      host,
      allowedOrigins: origins,
    })
    return c.text('Forbidden', 403)
  }

  return null
}

function parseJson(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

const ALLOWED_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'image',
  'imageFigure',
  'blockquote',
  'horizontalRule',
  'codeBlock',
])

function isValidContent(doc: any): boolean {
  if (!doc || typeof doc !== 'object') return false
  if (doc.type !== 'doc') return false
  if (!Array.isArray(doc.content)) return false

  const stack = [...doc.content]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') return false
    if (typeof node.type !== 'string' || !ALLOWED_NODE_TYPES.has(node.type)) {
      return false
    }
    if (Array.isArray(node.content)) {
      stack.push(...node.content)
    }
  }

  return true
}

export async function handleSaveContent(c: Context<{ Bindings: Bindings }>) {
  const originCheck = ensureTrustedOrigin(c)
  if (originCheck) {
    logSaveFailure(c, 'origin_forbidden', { status: originCheck.status ?? 403 })
    return originCheck
  }

  const body = await c.req.parseBody().catch((error) => {
    console.error('[editor] failed to parse save content request', error)
    return null
  })

  if (!body || typeof body !== 'object') {
    logSaveFailure(c, 'invalid_body', { status: 400 })
    return c.text('Bad Request', 400)
  }

  const slug = typeof (body as any).slug === 'string' ? (body as any).slug.trim() : null
  if (!slug) {
    logSaveFailure(c, 'missing_slug', { status: 400 })
    return c.text('Bad Request', 400)
  }

  const maxBytes = getNumber(c, 'CONTENT_MAX_BYTES') ?? 262144
  const payloadKeys = Object.keys(body)
  const contentEntries = payloadKeys
    .filter((key) => key.startsWith('content_json[') && key.endsWith(']'))
    .map((key) => {
      const id = key.slice('content_json['.length, -1)
      return { id, key, value: (body as any)[key] }
    })
    .filter((entry) => typeof entry.value === 'string')

  if (contentEntries.length === 0) {
    logSaveFailure(c, 'missing_content', { slug, status: 400 })
    return c.text('Bad Request', 400)
  }

  const results: Record<string, { contentId: string; etag: string }> = {}
  const conflicts: Record<string, { etag: string | null }> = {}
  const successes: Array<{ slug: string; documentId: string; profile: string }> = []

  for (const entry of contentEntries) {
    const editorId = entry.id
    const contentJson = entry.value

    if (contentJson.length > maxBytes) {
      logSaveFailure(c, 'content_too_large', {
        slug,
        documentId: editorId,
        status: 413,
      })
      return c.text('Payload Too Large', 413)
    }

    const profileKey = `profile[${editorId}]`
    const documentIdKey = `document_id[${editorId}]`
    const documentId =
      typeof (body as any)[documentIdKey] === 'string'
        ? (body as any)[documentIdKey].trim()
        : editorId
    const profile =
      typeof (body as any)[profileKey] === 'string'
        ? (body as any)[profileKey].trim()
        : 'basic'
    const context = { profile, slug, documentId }

    const parsed = parseJson(contentJson)
    if (!isValidContent(parsed)) {
      logSaveFailure(c, 'invalid_content_schema', {
        slug,
        documentId,
        status: 422,
      })
      return c.text('Unprocessable Entity', 422)
    }

    const htmlKey = `content_html[${editorId}]`
    const rawHtml = (body as any)[htmlKey]
    let contentHtml = typeof rawHtml === 'string' ? rawHtml : ''
    if (contentHtml.length > 0 && contentHtml.length > maxBytes) {
      logSaveFailure(c, 'html_too_large', {
        slug,
        documentId,
        status: 413,
      })
      return c.text('Payload Too Large', 413)
    }

    if (contentHtml) {
      const htmlValid = isSafeEditorHtml(contentHtml, context)
      if (!htmlValid) {
        logSaveFailure(c, 'html_invalid', {
          slug,
          documentId,
          status: 422,
        })
        return c.text('Unprocessable Entity', 422)
      }
    } else {
      contentHtml = renderFallbackHtml(parsed, context)
    }

    if (contentHtml.length > maxBytes) {
      logSaveFailure(c, 'html_too_large', {
        slug,
        documentId,
        status: 413,
      })
      return c.text('Payload Too Large', 413)
    }

    const etagKey = `etag[${editorId}]`
    const ifMatch =
      typeof (body as any)[etagKey] === 'string' && (body as any)[etagKey].length > 0
        ? (body as any)[etagKey]
        : null

    try {
      const saved = await upsertEditorDocument(c.env, {
        slug,
        documentId,
        profile,
        contentJson,
        contentHtml,
        ifMatch,
      })
      results[editorId] = { contentId: saved.documentId, etag: saved.updatedAt }
      successes.push({ slug, documentId: saved.documentId, profile })
    } catch (error) {
      const status = (error as any)?.status
      if (status === 409) {
        const current = await getEditorDocument(c.env, slug, documentId)
        conflicts[editorId] = { etag: current?.updatedAt ?? null }
        logSaveFailure(c, 'conflict', {
          slug,
          documentId,
          status: 409,
        })
        continue
      }
      if (status === 404) {
        conflicts[editorId] = { etag: null }
        logSaveFailure(c, 'not_found', {
          slug,
          documentId,
          status: 404,
        })
        continue
      }
      console.error('[editor] failed to save content', error)
      logSaveFailure(c, 'internal_error', {
        slug,
        documentId,
        status: 500,
      })
      return c.text('Internal Server Error', 500)
    }
  }

  if (Object.keys(conflicts).length > 0) {
    return c.json({ ok: false, conflicts }, 409)
  }

  successes.forEach((entry) => logSaveSuccess(c, entry))

  return c.json({ ok: true, documents: results })
}

router.post('/save-content', requireAuth(), requireAdmin, handleSaveContent)

export default router

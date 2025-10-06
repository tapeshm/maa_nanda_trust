import { Hono } from 'hono'
import type { Context } from 'hono'

import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { getCookie } from 'hono/cookie'

import { CSRF_COOKIE_NAME } from '../../middleware/csrf'
import { rateLimit } from '../../middleware/rateLimit'
import { getNumber, getTrustedOrigins } from '../../utils/env'
import { logEditorError, logEditorSuccess } from '../../observability/editorLogs'

// [D3:editor-tiptap.step-06:upload-router] Router responsible for image uploads from the editor toolbar.
const upload = new Hono<{ Bindings: Bindings }>()

const ALLOWED_MIME: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MiB

const getEnv = (c: Context<any, any, any>) => c.env as Record<string, unknown>

upload.use('/upload-image', rateLimit(getEnv))

const UPLOAD_ROUTE = '/admin/upload-image'

function verifyCsrfToken(c: Context, formData: FormData | null): boolean {
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME)
  if (!cookieToken) {
    return false
  }

  const headerToken = c.req.header('X-CSRF-Token') || c.req.header('HX-CSRF-Token')
  if (headerToken && headerToken === cookieToken) {
    return true
  }

  for (const name of ['csrf_token', '_csrf']) {
    const value = formData?.get(name)
    if (typeof value === 'string' && value === cookieToken) {
      return true
    }
  }

  return false
}

function logUploadFailure(
  c: Context<{ Bindings: Bindings }>,
  reason: string,
  details: { status: number; mime?: string | null } = { status: 400 },
) {
  logEditorError(c, 'editor.upload.fail', {
    route: UPLOAD_ROUTE,
    status: details.status,
    reason,
    mime: details.mime ?? null,
  })
}

function logUploadSuccess(
  c: Context<{ Bindings: Bindings }>,
  details: { key: string; mime: string; size: number },
) {
  logEditorSuccess(c, 'editor.upload.ok', {
    route: UPLOAD_ROUTE,
    key: details.key,
    mime: details.mime,
    size: details.size,
  })
}

function normalizeMime(type: string | null | undefined): string {
  if (!type) return ''
  const lower = type.toLowerCase()
  if (lower === 'image/jpg') return 'image/jpeg'
  return lower
}

function extensionFromFilename(name: string | null | undefined): string | null {
  if (!name) return null
  const idx = name.lastIndexOf('.')
  if (idx === -1 || idx === name.length - 1) return null
  return name.slice(idx + 1).toLowerCase()
}

// [D3:editor-tiptap.step-06:trusted-origins] Build allow-list of origins/hosts permitted to submit uploads.
function originAllowList(c: Context): { origins: Set<string>; hosts: Set<string> } {
  const configured = getTrustedOrigins(c)
  const origins = new Set<string>()
  const hosts = new Set<string>()

  const vet = (value: string | null | undefined) => {
    if (!value) return
    try {
      const url = new URL(value)
      origins.add(url.origin)
      hosts.add(url.host)
    } catch {
      /* ignore invalid URLs */
    }
  }

  configured.forEach((entry) => vet(entry))
  if (configured.length > 0) {
    try {
      const current = new URL(c.req.url)
      vet(current.origin)
    } catch {
      /* ignore */
    }
  }

  return { origins, hosts }
}

function verifyTrustedOrigin(c: Context): boolean {
  const { origins, hosts } = originAllowList(c)
  if (origins.size === 0) {
    // No configured origins; allow by default.
    return true
  }

  const originHeader = c.req.header('Origin')
  if (originHeader) {
    if (originHeader === 'null') return false
    if (!origins.has(originHeader)) return false
  }

  let hostHeader: string | null | undefined = c.req.header('Host')
  if (!hostHeader) {
    try {
      hostHeader = new URL(c.req.url).host
    } catch {
      hostHeader = undefined
    }
  }
  if (!hostHeader) return false
  if (!hosts.has(hostHeader)) return false

  return true
}

// [D3:editor-tiptap.step-06:origin-enforce] Reject requests whose Origin/Host are outside AUTH_TRUSTED_ORIGINS.
function ensureTrustedOrigin(c: Context): Response | null {
  if (!verifyTrustedOrigin(c)) {
    return c.text('Forbidden', 403)
  }
  return null
}

function buildObjectKey(ext: string): string {
  const now = Date.now()
  const random = crypto.getRandomValues(new Uint32Array(2))
    .reduce((acc, val) => acc + val.toString(36), '')
  return `images/${now}_${random}.${ext}`
}

function bytesLimit(c: Context): number {
  const configured = getNumber(c, 'MEDIA_MAX_UPLOAD_BYTES')
  if (typeof configured === 'number' && configured > 0) {
    return configured
  }
  return DEFAULT_MAX_BYTES
}

function validateFile(file: File, maxBytes: number): { ok: boolean; status?: number } {
  const mime = normalizeMime(file.type)
  const ext = extensionFromFilename(file.name)
  if (!mime || !ALLOWED_MIME[mime]) {
    return { ok: false, status: 415 }
  }
  if (!ext || !ALLOWED_MIME[mime].includes(ext)) {
    return { ok: false, status: 415 }
  }
  if (file.size > maxBytes) {
    return { ok: false, status: 413 }
  }
  return { ok: true }
}

upload.post('/upload-image', requireAuth(), requireAdmin, async (c) => {
  const originCheck = ensureTrustedOrigin(c)
  if (originCheck) {
    logUploadFailure(c, 'origin_forbidden', { status: originCheck.status ?? 403 })
    return originCheck
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    logUploadFailure(c, 'invalid_form', { status: 415 })
    return c.text('Unsupported Media Type', 415)
  }

  const file = formData.get('image')
  if (!(file instanceof File)) {
    logUploadFailure(c, 'missing_file', { status: 415 })
    return c.text('Unsupported Media Type', 415)
  }

  if (!verifyCsrfToken(c, formData)) {
    logUploadFailure(c, 'csrf_invalid', { status: 403 })
    return c.text('Forbidden', 403)
  }

  const limit = bytesLimit(c)
  const verdict = validateFile(file, limit)
  if (!verdict.ok) {
    if (verdict.status === 413) {
      logUploadFailure(c, 'file_too_large', { status: 413, mime: file.type })
      return c.text('Payload Too Large', 413)
    }
    logUploadFailure(c, 'unsupported_type', { status: 415, mime: file.type })
    return c.text('Unsupported Media Type', 415)
  }

  const ext = extensionFromFilename(file.name) as string
  const key = buildObjectKey(ext)
  const contentType = normalizeMime(file.type)
  const body = await file.arrayBuffer()

  try {
    await c.env.R2.put(key, body, {
      httpMetadata: { contentType },
    })
  } catch (error) {
    console.error('[editor] Failed to store uploaded image', error)
    logUploadFailure(c, 'storage_error', { status: 500, mime: file.type })
    return c.text('Upload failed', 500)
  }

  logUploadSuccess(c, { key, mime: contentType, size: file.size })
  return c.json({ url: `/media/${key}` })
})

export default upload

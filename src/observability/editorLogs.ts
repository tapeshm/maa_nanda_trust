import type { Context } from 'hono'

import { logger } from './logger'

type LogContext = Pick<Context, 'env' | 'req'> | {
  env?: Record<string, unknown>
  req: {
    header: (name: string) => string | undefined | null
    path?: string
    url: string
  }
}

export type EditorLogEvent =
  | 'editor.mount'
  | 'editor.save.ok'
  | 'editor.save.fail'
  | 'editor.upload.ok'
  | 'editor.upload.fail'

function parseSampleRate(env: Record<string, unknown> | undefined): number {
  const raw = env?.LOG_SAMPLE_RATE ?? env?.log_sample_rate
  const value = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : 1
  if (!Number.isFinite(value)) return 1
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function shouldLog(env: Record<string, unknown> | undefined): boolean {
  const rate = parseSampleRate(env)
  if (rate <= 0) {
    return false
  }
  if (rate >= 1) {
    return true
  }
  return Math.random() < rate
}

function header(req: LogContext['req'], name: string): string | undefined {
  try {
    return req.header(name) ?? undefined
  } catch {
    return undefined
  }
}

function deriveRequestId(req: LogContext['req']): string {
  const candidates = [
    header(req, 'cf-ray'),
    header(req, 'cf-ray'.toUpperCase()),
    header(req, 'x-request-id'),
    header(req, 'request-id'),
  ].filter((value): value is string => Boolean(value && value.length > 0))

  if (candidates.length > 0) {
    return candidates[0]
  }

  try {
    if (typeof crypto?.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignored */
  }

  return `editor-${Math.random().toString(36).slice(2)}`
}

const DISALLOWED_KEYS = new Set([
  'content',
  'content_json',
  'contentHtml',
  'html',
  'file',
  'bytes',
  'body',
])

function sanitizeDetails(details: Record<string, unknown> | undefined) {
  if (!details || typeof details !== 'object') {
    return {}
  }

  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    if (DISALLOWED_KEYS.has(key) || key.toLowerCase().includes('content_json')) {
      continue
    }
    if (key.toLowerCase().includes('file') || key.toLowerCase().includes('bytes')) {
      continue
    }
    clean[key] = value
  }
  return clean
}

function pathFrom(req: LogContext['req']): string {
  if (typeof req.path === 'string' && req.path.length > 0) {
    return req.path
  }
  try {
    const url = new URL(req.url)
    return url.pathname
  } catch {
    return req.url
  }
}

export function logEditorEvent(
  ctx: LogContext,
  event: EditorLogEvent,
  details?: Record<string, unknown>,
): void {
  const env = (ctx as any).env as Record<string, unknown> | undefined
  if (!shouldLog(env)) {
    return
  }

  const sanitized = sanitizeDetails(details)
  const payload: Record<string, unknown> = {
    event,
    request_id: deriveRequestId(ctx.req),
    route: sanitized.route ?? pathFrom(ctx.req),
  }

  for (const [key, value] of Object.entries(sanitized)) {
    if (key === 'route') continue
    payload[key] = value
  }

  const rate = parseSampleRate(env)
  if (rate > 0 && rate < 1) {
    payload.sample_rate = rate
  }

  logger.info(payload)
}

export function logEditorError(
  ctx: LogContext,
  event: Extract<EditorLogEvent, 'editor.save.fail' | 'editor.upload.fail'>,
  details?: Record<string, unknown>,
): void {
  logEditorEvent(ctx, event, { outcome: 'fail', ...details })
}

export function logEditorSuccess(
  ctx: LogContext,
  event: Extract<EditorLogEvent, 'editor.save.ok' | 'editor.upload.ok' | 'editor.mount'>,
  details?: Record<string, unknown>,
): void {
  logEditorEvent(ctx, event, { outcome: 'ok', ...details })
}

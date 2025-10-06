import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { logEditorError, logEditorEvent, logEditorSuccess } from '../../src/observability/editorLogs'
import { logger } from '../../src/observability/logger'

const baseContext = {
  req: {
    header: (name: string) => (name.toLowerCase() === 'cf-ray' ? 'test-ray' : null),
    url: 'https://admin.example.com/admin/demo/1',
  },
  env: { LOG_SAMPLE_RATE: '1' },
}

describe('editor logs', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'info').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('omits sensitive fields and includes request metadata', () => {
    logEditorEvent(baseContext as any, 'editor.save.ok', {
      route: '/admin/save-content',
      slug: 'demo',
      content_json: '{"should":"not appear"}',
      documentId: '1',
    })

    expect(logger.info).toHaveBeenCalledTimes(1)
    const [payload] = (logger.info as any).mock.calls[0]
    expect(payload).toMatchObject({
      event: 'editor.save.ok',
      route: '/admin/save-content',
      slug: 'demo',
      documentId: '1',
      request_id: 'test-ray',
    })
    expect(payload).not.toHaveProperty('content_json')
  })

  it('honors sampling and skips logging when rate is zero', () => {
    const ctx = {
      ...baseContext,
      env: { LOG_SAMPLE_RATE: '0' },
    }
    logEditorEvent(ctx as any, 'editor.upload.ok', { route: '/admin/upload-image' })
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('appends outcome helpers for success and failure events', () => {
    logEditorSuccess(baseContext as any, 'editor.upload.ok', {
      route: '/admin/upload-image',
      key: 'images/demo.png',
      mime: 'image/png',
      size: 128,
    })

    logEditorError(baseContext as any, 'editor.save.fail', {
      route: '/admin/save-content',
      status: 422,
      reason: 'invalid_content_schema',
    })

    const calls = (logger.info as any).mock.calls.map(([payload]: [any]) => payload)
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'editor.upload.ok', outcome: 'ok' }),
        expect.objectContaining({ event: 'editor.save.fail', outcome: 'fail', status: 422 }),
      ]),
    )
  })

  it('falls back to generated request id when cf-ray is unavailable', () => {
    const randomId = 'generated-request'
    const randomSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(randomId as any)

    const ctx = {
      req: {
        header: () => null,
        url: 'https://admin.example.com/admin/demo/1',
      },
      env: { LOG_SAMPLE_RATE: '1' },
    }

    logEditorSuccess(ctx as any, 'editor.mount', { route: '/admin/demo/1', slug: 'demo', documentId: '1' })

    expect(logger.info).toHaveBeenCalledTimes(1)
    const [payload] = (logger.info as any).mock.calls[0]
    expect(payload.request_id).toBe(randomId)

    randomSpy.mockRestore()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { ImageFigure } from '../../src/frontend/editor/extensions/imageFigure'
import { EDITOR_OPTIONAL_IMAGE_NODE } from '../../src/editor/constants'

describe('imageFigure commands: URL policy and normalization', () => {
  it('setImageFigure rejects javascript: and accepts https/relative; clamps attrs', () => {
    const add = ImageFigure.config.addCommands as unknown as (() => any) | undefined
    expect(typeof add).toBe('function')
    const cmds = add!.call(ImageFigure)

    const insertSpy = vi.fn(() => true)
    const ctx = { commands: { insertContent: insertSpy } }

    // Reject javascript: URL
    const bad = cmds.setImageFigure({ src: 'javascript:alert(1)', alt: 'X' })(ctx)
    expect(bad).toBe(false)
    expect(insertSpy).not.toHaveBeenCalled()

    // Accept https with clamped size/align and default wrap/text, alt defaults to provided value
    insertSpy.mockClear()
    const ok = cmds.setImageFigure({ src: 'https://example.com/img.png', alt: 'Demo', size: 'xx', align: 'weird' })(ctx)
    expect(ok).toBe(true)
    expect(insertSpy).toHaveBeenCalledTimes(1)
    const arg = insertSpy.mock.calls[0]?.[0]
    expect(arg.type).toBe(EDITOR_OPTIONAL_IMAGE_NODE.name)
    expect(arg.attrs.src).toBe('https://example.com/img.png')
    expect(arg.attrs.alt).toBe('Demo')
    expect(arg.attrs.size).toBe('m') // clamped
    expect(arg.attrs.align).toBe('center') // clamped

    // Accept relative URL
    insertSpy.mockClear()
    const rel = cmds.setImageFigure({ src: '/media/demo.png' })(ctx)
    expect(rel).toBe(true)
    expect(insertSpy).toHaveBeenCalled()
  })
})


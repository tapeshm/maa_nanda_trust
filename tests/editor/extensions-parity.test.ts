import { describe, it, expect, beforeEach, vi } from 'vitest'

import { extensionsList } from '../../src/utils/editor/extensions'
import { renderFallbackHtml } from '../../src/utils/editor/render'
import {
  baseMarkTypes,
  baseNodeTypes,
  optionalImageAttributes,
  optionalImageNode,
  schemaSignature,
} from '../../src/utils/editor/schemaSignature'

const imageExtension = { name: 'image' }

vi.mock('@tiptap/extension-image', () => ({
  default: imageExtension,
}))

beforeEach(() => {
  vi.resetModules()
})

describe('extensionsList profile parity', () => {
  it('returns identical base extensions for basic profile across imports', async () => {
    const clientExtensions = extensionsList('basic')
    const serverExtensions = extensionsList('basic')

    expect(clientExtensions).toHaveLength(serverExtensions.length)
    serverExtensions.forEach((extension, index) => {
      expect(clientExtensions[index]).toBe(extension)
    })
  })

  it('adds the Image extension only for the full profile', async () => {
    const basicExtensions = extensionsList('basic')
    const fullExtensions = extensionsList('full')

    expect(fullExtensions).toHaveLength(basicExtensions.length + 1)
    expect(fullExtensions.slice(0, basicExtensions.length)).toEqual(basicExtensions)
    expect(fullExtensions.at(-1)).toBe(imageExtension)
  })

  it('renders fallback HTML with images only for full profile', () => {
    const payload = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Example' }],
        },
        {
          type: 'image',
          attrs: { src: '/media/demo.png', alt: 'Demo' },
        },
      ],
    }

    const basicHtml = renderFallbackHtml(payload, { profile: 'basic', slug: 'demo', documentId: '1' })
    const fullHtml = renderFallbackHtml(payload, { profile: 'full', slug: 'demo', documentId: '1' })

    expect(basicHtml).not.toContain('<img')
    expect(fullHtml).toContain('<img')
  })

  it('exposes schema signature for nodes and marks used by the renderer', () => {
    const expectedNodes = baseNodeTypes()
    const expectedMarks = baseMarkTypes()

    expect(optionalImageNode()).toBe('image')
    expect(optionalImageAttributes()).toEqual(['src', 'alt', 'title'])
    expect(expectedNodes).toEqual(
      expect.arrayContaining(['doc', 'paragraph', 'heading', 'blockquote']),
    )
    expect(expectedMarks).toEqual(['bold', 'italic', 'strike', 'code'])
    expect(schemaSignature.marks).toEqual(expectedMarks)
  })
})

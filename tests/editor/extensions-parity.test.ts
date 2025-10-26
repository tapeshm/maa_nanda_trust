import { describe, it, expect } from 'vitest'

import { extensionsList } from '../../src/utils/editor/extensions'
import { renderFallbackHtml } from '../../src/utils/editor/render'
import {
  baseMarkTypes,
  baseNodeTypes,
  optionalImageAttributes,
  optionalImageNode,
  schemaSignature,
} from '../../src/utils/editor/schemaSignature'
import { EDITOR_PROFILE_BASIC, EDITOR_PROFILE_FULL } from '../../src/editor/constants'

describe('extensionsList profile parity', () => {
  it('returns identical base extensions for basic profile across imports', async () => {
    const clientExtensions = extensionsList(EDITOR_PROFILE_BASIC)
    const serverExtensions = extensionsList(EDITOR_PROFILE_BASIC)

    expect(clientExtensions).toHaveLength(serverExtensions.length)
    serverExtensions.forEach((extension, index) => {
      expect(clientExtensions[index]).toBe(extension)
    })
  })

  it('adds the Image extension only for the full profile', async () => {
    const basicExtensions = extensionsList(EDITOR_PROFILE_BASIC)
    const fullExtensions = extensionsList(EDITOR_PROFILE_FULL)

    expect(fullExtensions).toHaveLength(basicExtensions.length + 1)
    expect(fullExtensions.slice(0, basicExtensions.length)).toEqual(basicExtensions)
    expect(fullExtensions.at(-1)?.name).toBe('imageFigure')
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
          type: 'imageFigure',
          attrs: { src: '/media/demo.png', alt: 'Demo' },
        },
      ],
    }

    const basicHtml = renderFallbackHtml(payload, {
      profile: EDITOR_PROFILE_BASIC,
      slug: 'demo',
      documentId: '1',
    })
    const fullHtml = renderFallbackHtml(payload, {
      profile: EDITOR_PROFILE_FULL,
      slug: 'demo',
      documentId: '1',
    })

    expect(basicHtml).not.toContain('<img')
    expect(fullHtml).toContain('<img')
  })

  it('exposes schema signature for nodes and marks used by the renderer', () => {
    const expectedNodes = baseNodeTypes()
    const expectedMarks = baseMarkTypes()

    expect(optionalImageNode()).toBe('imageFigure')
    expect(optionalImageAttributes()).toEqual(['src', 'alt', 'size', 'align', 'wrap'])
    expect(expectedNodes).toEqual(
      expect.arrayContaining(['doc', 'paragraph', 'heading', 'blockquote']),
    )
    expect(expectedMarks).toEqual(['bold', 'italic', 'strike', 'code', 'link'])
    expect(schemaSignature.marks).toEqual(expectedMarks)
  })
})

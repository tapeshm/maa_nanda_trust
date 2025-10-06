import { describe, it, expect } from 'vitest'

import { extensionsList } from '../../src/utils/editor/extensions'
import { renderFallbackHtml } from '../../src/utils/editor/render'
import {
  baseMarkTypes,
  baseNodeTypes,
  optionalImageNode,
  optionalImageFigureAttributes,
  schemaSignature,
} from '../../src/utils/editor/schemaSignature'
import imageFigure, {
  IMAGE_FIGURE_NODE_NAME,
} from '../../src/utils/editor/extensions/imageFigure'

describe('extensionsList profile parity', () => {
  it('returns identical base extensions for basic profile across imports', async () => {
    const clientExtensions = extensionsList('basic')
    const serverExtensions = extensionsList('basic')

    expect(clientExtensions).toHaveLength(serverExtensions.length)
    serverExtensions.forEach((extension, index) => {
      expect(clientExtensions[index]).toBe(extension)
    })
  })

  it('includes the shared imageFigure extension only for the full profile', () => {
    const basicExtensions = extensionsList('basic')
    const fullExtensions = extensionsList('full')

    expect(basicExtensions).not.toContain(imageFigure)
    expect(fullExtensions).toContain(imageFigure)
    expect(fullExtensions.slice(0, basicExtensions.length)).toEqual(basicExtensions)
    const figureExtension = fullExtensions.find((extension) => (extension as any).name === IMAGE_FIGURE_NODE_NAME)
    expect(figureExtension).toBeDefined()
    expect(basicExtensions.some((extension) => (extension as any).name === IMAGE_FIGURE_NODE_NAME)).toBe(false)
  })

  it('keeps renderer output aligned with extensions per profile', () => {
    const payload = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Example' }],
        },
        {
          type: IMAGE_FIGURE_NODE_NAME,
          attrs: {
            src: '/media/demo.png',
            alt: 'Demo',
            width: 640,
            height: 480,
            size: 'medium',
            align: 'center',
            captionId: 'imgcap-abcdefghij',
          },
          content: [{ type: 'text', text: 'Photo credit' }],
        },
      ],
    }

    const basicHtml = renderFallbackHtml(payload, { profile: 'basic', slug: 'demo', documentId: '1' })
    const fullHtml = renderFallbackHtml(payload, { profile: 'full', slug: 'demo', documentId: '1' })

    expect(basicHtml).not.toContain('<figure')
    expect(fullHtml).toContain('<figure')
    expect(fullHtml).toContain('editor-figure')
  })

  it('exposes schema signature for nodes and marks used by the renderer', () => {
    const expectedNodes = baseNodeTypes()
    const expectedMarks = baseMarkTypes()

    expect(schemaSignature.nodes.optional.imageFigure.name).toBe(optionalImageNode())
    expect(optionalImageFigureAttributes()).toEqual(
      expect.arrayContaining(['src', 'alt', 'width', 'height', 'size', 'align']),
    )
    expect(expectedNodes).toEqual(
      expect.arrayContaining(['doc', 'paragraph', 'heading', 'blockquote']),
    )
    expect(expectedMarks).toEqual(['bold', 'italic', 'strike', 'code'])
  })
})

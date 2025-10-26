/** @jsxImportSource hono/jsx */
// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { renderFallbackHtml, wrapWithProse } from '../../src/utils/editor/render'
import { contentClass } from '../../src/frontend/editor/ui/content'

describe('class-level parity for rendered content', () => {
  it('wraps public content with the same prose class as editor uses', () => {
    const prose = contentClass()
    const wrapped = wrapWithProse('<p>hello</p>', prose)
    expect(wrapped).toContain(`class="${prose}`)
  })

  it('imageFigure subtree renders expected tag names and classes', () => {
    const payload = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
        {
          type: 'imageFigure',
          attrs: { src: '/media/demo.png', alt: 'Demo', size: 'm', align: 'center' },
          content: [{ type: 'text', text: 'Caption' }],
        },
      ],
    }

    const html = renderFallbackHtml(payload, { profile: 'full', slug: 'demo', documentId: '1' })
    const wrapped = wrapWithProse(html, contentClass())

    // Wrapper contains class namespace
    expect(wrapped).toContain('class="content-prose prose')

    // Figure subtree parity
    expect(wrapped).toMatch(/<figure[^>]*class="[^"]*editor-figure[^"]*editor-figure--size-m[^"]*editor-figure--align-center/)
    expect(wrapped).toMatch(/<img[^>]*class="editor-image"/)
    expect(wrapped).toMatch(/<figcaption[^>]*class="editor-figcaption"/)
  })
})


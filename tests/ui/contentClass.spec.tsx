/** @jsxImportSource hono/jsx */
// [D3:editor-tiptap.step-11:content-class-parity-test] Verify SSR and editor wrappers use contentClass()

import { describe, expect, it } from 'vitest'
import { contentClass } from '../../src/frontend/editor/ui/content'
import { PROSE_BASE, PUBLIC_CONTENT_WRAPPER_CLASSNAME } from '../../src/frontend/editor/styles'
import { wrapWithProse } from '../../src/utils/editor/render'
import Page from '../../src/templates/page'

describe('[D3:editor-tiptap.step-11] contentClass parity', () => {
  it('SSR <Content> and editor wrappers have equal className sets', () => {
    // contentClass() is the source of truth
    const expectedClass = contentClass()

    // Both editor (PROSE_BASE) and public content (PUBLIC_CONTENT_WRAPPER_CLASSNAME) must use it
    expect(PROSE_BASE).toBe(expectedClass)
    expect(PUBLIC_CONTENT_WRAPPER_CLASSNAME).toBe(expectedClass)

    // Verify it returns the expected namespace
    expect(expectedClass).toBe('content-prose prose')
  })

  it('Rendered h2/p nodes are descendants of `.content-prose`', () => {
    const html = '<h2>Heading</h2><p>Paragraph text</p>'
    const wrapped = wrapWithProse(html, contentClass())

    // Check that the wrapper includes the content-prose class
    expect(wrapped).toContain('class="content-prose prose"')
    expect(wrapped).toContain('<article class="content-prose prose">')

    // Check that content is wrapped
    expect(wrapped).toContain('<h2>Heading</h2>')
    expect(wrapped).toContain('<p>Paragraph text</p>')
    expect(wrapped).toMatch(/<article[^>]*>.*<h2>.*<\/h2>.*<\/article>/s)
  })
})

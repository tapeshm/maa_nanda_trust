/** @jsxImportSource hono/jsx */
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import { EditorInstance } from '../../src/templates/components/editor'
import { renderFallbackHtml } from '../../src/utils/editor/render'

describe('editor a11y semantics', () => {
  it('toolbar is grouped and labelled for assistive tech', async () => {
    const markup = renderToString(
      <EditorInstance spec={{ id: 'a11y_toolbar', profile: 'basic' }} payload={{ type: 'doc', content: [] }} />,
    )

    // Toolbar role grouping + label
    expect(markup).toMatch(/role="group"/)
    expect(markup).toMatch(/aria-label="Formatting toolbar"/)

    // Buttons expose aria-pressed and are button elements
    expect(markup).toMatch(/<button[^>]*aria-pressed="false"/)
  })

  it('image panel exposes labelled radiogroups and inputs (full profile)', async () => {
    const html = renderToString(
      <EditorInstance spec={{ id: 'a11y_image', profile: 'full' }} payload={{ type: 'doc', content: [] }} />,
    )

    // Panel grouping + label
    expect(html).toMatch(/data-image-panel/)
    expect(html).toMatch(/role="group"/)
    expect(html).toMatch(/aria-label="Image controls"/)

    // Radiogroups for size, alignment, wrapping
    expect(html).toMatch(/role="radiogroup" aria-label="Image size"/)
    expect(html).toMatch(/role="radiogroup" aria-label="Image alignment"/)
    expect(html).toMatch(/role="radiogroup" aria-label="Image wrapping"/)

    // Alt input present with label
    expect(html).toMatch(/<label[^>]*>\s*Alt text\s*<\/label>/)
    expect(html).toMatch(/<input[^>]*id="a11y_image__image-alt-input"/)
  })

  it('rendered figures always include img with alt (empty allowed)', () => {
    const payload = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
        { type: 'imageFigure', attrs: { src: '/media/example.png' } },
      ],
    }
    const html = renderFallbackHtml(payload, { profile: 'full', slug: 'demo', documentId: '1' })
    // Expect an <img> with alt attribute present (may be empty string)
    expect(html).toMatch(/<img[^>]*\salt=""/)
  })
})


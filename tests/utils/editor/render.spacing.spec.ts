import { describe, it, expect } from 'vitest'
import {
  normalizeEditorHtmlWhitespace,
  renderFallbackHtml,
} from '../../../src/utils/editor/render'

describe('renderFallbackHtml spacing', () => {
  it('preserves blank paragraphs as line breaks', () => {
    const payload = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph' }],
        },
        {
          type: 'paragraph',
          content: [],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    }

    const html = renderFallbackHtml(payload, { profile: 'basic' })
    expect(html).toBe('<p>First paragraph</p><p><br /></p><p>Second paragraph</p>')
  })

  it('normalizes stored HTML empty paragraphs to include a line break', () => {
    expect(normalizeEditorHtmlWhitespace('<p></p>')).toBe('<p><br /></p>')
    expect(normalizeEditorHtmlWhitespace('<p class="foo">\n</p>')).toBe('<p class="foo"><br /></p>')
  })
})

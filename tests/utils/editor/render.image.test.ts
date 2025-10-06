import { describe, it, expect } from 'vitest'

import {
  renderFallbackHtml,
  sanitizeEditorJson,
  isSafeEditorHtml,
  selectRenderedHtml,
} from '../../../src/utils/editor/render'
import { IMAGE_FIGURE_NODE_NAME } from '../../../src/utils/editor/extensions/imageFigure'

describe('imageFigure rendering and sanitisation', () => {
  const context = { profile: 'full' as const, origin: 'https://example.com' }

  function figureDoc(attrs: Record<string, unknown>, caption: string | null = 'Caption text') {
    return {
      type: 'doc',
      content: [
        {
          type: IMAGE_FIGURE_NODE_NAME,
          attrs: {
            src: '/media/demo.webp',
            alt: 'Demo alt',
            width: 640,
            height: 480,
            size: 'medium',
            align: 'center',
            captionId: 'imgcap-abcdefghij',
            ...attrs,
          },
          content: caption
            ? [
                {
                  type: 'text',
                  text: caption,
                  marks: [{ type: 'bold' }],
                },
              ]
            : [],
        },
      ],
    }
  }

  it('renders sanitized imageFigure JSON with intrinsic dimensions and caption marks', () => {
    const doc = figureDoc({}, 'Highlighted')
    const html = renderFallbackHtml(doc, context)
    expect(html).toContain('<figure class="editor-figure editor-figure--size-medium editor-figure--align-center">')
    expect(html).toContain('<img class="editor-image"')
    expect(html).toContain('width="640"')
    expect(html).toContain('height="480"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('aria-describedby="imgcap-abcdefghij"')
    expect(html).toContain('<strong>Highlighted</strong>')
  })

  it('normalizes invalid size, align, and dimensions to safe defaults', () => {
    const doc = figureDoc({ size: 'huge', align: 'diagonal', width: 99999, height: -10 })
    const sanitized = sanitizeEditorJson(doc, context)
    expect(sanitized?.content?.[0]?.attrs).toMatchObject({
      size: 'medium',
      align: 'center',
      width: 8192,
      height: 1,
    })
    const html = renderFallbackHtml(doc, context)
    expect(html).toContain('editor-figure--size-medium')
    expect(html).toContain('editor-figure--align-center')
  })

  it('accepts relative and same-origin media sources while rejecting external hosts', () => {
    const relativeDoc = figureDoc({ src: '/media/sample.jpg' })
    const relativeHtml = renderFallbackHtml(relativeDoc, context)
    expect(isSafeEditorHtml(relativeHtml, context)).toBe(true)

    const absoluteDoc = figureDoc({ src: 'https://example.com/media/asset.png' })
    const absoluteHtml = renderFallbackHtml(absoluteDoc, context)
    expect(isSafeEditorHtml(absoluteHtml, context)).toBe(true)

    const storedExternalHtml =
      '<figure class="editor-figure editor-figure--size-medium editor-figure--align-center"><img class="editor-image" src="https://cdn.example.org/media/asset.png" alt="bad" loading="lazy" decoding="async" /><figcaption class="editor-figcaption" id="imgcap-abcdefghij">External</figcaption></figure>'
    expect(isSafeEditorHtml(storedExternalHtml, context)).toBe(false)

    const externalDoc = figureDoc({ src: 'https://cdn.example.org/media/asset.png' })
    const sanitized = renderFallbackHtml(externalDoc, context)
    expect(sanitized).not.toContain('cdn.example.org')
  })

  it('emits aria-describedby only when caption text is present', () => {
    const withCaption = renderFallbackHtml(figureDoc({}, 'Caption present'), context)
    expect(withCaption).toContain('aria-describedby="imgcap-abcdefghij"')

    const withoutCaption = renderFallbackHtml(figureDoc({}, null), context)
    expect(withoutCaption).not.toContain('aria-describedby=')
  })

  it('rejects figures with invalid <img> markup when validating stored HTML', () => {
    const invalidHtml =
      '<figure class="editor-figure editor-figure--size-medium editor-figure--align-center"><figcaption class="editor-figcaption" id="imgcap-invalid">Text</figcaption></figure>'
    expect(isSafeEditorHtml(invalidHtml, context)).toBe(false)

    const multipleImg =
      '<figure class="editor-figure editor-figure--size-medium editor-figure--align-center"><img class="editor-image" src="/media/a.jpg" alt="a" loading="lazy" decoding="async" /><img class="editor-image" src="/media/b.jpg" alt="b" loading="lazy" decoding="async" /><figcaption class="editor-figcaption" id="imgcap-two">Caption</figcaption></figure>'
    expect(isSafeEditorHtml(multipleImg, context)).toBe(false)
  })

  it('falls back to sanitized JSON when stored HTML is invalid', () => {
    const jsonDoc = figureDoc({ alt: 'Stored alt' }, 'Stored caption')
    const invalidStoredHtml =
      '<figure class="editor-figure"><img class="editor-image" src="https://cdn.example.com/media/invalid.jpg" alt="bad" loading="lazy" decoding="async" /><figcaption class="editor-figcaption" id="invalid">Bad</figcaption></figure>'

    const { html, fromStored } = selectRenderedHtml(jsonDoc, invalidStoredHtml, context)
    expect(fromStored).toBe(false)
    expect(html).toContain('/media/demo.webp')
    expect(html).toContain('editor-figure--size-medium')
  })

  it('ensures an alt attribute is always present and empty when omitted', () => {
    const noAltDoc = figureDoc({ alt: undefined })
    const html = renderFallbackHtml(noAltDoc, context)
    expect(html).toContain('alt=""')
  })

  it('drops invalid aria-describedby references and regenerates valid markup', () => {
    const invalidHtml =
      '<figure class="editor-figure editor-figure--size-medium editor-figure--align-center"><img class="editor-image" src="/media/asset.png" alt="demo" loading="lazy" decoding="async" aria-describedby="bad" /><figcaption class="editor-figcaption" id="imgcap-abcdefghij">Caption</figcaption></figure>'
    expect(isSafeEditorHtml(invalidHtml, context)).toBe(false)

    const result = selectRenderedHtml(
      figureDoc({ captionId: 'imgcap-abcdefghij' }, 'Caption'),
      invalidHtml,
      context,
    )
    expect(result.fromStored).toBe(false)
    expect(result.html).toContain('aria-describedby="imgcap-abcdefghij"')
  })
})

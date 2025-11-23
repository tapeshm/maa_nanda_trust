/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import TransparencyPage from '../../src/templates/public/pages/TransparencyPage'
import { DEFAULT_TRANSPARENCY_CONTENT } from '../../src/data/transparency'

describe('TransparencyPage', () => {
  it('renders with dynamic content', () => {
    const markup = renderToString(<TransparencyPage transparencyContent={DEFAULT_TRANSPARENCY_CONTENT} />)

    expect(markup).toContain(DEFAULT_TRANSPARENCY_CONTENT.hero.title)
    expect(markup).toContain(DEFAULT_TRANSPARENCY_CONTENT.hero.description)
    expect(markup).toContain(DEFAULT_TRANSPARENCY_CONTENT.trustDetails.trustName)
    expect(markup).toContain(DEFAULT_TRANSPARENCY_CONTENT.trustDetails.registrationNumber)
    
    DEFAULT_TRANSPARENCY_CONTENT.propertyDetails.forEach(detail => {
        expect(markup).toContain(detail)
    })

    DEFAULT_TRANSPARENCY_CONTENT.documents.forEach(doc => {
        expect(markup).toContain(doc.name)
        expect(markup).toContain(doc.description)
    })
  })
})

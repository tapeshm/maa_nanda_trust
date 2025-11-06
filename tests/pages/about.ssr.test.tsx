/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import AboutPage from '../../src/templates/public/pages/about'

describe('AboutPage', () => {
  it('renders with shared layout and scroll manuscript without door or donation', () => {
    const markup = renderToString(<AboutPage />)

    expect(markup).toContain('data-top-nav')
    expect(markup).toContain('Guardians of Maa Nanda Devi')
    expect(markup).not.toContain('data-door-overlay')
    expect(markup).not.toContain('data-donation-button')
  })
})

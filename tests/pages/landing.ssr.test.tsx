/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../src/templates/public/pages/landing'

describe('LandingPage', () => {
  it('renders hero, scroll manuscript, donation CTA, and door overlay', () => {
    const markup = renderToString(<LandingPage />)

    expect(markup).toContain('Enter the Divine Resonance')
    expect(markup).toContain('data-door-overlay')
    expect(markup).toContain('data-donation-button')
    expect(markup).toContain('href="#seva"')
    expect(markup).toContain('Deepdaan Mahotsav')
  })

  it('includes mobile menu toggle button hidden by default', () => {
    const markup = renderToString(<LandingPage />)
    expect(markup).toContain('data-scroll-toggle')
    expect(markup).toContain('aria-expanded="false"')
  })
})

/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../src/templates/public/pages/landing'

describe('LandingPage accessibility', () => {
  it('provides primary nav labelling and section anchors', () => {
    const markup = renderToString(<LandingPage />)

    expect(markup).toContain('aria-label="Primary"')
    expect(markup).toContain('id="darshan"')
    expect(markup).toContain('id="seva"')
    expect(markup).toContain('data-nav-offset="160"')
  })
})

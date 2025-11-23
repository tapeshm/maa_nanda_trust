/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import LandingPage from '../../src/templates/public/pages/landing'
import { DEFAULT_LANDING_CONTENT } from '../../src/data/landing.data'

describe('LandingPage accessibility', () => {
  it('provides primary nav labelling', () => {
    const markup = renderToString(<LandingPage projects={[]} events={[]} landingContent={DEFAULT_LANDING_CONTENT} />)

    // The primary navigation is still expected to be rendered by PublicLayout
    expect(markup).toContain('aria-label="Primary"')
  })
})

/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import PublicLayout from '../../src/templates/public/layout/PublicLayout'
import type { PublicNavLink } from '../../src/templates/public/layout/PublicTopNav'

const LINKS: PublicNavLink[] = [
  { href: '#about', label: 'About' },
  { href: '#visit', label: 'Visit' },
]

describe('PublicLayout', () => {
  it('renders top nav, mobile menu, and footer with content offset below nav', () => {
    const markup = renderToString(
      <PublicLayout
        title="Test Page"
        navLinks={LINKS}
        includeTempleDoor={false}
        enableDonationInteractions={false}
      >
        <div id="about" class="py-10">
          Test content
        </div>
      </PublicLayout>,
    )

    expect(markup).toContain('data-top-nav')
    expect(markup).toContain('data-scroll-menu')
    expect(markup).toContain('data-content-shell')
    expect(markup).toContain('data-nav-offset="160"')
    expect(markup).toContain('is-visible')
    expect(markup).toContain('Crafted for iterative exploration')
  })
})

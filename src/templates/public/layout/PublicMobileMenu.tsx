/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import type { PublicNavLink } from './PublicTopNav'

interface PublicMobileMenuProps {
  links: PublicNavLink[]
}

// [D3:pages.step-03:mobile-menu] Scroll-styled mobile menu from reference
const PublicMobileMenu: FC<PublicMobileMenuProps> = ({ links }) => (
  <div class="scroll-menu" data-scroll-menu>
    <button
      type="button"
      class="scroll-menu-toggle"
      aria-expanded="false"
      aria-controls="scrollMenuPanel"
      data-scroll-toggle
    >
      <span class="scroll-menu-icon" aria-hidden="true">
        <span class="scroll-menu-rod"></span>
        <span class="scroll-menu-cord scroll-menu-cord--left"></span>
        <span class="scroll-menu-cord scroll-menu-cord--right"></span>
        <span class="scroll-menu-tassel"></span>
      </span>
      <span class="scroll-menu-label">Menu</span>
    </button>
    <nav
      class="scroll-menu-panel"
      id="scrollMenuPanel"
      aria-label="Primary navigation"
      hidden
      data-scroll-panel
    >
      <div class="scroll-menu-scroll">
        <div class="scroll-menu-roll" aria-hidden="true"></div>
        <div class="scroll-menu-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              class={
                link.highlighted
                  ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold'
                  : ''
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  </div>
)

export default PublicMobileMenu

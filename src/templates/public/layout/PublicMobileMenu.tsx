/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { type PublicNavLink } from './PublicTopNav'
import { html } from 'hono/html'

interface PublicMobileMenuProps {
  links: PublicNavLink[]
  isLoggedIn?: boolean
}

const PublicMobileMenu: FC<PublicMobileMenuProps> = ({ links, isLoggedIn = false }) => {
  const containerId = 'mobile-scroll-container'

  return (
    <>
      <div
        id={containerId}
        class="scroll-menu"
      >

        {/* The String Tie (Visible only when closed) */}
        <div class="scroll-menu-string" aria-hidden="true"></div>

        {/* Top Rod */}
        <div class="scroll-menu-rod top-rod" aria-hidden="true"></div>

        {/* The Parchment (Hidden when closed, expands when open) */}
        <nav class="scroll-menu-panel" aria-label="Primary navigation" onclick="event.stopPropagation()">
          <div class="scroll-menu-links">
            <div class="mobile-nav-heading">❖ NAVIGATION ❖</div>
            {links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            {isLoggedIn ? (
              <a href="/admin/dashboard">Dashboard</a>
            ) : (
              <a href="/admin/dashboard">Dashboard</a>
            )}
            <a href="/donate" class="mobile-nav-donate-link">
              ❤ Donate
            </a>
          </div>
        </nav>

        {/* Bottom Rod */}
        <div class="scroll-menu-rod bottom-rod" aria-hidden="true"></div>

        {/* The Wax Seal (Visible when closed, fades out when open) */}
        <div class="scroll-menu-seal">N</div>

      </div>
    </>
  )
}

export default PublicMobileMenu

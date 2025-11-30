/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import { type NavigationConfig } from '../../../config/navigation'

interface PublicMobileMenuProps {
  config: NavigationConfig
}

const PublicMobileMenu: FC<PublicMobileMenuProps> = ({ config }) => {
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
            {config.mainLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            
            <a href={config.langToggle.href} class="mobile-nav-lang-link">
              {config.langToggle.label}
            </a>

            <a href={config.authLink.href}>
              {config.authLink.label}
            </a>

            <a href={config.donateLink.href} class="mobile-nav-donate-link">
              ❤ {config.donateLink.label}
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

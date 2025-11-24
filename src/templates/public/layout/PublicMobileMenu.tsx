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

      {/* Client-side Script for Click-Outside Behavior */}
      {html`
        <script>
          (function() {
            const menu = document.getElementById('${containerId}');
            
            if (menu) {
              // Toggle menu on click
              menu.addEventListener('click', function(event) {
                if (!event.defaultPrevented) {
                  this.classList.toggle('open');
                }
              });

              // Close menu when clicking outside
              document.addEventListener('click', function(event) {
                const isClickInside = menu.contains(event.target);
                const isOpen = menu.classList.contains('open');

                if (!isClickInside && isOpen) {
                  menu.classList.remove('open');
                }
              });
            }
          })();
        </script>
      `}
    </>
  )
}

export default PublicMobileMenu

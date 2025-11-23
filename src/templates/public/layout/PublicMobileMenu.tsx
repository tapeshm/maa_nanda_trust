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
        // The script below handles the logic, but we keep a simple inline toggle 
        // as a fallback or for immediate interaction
        onclick={`
          if (!event.defaultPrevented) {
            this.classList.toggle('open');
          }
        `}
      >

        {/* The String Tie (Visible only when closed) */}
        <div class="scroll-menu-string" aria-hidden="true"></div>

        {/* Top Rod */}
        <div class="scroll-menu-rod top-rod" aria-hidden="true"></div>

        {/* The Parchment (Hidden when closed, expands when open) */}
        <nav class="scroll-menu-panel" aria-label="Primary navigation" onclick="event.stopPropagation()">
          <div class="scroll-menu-links">
            <div style="font-size:12px; opacity:0.6; margin-bottom:5px; letter-spacing: 0.1em;">❖ NAVIGATION ❖</div>
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
            <a href="/donate" style="color: var(--sindoor); font-weight:bold; margin-top:10px;">
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
            
            document.addEventListener('click', function(event) {
              if (!menu) return;
              
              const isClickInside = menu.contains(event.target);
              const isOpen = menu.classList.contains('open');

              // If clicking OUTSIDE the menu and it is currently OPEN, close it.
              if (!isClickInside && isOpen) {
                menu.classList.remove('open');
              }
            });
          })();
        </script>
      `}
    </>
  )
}

export default PublicMobileMenu

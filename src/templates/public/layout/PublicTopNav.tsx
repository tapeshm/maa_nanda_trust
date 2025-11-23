/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

export interface PublicNavLink {
  href: string
  label: string
  highlighted?: boolean
}

interface PublicTopNavProps {
  links: PublicNavLink[]
  loginHref?: string
  isLoggedIn?: boolean
}

// [D3:pages.step-03:top-nav] Desktop navigation bar from reference
const PublicTopNav: FC<PublicTopNavProps> = ({ links, loginHref = '/login', isLoggedIn = false }) => (
  <nav class="top-nav" aria-label="Primary">
    {links.map((link) => (
      <a
        key={link.href}
        href={link.href}
        class={
          link.highlighted
            ? 'bg-gradient-to-br from-amber-200 to-amber-600 text-amber-900 border-2 border-amber-300/60 hover:scale-105'
            : ''
        }
      >
        {link.label}
      </a>
    ))}
    {isLoggedIn ? (
      <a href="/admin/dashboard" class="absolute right-8 text-sm font-bold text-amber-200/80 hover:text-amber-100 uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity">
        Dashboard
      </a>
    ) : (
      <a href="/admin/dashboard" class="absolute right-8 text-sm font-bold text-amber-200/80 hover:text-amber-100 uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity">
        Dashboard
      </a>
    )}
  </nav>
)

export default PublicTopNav

/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import { type NavigationConfig } from '../../../config/navigation'

interface PublicTopNavProps {
  config: NavigationConfig
}

// [D3:pages.step-03:top-nav] Desktop navigation bar with active state
const PublicTopNav: FC<PublicTopNavProps> = ({ config }) => {
  return (
  <nav class="top-nav" aria-label="Primary">
    {config.mainLinks.map((link) => (
      <a
        key={link.href}
        href={link.href}
        aria-current={link.isActive ? 'page' : undefined}
        class={
          link.highlighted
            ? 'bg-gradient-to-br from-amber-200 to-amber-600 text-amber-900 border-2 border-amber-300/60 hover:scale-105'
            : link.isActive
              ? 'is-active'
              : ''
        }
      >
        {link.label}
      </a>
    ))}
  </nav>
)}

export default PublicTopNav

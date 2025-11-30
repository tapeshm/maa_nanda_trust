/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import { type NavigationConfig } from '../../../config/navigation'

interface PublicTopNavProps {
  config: NavigationConfig
}

// [D3:pages.step-03:top-nav] Desktop navigation bar from reference
const PublicTopNav: FC<PublicTopNavProps> = ({ config }) => {
  return (
  <nav class="top-nav" aria-label="Primary">
    {config.mainLinks.map((link) => (
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
    
    <div class="absolute right-8 flex items-center gap-4">
      {/* Language Toggle */}
      <a href={config.langToggle.href} class="text-xs font-bold text-amber-200/80 hover:text-amber-100 uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity">
        {config.langToggle.label}
      </a>

      {/* Auth Link */}
      <a href={config.authLink.href} class="text-xs font-bold text-amber-200/80 hover:text-amber-100 uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity">
        {config.authLink.label}
      </a>
    </div>
  </nav>
)}

export default PublicTopNav

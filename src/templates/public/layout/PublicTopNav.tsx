/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'

export interface PublicNavLink {
  href: string
  label: string
  highlighted?: boolean
}

interface PublicTopNavProps {
  links: PublicNavLink[]
  loginHref?: string
  isLoggedIn?: boolean
  lang?: Language
  activePath?: string
}

// [D3:pages.step-03:top-nav] Desktop navigation bar from reference
const PublicTopNav: FC<PublicTopNavProps> = ({ 
  links, 
  loginHref = '/login', 
  isLoggedIn = false,
  lang = DEFAULT_LANGUAGE,
  activePath = '/'
}) => {
  
  const getLocalizedHref = (href: string) => {
    if (lang === 'en') return href;
    // Ensure we don't double prefix if href is absolute or special, but here we assume internal relative paths
    return `/hi${href === '/' ? '' : href}`;
  };

  const toggleLang = lang === 'en' ? 'hi' : 'en';
  const toggleLabel = lang === 'en' ? 'हिंदी' : 'English';
  
  let toggleHref = '';
  if (lang === 'en') {
     toggleHref = `/hi${activePath === '/' ? '' : activePath}`;
  } else {
     toggleHref = activePath.replace(/^\/hi/, '') || '/';
  }

  return (
  <nav class="top-nav" aria-label="Primary">
    {links.map((link) => (
      <a
        key={link.href}
        href={getLocalizedHref(link.href)}
        class={
          link.highlighted
            ? 'bg-gradient-to-br from-amber-200 to-amber-600 text-amber-900 border-2 border-amber-300/60 hover:scale-105'
            : ''
        }
      >
        {link.label}
      </a>
    ))}
    
    {/* Language Toggle */}
    <a href={toggleHref} class="text-sm font-bold text-amber-200/80 hover:text-amber-100 uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity ml-4">
      {toggleLabel}
    </a>

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
)}

export default PublicTopNav
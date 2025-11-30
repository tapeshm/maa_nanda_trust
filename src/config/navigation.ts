import type { Language } from '../utils/i18n'

export interface PublicNavLink {
  href: string
  label: string
  highlighted?: boolean
}

export function getNavLinks(lang: Language): PublicNavLink[] {
  const isHi = lang === 'hi';
  return [
    { href: '/about', label: isHi ? 'हमारे बारे में' : 'About Us' },
    { href: '/projects', label: isHi ? 'परियोजनाएं' : 'Projects' },
    { href: '/events', label: isHi ? 'कार्यक्रम' : 'Events' },
    { href: '/transparency', label: isHi ? 'पारदर्शिता' : 'Transparency' },
  ];
}

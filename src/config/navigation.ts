import { type Language, getLocalizedHref, getLanguageToggle } from '../utils/i18n'

export interface Link {
  href: string
  label: string
  highlighted?: boolean
  isActive?: boolean
}

export interface NavigationConfig {
  mainLinks: Link[]
  donateLink: Link
  authLink: Link
  langToggle: Link
}

export function getNavigationConfig(
  lang: Language, 
  isLoggedIn: boolean, 
  activePath: string
): NavigationConfig {
  const isHi = lang === 'hi';
  
  // 1. Main Navigation Links with active state detection
  const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';
  const normalizedActive = normalizePath(activePath);

  const mainLinks: Link[] = [
    { href: getLocalizedHref('/', lang), label: isHi ? 'मुखपृष्ठ' : 'Home', isActive: normalizedActive === '/' || normalizedActive === `/${lang}` },
    { href: getLocalizedHref('/about', lang), label: isHi ? 'हमारे बारे में' : 'About Us', isActive: normalizedActive.includes('/about') },
    { href: getLocalizedHref('/projects', lang), label: isHi ? 'परियोजनाएं' : 'Projects', isActive: normalizedActive.includes('/projects') },
    { href: getLocalizedHref('/events', lang), label: isHi ? 'कार्यक्रम' : 'Events', isActive: normalizedActive.includes('/events') },
    { href: getLocalizedHref('/transparency', lang), label: isHi ? 'पारदर्शिता' : 'Transparency', isActive: normalizedActive.includes('/transparency') },
  ];

  // 2. Donate Link
  const donateLink: Link = {
    href: getLocalizedHref('/donate', lang),
    label: isHi ? 'दान करें' : 'Donate',
    highlighted: true
  };

  // 3. Auth Link
  const authLink: Link = {
    href: '/admin/dashboard',
    label: isLoggedIn ? (isHi ? 'डैशबोर्ड' : 'Dashboard') : (isHi ? 'लॉग इन' : 'Login')
  };

  // 4. Language Toggle
  const toggle = getLanguageToggle(lang, activePath);
  const langToggle: Link = {
    href: toggle.href,
    label: toggle.label
  };

  return {
    mainLinks,
    donateLink,
    authLink,
    langToggle
  };
}

// Deprecated: Use getNavigationConfig instead
export type PublicNavLink = Link;
export function getNavLinks(lang: Language): PublicNavLink[] {
   return getNavigationConfig(lang, false, '/').mainLinks;
}

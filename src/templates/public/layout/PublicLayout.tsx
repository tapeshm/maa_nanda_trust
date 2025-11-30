/** @jsxImportSource hono/jsx */

import type { FC, PropsWithChildren } from 'hono/jsx'
import { resolveAsset } from '../../../utils/assets'
import PublicTopNav, { type PublicNavLink } from './PublicTopNav'
import PublicMobileMenu from './PublicMobileMenu'
import PublicFooter from './PublicFooter'
import TempleDoor from '../effects/TempleDoor'
import FloatingDonationButton from '../effects/FloatingDonationButton'
import { type Language, DEFAULT_LANGUAGE, getLocalizedHref } from '../../../utils/i18n'

export interface PublicLayoutProps {
  title: string
  navLinks: PublicNavLink[]
  isLoggedIn?: boolean
  includeTempleDoor?: boolean
  includeFooter?: boolean
  includeFloatingDonation?: boolean
  donationHref?: string
  donationLabel?: string
  footerText?: string
  themeColor?: string
  skipLinkText?: string
  googleFontsHref?: string
  lang?: Language
  activePath?: string
}

// [D3:pages.step-03:public-layout] Clean layout from reference HTML
const PublicLayout: FC<PropsWithChildren<PublicLayoutProps>> = ({
  title,
  navLinks,
  isLoggedIn = false,
  includeTempleDoor = true,
  includeFooter = true,
  includeFloatingDonation = true,
  donationHref = '/donate',
  donationLabel = 'Donate',
  footerText,
  themeColor = '#2f1b10',
  skipLinkText = 'Skip to content',
  googleFontsHref = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;600;700&display=swap',
  lang = DEFAULT_LANGUAGE,
  activePath = '/',
  children,
}) => {
  const publicPagesAsset = resolveAsset('public-pages')
  
  const localizedDonationHref = donationHref === '/donate' 
    ? getLocalizedHref('/donate', lang) 
    : donationHref;

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="theme-color" content={themeColor} />

        {/* App CSS (Tailwind) */}
        <link rel="stylesheet" href="/assets/app.css" />

        {/* Public pages styles */}
        <link rel="stylesheet" href="/styles/public-pages.css" />

        {/* Google Fonts */}
        {googleFontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href={googleFontsHref} rel="stylesheet" />
          </>
        ) : null}
      </head>
      <body class="min-h-screen bg-[var(--bg-deep)] text-[var(--cream)] antialiased" style="background: var(--bg-ambient)">
        {/* Skip link for accessibility */}
        <a class="skip-link" href="#main-content">
          {skipLinkText}
        </a>

        {/* Temple door overlay (if enabled) */}
        {includeTempleDoor ? <TempleDoor /> : null}

        {/* Ambient frame and glow */}
        <div class="page-frame" aria-hidden="true"></div>
        <div class="incense-glow" aria-hidden="true"></div>
        <div class="temple-interior" aria-hidden="true"></div>

        {/* Content shell */}
        <div class={includeTempleDoor ? "content-shell" : "content-shell is-visible"} data-content-shell>
          {/* Mobile scroll menu */}
          <PublicMobileMenu links={navLinks} isLoggedIn={isLoggedIn} lang={lang} activePath={activePath} />

          {/* Desktop navigation */}
          <PublicTopNav links={navLinks} isLoggedIn={isLoggedIn} lang={lang} activePath={activePath} />

          {/* Main content */}
          <main id="main-content" class="relative isolate z-[80] pt-[clamp(52px,9vw,140px)] transition-[padding-top] duration-[var(--nav-collapse-duration)] ease-[var(--nav-collapse-easing)]">
            {children}
          </main>

          {/* Footer */}
          {includeFooter ? <PublicFooter text={footerText} /> : null}
        </div>

        {/* Floating donation button */}
        {includeFloatingDonation ? (
          <FloatingDonationButton href={localizedDonationHref} label={donationLabel} />
        ) : null}

        {/* Client-side interactions */}
        <script src={publicPagesAsset.script} type="module" defer></script>
      </body>
    </html>
  )
}

export default PublicLayout
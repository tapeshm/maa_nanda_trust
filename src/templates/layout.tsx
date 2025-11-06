import type { FC, PropsWithChildren } from 'hono/jsx'
import { resolveAsset } from '../utils/assets'

type Hero = {
  title: string
  subtitle?: string
  primaryCta?: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
  imageLight?: string
  imageDark?: string
  announcement?: { text: string; href: string; label: string }
}

/**
 * Shared layout: mobile‑friendly header, dark/light toggle, optional hero.
 * Use `hero` to render a reference‑style hero above page content.
 */
const Layout: FC<{
  title: string
  admin?: boolean
  signedIn?: boolean
  hero?: Hero | null
  csrfToken?: string
  extraHead?: any
  toolbar?: unknown
} & PropsWithChildren> = ({
  title,
  admin: _admin = false,
  signedIn = false,
  hero = null,
  csrfToken,
  extraHead,
  toolbar,
  children,
}) => {
    const navLinks = [
      { href: '/', label: 'About' },
      { href: '/', label: 'Projects' },
      { href: '/', label: 'Transparency' },
      { href: '/', label: 'Gallery' },
    ]
    const links = signedIn ? [...navLinks, { href: '/admin', label: 'Admin' }] : navLinks

    const heroDefaults: Hero = {
      title: 'Welcome to Temple Trust',
      subtitle:
        'Preserving our spiritual heritage and serving the community through devotion, education, and culture.',
      primaryCta: { href: '/', label: 'Learn more' },
      secondaryCta: { href: '/', label: 'Support us →' },
      imageLight:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2830&q=80&blend=ffffff&sat=-100&exp=15&blend-mode=overlay',
      imageDark:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2830&q=80&blend=111827&sat=-100&exp=15&blend-mode=multiply',
    }

    const h = hero ? { ...heroDefaults, ...hero } : null

    // [D3:editor-tiptap.step-01:ui-asset] Resolve hashed UI bundle from the manifest.
    const uiAsset = resolveAsset('ui')
    void _admin

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {/* Tailwind (local build output) */}
          <link rel="stylesheet" href="/assets/app.css" />
          {/* HTMX + Tailwind Elements + theme toggle via UI bundle */}
          {uiAsset.styles.map((href) => (
            <link rel="stylesheet" href={href} key={href} />
          ))}
          <script src={uiAsset.script} type="module" defer></script>
          {/* Tailwind Elements previously loaded from CDN; now bundled locally via Vite. */}
          {extraHead}
        </head>
        <body class="min-h-screen bg-yellow-50 text-gray-900 dark:bg-gray-900 dark:text-white">
          {/* Header */}
          <header class={h ? 'sticky top-0 z-50 border-b bg-orange-100 dark:bg-gray-900' : 'sticky top-0 z-50  bg-yellow-500 dark:bg-gray-900 shadow'}>
            <nav aria-label="Global" class="mx-auto max-w-7xl flex items-center justify-between p-4 sm:p-6 lg:px-8">
              {/* Brand */}
              <div class="flex items-center lg:flex-1">
                <a href="/" class="-m-1.5 p-1.5 flex items-center">
                  <span class="sr-only">Temple Trust</span>
                  <span class="text-lg font-semibold">Temple-trust-Logo</span>
                </a>
              </div>

              {/* Mobile controls */}
              <div class="flex items-center gap-2 lg:hidden">
                <button
                  data-theme-toggle
                  type="button"
                  title="Toggle dark mode"
                  class="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {/* Sun (shown in dark mode to switch to light) */}
                  <svg class="h-5 w-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75v1.5M12 18.75v1.5M4.72 4.72l1.06 1.06m12.5 12.5l1.06 1.06M3.75 12h1.5m13.5 0h1.5M4.72 19.28l1.06-1.06m12.5-12.5l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                  </svg>
                  {/* Moon (shown in light mode to switch to dark) */}
                  <svg class="h-5 w-5 block dark:hidden" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.752 15.002A9.718 9.718 0 0112 21.75 9.75 9.75 0 1113.002 2.248a8.25 8.25 0 008.75 12.754z" />
                  </svg>
                </button>
                <button
                  type="button"
                  command="show-modal"
                  commandfor="mobile-menu"
                  class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-600 dark:text-gray-300"
                >
                  <span class="sr-only">Open main menu</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="h-6 w-6">
                    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Desktop navigation */}
              <div class="hidden lg:flex lg:gap-x-10">
                {links.map(({ href, label }) => (
                  <a href={href} class="text-sm font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                    {label}
                  </a>
                ))}
              </div>

              {/* Right side (desktop) */}
              <div class="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-6">
                <button
                  data-theme-toggle
                  type="button"
                  title="Toggle dark mode"
                  class="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {/* Sun (shown in dark mode) */}
                  <svg class="h-5 w-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75v1.5M12 18.75v1.5M4.72 4.72l1.06 1.06m12.5 12.5l1.06 1.06M3.75 12h1.5m13.5 0h1.5M4.72 19.28l1.06-1.06m12.5-12.5l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                  </svg>
                  {/* Moon (shown in light mode) */}
                  <svg class="h-5 w-5 block dark:hidden" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.752 15.002A9.718 9.718 0 0112 21.75 9.75 9.75 0 1113.002 2.248a8.25 8.25 0 008.75 12.754z" />
                  </svg>
                </button>
                {signedIn ? (
                  <form method="post" action="/logout" class="inline">
                    <input type="hidden" name="csrf_token" value={csrfToken ?? ''} />
                    <button
                      type="submit"
                      class="text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Log out <span aria-hidden="true">→</span>
                    </button>
                  </form>
                ) : (
                  <a href="/login" class="text-sm font-semibold text-gray-900 dark:text-white">Log in <span aria-hidden="true">→</span></a>
                )}
              </div>
            </nav>

            {/* Mobile menu dialog */}
            <el-dialog>
              <dialog id="mobile-menu" class="backdrop:bg-transparent lg:hidden">
                <div tabIndex={0} class="fixed inset-0 focus:outline-none">
                  <el-dialog-panel class="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10 dark:bg-gray-900 dark:sm:ring-gray-100/10">
                    <div class="flex items-center justify-between">
                      <a href="/" class="-m-1.5 p-1.5">
                        <span class="text-lg font-semibold dark:text-gray-300">Temple-Trust-logo</span>
                      </a>
                      <button type="button" command="close" commandfor="mobile-menu" class="-m-2.5 rounded-md p-2.5 text-gray-700 dark:text-gray-300">
                        <span class="sr-only">Close menu</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="h-6 w-6">
                          <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </button>
                    </div>
                    <div class="mt-6 flow-root">
                      <div class="-my-6 divide-y divide-gray-500/10 dark:divide-gray-500/25">
                        <div class="space-y-2 py-6">
                          {links.map(({ href, label }) => (
                            <a href={href} class="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
                              {label}
                            </a>
                          ))}
                        </div>
                        <div class="py-6">
                          <button
                            data-theme-toggle
                            type="button"
                            class="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                            title="Toggle dark mode"
                          >
                            {/* Sun (shown in dark mode) */}
                            <svg class="w-5 h-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75v1.5M12 18.75v1.5M4.72 4.72l1.06 1.06m12.5 12.5l1.06 1.06M3.75 12h1.5m13.5 0h1.5M4.72 19.28l1.06-1.06m12.5-12.5l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                            </svg>
                            {/* Moon (shown in light mode) */}
                            <svg class="w-5 h-5 block dark:hidden" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M21.752 15.002A9.718 9.718 0 0112 21.75 9.75 9.75 0 1113.002 2.248a8.25 8.25 0 008.75 12.754z" />
                            </svg>
                            <span class="hidden dark:inline">Light mode</span>
                            <span class="dark:hidden">Dark mode</span>
                          </button>
                        </div>
                        {signedIn ? (
                          <div class="py-6">
                            <form method="post" action="/logout">
                              <input type="hidden" name="csrf_token" value={csrfToken ?? ''} />
                              <button
                                type="submit"
                                class="-mx-3 block w-full text-left rounded-lg px-3 py-2.5 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                              >
                                Log out
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div class="py-6">
                            <a href="/login" class="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">Log in</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </el-dialog-panel>
                </div>
              </dialog>
            </el-dialog>
          </header>

          {toolbar ? (
            <div data-preview-toolbar class="border-b border-indigo-200 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-900/30">
              <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                {toolbar as any}
              </div>
            </div>
          ) : null}

          {/* Optional hero */}
          {h ? (
            <div class="relative isolate overflow-hidden pt-20 sm:pt-24">
              {/* Background images */}
              <img src={h.imageDark} alt="" class="absolute inset-0 -z-10 h-full w-full object-cover opacity-90 hidden dark:block" />
              <img src={h.imageLight} alt="" class="absolute inset-0 -z-10 h-full w-full object-cover opacity-10 dark:hidden" />

              {/* Top gradient */}
              <div aria-hidden="true" class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                <div
                  class="relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-400 to-indigo-400 opacity-20 sm:w-[72rem]"
                  style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
                />
              </div>

              <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl py-20 sm:py-32 lg:py-40 text-center">
                  {h.announcement ? (
                    <div class="hidden sm:mb-8 sm:flex sm:justify-center">
                      <div class="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-700 ring-1 ring-gray-900/10 hover:ring-gray-900/20 dark:text-gray-300 dark:ring-white/10 dark:hover:ring-white/20">
                        {h.announcement.text}{' '}
                        <a href={h.announcement.href} class="font-semibold text-indigo-600 dark:text-indigo-400">
                          <span aria-hidden="true" class="absolute inset-0" />
                          {h.announcement.label} <span aria-hidden>→</span>
                        </a>
                      </div>
                    </div>
                  ) : null}

                  <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">{h.title}</h1>
                  {h.subtitle ? (
                    <p class="mt-6 text-lg leading-8 text-gray-700 dark:text-gray-300">{h.subtitle}</p>
                  ) : null}
                  <div class="mt-10 flex items-center justify-center gap-x-6">
                    {h.primaryCta ? (
                      <a href={h.primaryCta.href} class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                        {h.primaryCta.label}
                      </a>
                    ) : null}
                    {h.secondaryCta ? (
                      <a href={h.secondaryCta.href} class="text-sm font-semibold text-gray-900 dark:text-white">
                        {h.secondaryCta.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Bottom gradient */}
              <div aria-hidden="true" class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
                <div
                  class="relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-orange-400 to-indigo-400 opacity-20 sm:w-[72rem]"
                  style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
                />
              </div>
            </div>
          ) : null}

          {/* Main content */}
          <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </body>
      </html>
    )
  }

export default Layout

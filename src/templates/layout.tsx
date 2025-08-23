import type { FC, PropsWithChildren } from 'hono/jsx'

/**
 * Layout component used by both public and admin pages.  It defines the
 * document structure, loads Tailwind CSS from a CDN and HTMX for
 * progressive enhancement, and renders a navigation bar.  Passing
 * `admin={true}` will include a link to the admin dashboard.
 */
const Layout: FC<{ title: string; admin?: boolean } & PropsWithChildren> = ({
  title,
  admin = false,
  children,
}) => {
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/activities', label: 'Activities' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/finance', label: 'Finance' },
  ]

  return (
    <html lang="en" >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {/* TailwindCSS via CDN.  Using the CDN build avoids a build step and
            keeps the Worker lightweight. */}
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        {/* HTMX for minimal client‑side dynamics */}
        <script src="https://unpkg.com/htmx.org@1.9.11"></script>
        {/* Tailwind Elements for enhanced components */}
        <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
        {/* Dark mode toggle - loaded early to prevent FOUC */}
        <script src="/js/theme-toggle.js"></script>
      </head>
      <body class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <header class="bg-white dark:bg-gray-900 shadow">
          <nav aria-label="Global" class="mx-auto max-w-9xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-16 items-center justify-between">
              {/* Logo/Brand */}
              <div class="flex items-center">
                <a href="/" class="flex items-center">
                  <span class="text-xl font-semibold text-gray-900 dark:text-white">
                    Temple Trust
                  </span>
                </a>
              </div>

              {/* Mobile menu button */}
              <div class="flex lg:hidden">
                <button
                  type="button"
                  command="show-modal"
                  commandfor="mobile-menu"
                  class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span class="sr-only">Open main menu</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    class="h-6 w-6"
                  >
                    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Desktop navigation */}
              <div class="hidden lg:flex lg:gap-x-8">
                {navLinks.map(({ href, label }) => (
                  <a href={href} class="text-sm font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                    {label}
                  </a>
                ))}
              </div>

              {/* Right side actions (desktop) */}
              <div class="hidden lg:flex lg:items-center lg:gap-x-6">
                <button
                  data-theme-toggle
                  type="button"
                  class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="Toggle dark mode"
                >
                  <svg class="w-5 h-5 hidden dark:block" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                  </svg>
                  <svg class="w-5 h-5 block dark:hidden" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </button>
                {admin ? (
                  <a href="/logout" class="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
                    Log out <span aria-hidden="true">&rarr;</span>
                  </a>
                ) : (

                  <a href="/login" class="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
                    Log in <span aria-hidden="true">&rarr;</span>
                  </a>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile menu dialog */}
          <el-dialog>
            <dialog id="mobile-menu" class="backdrop:bg-transparent lg:hidden">
              <div tabindex="0" class="fixed inset-0 focus:outline-none">
                <el-dialog-panel class="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10 dark:bg-gray-900 dark:sm:ring-gray-100/10">
                  <div class="flex items-center justify-between">
                    <a href="/" class="-m-1.5 p-1.5">
                      <span class="text-xl font-semibold text-gray-900 dark:text-white">
                        Temple Trust
                      </span>
                    </a>
                    <button
                      type="button"
                      command="close"
                      commandfor="mobile-menu"
                      class="-m-2.5 rounded-md p-2.5 text-gray-700 dark:text-gray-400"
                    >
                      <span class="sr-only">Close menu</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                        class="h-6 w-6"
                      >
                        <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <div class="mt-6 flow-root">
                    <div class="-my-6 divide-y divide-gray-500/10 dark:divide-gray-500/25">
                      <div class="space-y-2 py-6">
                        {navLinks.map(({ href, label }) => (
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
                          <svg class="w-5 h-5 hidden dark:block" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                          </svg>
                          <svg class="w-5 h-5 block dark:hidden" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                          </svg>
                          <span class="hidden dark:inline">Light mode</span>
                          <span class="dark:hidden">Dark mode</span>
                        </button>
                      </div>
                      {admin ? (
                        <div class="py-6">
                          <a href="/logout" class="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
                            Log out
                          </a>
                        </div>
                      ) : (

                        <div class="py-6">
                          <a href="/login" class="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
                            Log in
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </el-dialog-panel>
              </div>
            </dialog>
          </el-dialog>
        </header>

        <main class="mx-auto max-w-9xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}

export default Layout

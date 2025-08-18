import type { FC, PropsWithChildren } from 'hono/jsx'

/**
 * Layout component used by both public and admin pages.  It defines the
 * document structure, loads Tailwind CSS from a CDN and HTMX for
 * progressive enhancement, and renders a navigation bar.  Passing
 * `admin={true}` will include a link to the admin dashboard.
 */
const Layout: FC<{ title: string; admin?: boolean } & PropsWithChildren> = ({
  title,
  admin = false,
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {/* TailwindCSS via CDN.  Using the CDN build avoids a build step and
            keeps the Worker lightweight. */}
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        {/* HTMX for minimal client‑side dynamics */}
        <script src="https://unpkg.com/htmx.org@1.9.11"></script>
      </head>
      <body class="min-h-screen bg-gray-50 text-gray-900">
        <nav class="bg-white shadow mb-4">
          <div class="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
            <a href="/" class="font-semibold text-lg text-gray-800">
              Temple Trust
            </a>
            <div class="space-x-4">
              <a href="/" class="text-blue-600 hover:underline">
                Home
              </a>
              <a href="/about" class="text-blue-600 hover:underline">
                About
              </a>
              <a href="/activities" class="text-blue-600 hover:underline">
                Activities
              </a>
              <a href="/gallery" class="text-blue-600 hover:underline">
                Gallery
              </a>
              <a href="/finance" class="text-blue-600 hover:underline">
                Finance
              </a>
              {admin && (
                <a href="/admin" class="text-red-600 font-medium hover:underline">
                  Admin
                </a>
              )}
            </div>
          </div>
        </nav>
        <main class="max-w-7xl mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  )
}

export default Layout
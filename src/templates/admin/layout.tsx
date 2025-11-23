/** @jsxImportSource hono/jsx */

import type { FC, PropsWithChildren } from 'hono/jsx'
import { resolveAsset } from '../../utils/assets'

export const ADMIN_DASHBOARD_PANELS = [
  { slug: 'home', label: 'Home' },
  { slug: 'about-us', label: 'About Us' },
  { slug: 'projects', label: 'Projects' },
  { slug: 'events', label: 'Events' },
  { slug: 'donate', label: 'Donate' },
  { slug: 'transparency', label: 'Transparency' },
] as const

export type AdminDashboardPanel = (typeof ADMIN_DASHBOARD_PANELS)[number]['slug']

type SidebarItem = {
  slug: AdminDashboardPanel
  label: string
}

type AdminLayoutProps = PropsWithChildren<{
  title: string
  activePanel: AdminDashboardPanel
  csrfToken?: string
  sidebarItems?: SidebarItem[]
  extraHead?: any
}>

function buildNavClasses(isActive: boolean): string {
  if (isActive) {
    return 'group flex gap-x-3 rounded-md bg-gray-50 p-2 text-sm font-semibold text-indigo-600 dark:bg-white/5 dark:text-white'
  }
  return 'group flex gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
}

const AdminLayout: FC<AdminLayoutProps> = ({
  title,
  activePanel,
  csrfToken,
  sidebarItems = ADMIN_DASHBOARD_PANELS,
  extraHead = null,
  children,
}) => {
  const uiAsset = resolveAsset('ui')

  const renderSidebarLink = (item: SidebarItem) => {
    const href = `/admin/dashboard/${item.slug}`
    return (
      <a
        href={href}
        hx-get={href}
        hx-target="#admin-content"
        hx-swap="innerHTML"
        hx-push-url="true"
        class={buildNavClasses(item.slug === activePanel)}
        data-nav-panel={item.slug}
      >
        <span class="truncate">{item.label}</span>
      </a>
    )
  }

  const renderSignOut = () => (
    <li class="mt-auto">
      <form method="post" action="/logout">
        <input type="hidden" name="csrf_token" value={csrfToken ?? ''} />
        <button
          type="submit"
          class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white w-full text-left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 shrink-0 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Sign out
        </button>
      </form>
    </li>
  )

  return (
    <html lang="en" class="h-full bg-white dark:bg-gray-900">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/app.css" />
        {uiAsset.styles.map((href) => (
          <link rel="stylesheet" href={href} key={href} />
        ))}
        <script src={uiAsset.script} type="module" defer></script>
        {extraHead}
      </head>
      <body class="h-full">
        <div class="h-full">
          <el-dialog>
            <dialog id="admin-sidebar" class="backdrop:bg-transparent lg:hidden">
              <div tabIndex={0} class="fixed inset-0 flex focus:outline-none">
                <el-dialog-panel class="group/dialog-panel relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
                  <div class="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out group-data-closed/dialog-panel:opacity-0">
                    <button type="button" command="close" commandfor="admin-sidebar" class="-m-2.5 p-2.5">
                      <span class="sr-only">Close sidebar</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6 text-white">
                        <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div class="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-6 dark:bg-gray-900 dark:ring-1 dark:ring-white/10">
                    <div class="flex h-16 shrink-0 items-center">
                      <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Dashboard</span>
                    </div>
                    <nav class="flex flex-1 flex-col">
                      <ul role="list" class="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" class="-mx-2 space-y-1">
                            {sidebarItems.map((item) => (
                              <li>{renderSidebarLink(item)}</li>
                            ))}
                          </ul>
                        </li>
                        {renderSignOut()}
                      </ul>
                    </nav>
                  </div>
                </el-dialog-panel>
              </div>
            </dialog>
          </el-dialog>

          <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-white/10 dark:bg-gray-900">
              <div class="flex h-16 shrink-0 items-center">
                <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Dashboard</span>
              </div>
              <nav class="flex flex-1 flex-col">
                <ul role="list" class="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" class="-mx-2 space-y-1">
                      {sidebarItems.map((item) => (
                        <li>{renderSidebarLink(item)}</li>
                      ))}
                    </ul>
                  </li>
                  {renderSignOut()}
                </ul>
              </nav>
            </div>
          </div>

          <div class="lg:pl-72">
            <div class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-gray-900 dark:shadow-none">
              <button type="button" command="show-modal" commandfor="admin-sidebar" class="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:text-white">
                <span class="sr-only">Open sidebar</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="size-6">
                  <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <div class="flex flex-1 items-center justify-between gap-x-4 self-stretch">
                <div class="flex flex-1 items-center">
                  <span class="text-sm font-semibold text-gray-500 dark:text-gray-400">Dashboard</span>
                </div>
                {/* Sign out removed from here */}
              </div>
            </div>

            <main class="py-10">
              <div class="px-4 sm:px-6 lg:px-8" id="admin-content" data-admin-content>
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}

export default AdminLayout
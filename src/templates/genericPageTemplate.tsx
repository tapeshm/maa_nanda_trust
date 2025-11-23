/** @jsxImportSource hono/jsx */

import Layout from './layout'
import type { HtmlEscapedString } from 'hono/utils/html'
import RichText from './components/RichText'
import { resolveMediaUrl } from '../utils/pages/media'
import type { TemplateSnapshot } from '../types/pages'

type Snapshot = TemplateSnapshot

export interface GenericRenderOptions {
  signedIn?: boolean
  toolbar?: unknown
}

type RenderOutput = HtmlEscapedString | Promise<HtmlEscapedString>

export function renderGenericPage(
  snapshot: Snapshot,
  options: GenericRenderOptions = {},
): RenderOutput {
  // Use 'content' section, fallback to 'welcome' if legacy/reused
  const contentSection = snapshot.sections.find(s => s.kind === 'content' || s.kind === 'welcome')

  return (
    <Layout title={snapshot.page.title} signedIn={options.signedIn} toolbar={options.toolbar}>
      <main class="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 lg:px-8" data-page={snapshot.page.slug}>
        <section class="text-center space-y-4" data-hero>
          <h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{snapshot.page.title}</h1>
          {snapshot.page.heroImageKey ? (
            <figure class="overflow-hidden rounded-2xl border border-gray-100 shadow-md dark:border-gray-700 mt-8">
              <img
                src={resolveMediaUrl(snapshot.page.heroImageKey)}
                alt=""
                class="h-full w-full object-cover max-h-[400px]"
                loading="lazy"
              />
            </figure>
          ) : null}
        </section>

        {contentSection && contentSection.contentHtml ? (
            <section>
                <RichText html={contentSection.contentHtml} />
            </section>
        ) : null}
      </main>
    </Layout>
  )
}

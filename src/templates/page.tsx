import type { FC } from 'hono/jsx'

/**
 * Basic wrapper that renders pre-sanitised HTML provided by the server. Upstream
 * helpers are responsible for sanitising any user-authored content before it is
 * passed here.
 */
const Page: FC<{ html: string }> = ({ html }) => {
  return (
    <div
      class="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default Page
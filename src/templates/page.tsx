import type { FC } from 'hono/jsx'

import { PUBLIC_CONTENT_WRAPPER_CLASSNAME } from '../frontend/editor/styles'
import { wrapWithProse } from '../utils/editor/render'

/**
 * Basic wrapper that renders pre-sanitised HTML provided by the server. Upstream
 * helpers are responsible for sanitising any user-authored content before it is
 * passed here.
 */
const Page: FC<{ html: string }> = ({ html }) => {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: wrapWithProse(html, PUBLIC_CONTENT_WRAPPER_CLASSNAME),
      }}
    />
  )
}

export default Page

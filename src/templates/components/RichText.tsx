/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import { wrapWithProse } from '../../utils/editor/render'
import { PUBLIC_CONTENT_WRAPPER_CLASSNAME } from '../../frontend/editor/styles'

type Props = {
  html?: string | null
  className?: string
  proseClassName?: string
}

const RichText: FC<Props> = ({ html, className, proseClassName }) => {
  if (!html) return null
  const proseClass = proseClassName ?? PUBLIC_CONTENT_WRAPPER_CLASSNAME
  return (
    <div
      class={className}
      dangerouslySetInnerHTML={{ __html: wrapWithProse(html, proseClass) }}
    />
  )
}

export default RichText

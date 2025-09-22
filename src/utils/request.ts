import type { Context } from 'hono'
import { HEADER_HX_REQUEST, HEADER_X_REQUESTED_WITH } from './constants'

// Detect HTMX/XHR style requests
export function isHtmx(c: Context | any): boolean {
  const hx = c.req.header(HEADER_HX_REQUEST) === 'true'
  const xhr = c.req.header(HEADER_X_REQUESTED_WITH) === 'XMLHttpRequest'
  return !!(hx || xhr)
}

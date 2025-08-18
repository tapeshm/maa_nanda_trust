import { secureHeaders } from 'hono/secure-headers'
import type { MiddlewareHandler } from 'hono'

/**
 * Apply a set of sensible security headers to every response.  This middleware
 * removes the `X‑Powered‑By` header and sets policies such as
 * `Referrer‑Policy` and `Cross‑Origin‑Resource‑Policy`【212270213774445†L210-L222】.
 */
export const securityMiddleware: MiddlewareHandler = secureHeaders()
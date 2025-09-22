---
feature_id: auth
title: Authentication Flow for Hono + Cloudflare Workers + Supabase (SSR/HTMX)
allowed_paths: ["src/**", "tests/**", "wrangler.jsonc", ".dev.vars"]
language: typescript
frameworks: ["hono", "vitest", "jose", "htmx"]
build:
  typecheck: ["pnpm", "run", "type-check"]
  test: ["pnpm", "test", "--run"]
  coverage_min: 0.80
constraints:
  - "Cloudflare Workers runtime (stateless, no reliable in-memory state)."
  - "Supabase Auth: RS256 access JWT + single-use rotating refresh tokens."
  - "Exactly one refresh attempt per request."
  - "GET vs HTMX/XHR behavior must differ: 302 redirect vs 401 + HX-Redirect."
  - "Clock skew ±60s for JWT nbf/iat/exp."
  - "Security headers (HSTS, CSP) and Cache-Control: no-store for auth responses."
assumptions:
  - "Environment provides SUPABASE_URL and SUPABASE_ANON_KEY (and if needed, SERVICE_ROLE_KEY) via secrets."
  - "Application served over HTTPS; use `__Host-` cookie prefix."
  - "Local development runs over HTTPS (wrangler dev), preserving Secure=true cookies and `__Host-*` semantics."
  - "Project already uses pnpm + Vitest + ESLint + Prettier or equivalent scripts."
  - "Use `hono-llms-full.txt` (Hono) and `cloudflare-workers-llms-full.txt` (Cloudflare Workers) in the repo as canonical reference documentation for APIs and patterns."
  - "These documents are large; use efficient, targeted knowledge extraction (search by keywords/sections) when consulting them for implementation details."
  - "Optionally configure AUTH_JWT_ISS and AUTH_JWT_AUD to harden verification; default ISS inferred from SUPABASE_URL; AUD unset by default."
  - "Supabase SSR 'sb' cookies created by `@supabase/ssr` are non‑authoritative for app authorization; only the app's `__Host-access_token`/`__Host-refresh_token` determine access to protected routes."
artifacts:
  runtime_env: [".dev.vars", "wrangler.jsonc"]
  config: ["vite.config.ts", "vitest.config.ts", "src/config/csp.ts", "src/config/supabase.ts", "src/types/auth.ts"]
steps:
  - id: step-01
    title: "Cookie schema & helpers (`__Host-*`)"
    rationale: "Consistently set, rotate, and clear secure cookies for access and refresh tokens."
    depends_on: []
    hints:
      - "use hono cookie middleware helper functions like setCookie, deleteCookie"
      - "Allow Supabase SSR 'sb' cookies to coexist solely for server-to-Supabase calls. Authorization for protected routes MUST rely only on the app’s `__Host-access_token`/`__Host-refresh_token`. Do not manipulate or rely on 'sb' cookies for auth decisions."
      - "If custom `__Host-*` cookies in this spec must carry large values, only then use `@supabase/ssr` utilities such as `combineChunks`/`parseCookieHeader` with a clear chunk naming scheme; otherwise avoid chunking."
      - "Make use of Hono and Supabase package functions where needed, instead of reinventing the wheel."
      - "use helper functions to parse and extract user info from auth cookies"
    changes:
      - create: "src/auth/cookies.ts"
      - modify: ".dev.vars"
    acceptance_criteria:
      - "Access and refresh cookies are set with: __Host- prefix, HttpOnly, Secure, Path=/, SameSite=Lax, and no Domain attribute."
      - "Helpers expose: setAccessCookie(ttl), setRefreshCookie(ttl), clearAccessCookie(), clearRefreshCookie(), clearAllAuthCookies()."
      - "TTL defaults: access ≈ 10–15 minutes; refresh ≈ 30–90 days; configurable via env."
      - "Secure=true in all environments, including local development over HTTPS (wrangler dev); `__Host-*` names remain identical across envs."
    tests:
      - path: "tests/auth/cookies.test.ts"
        type: unit
        cases:
          - "sets correct flags for access cookie"
          - "sets correct flags for refresh cookie"
          - "clears cookies with Max-Age=0"
          - "respects TTL overrides from env"

  - id: step-02
    title: "Security headers & cache control"
    rationale: "Global security posture and no-store on auth responses."
    depends_on: ["step-01"]
    hints:
      - "ensure local development is not affected by too strict csp."
      - "all loading of static js/css assets"
    changes:
      - create: "src/middleware/securityHeaders.ts"
      - create: "src/config/csp.ts"
      - modify: "src/index.ts"
    acceptance_criteria:
      - "Adds HSTS (includeSubDomains; preload optional), sensible CSP scaffold, X-Content-Type-Options, Referrer-Policy, Permissions-Policy."
      - "Auth routes respond with Cache-Control: no-store (and include Pragma: no-cache and Expires: 0 for conservative intermediaries)."
      - "CSP policy toggles by environment: development allows minimal relaxations required for local tooling (e.g., 'script-src \"self\" \"unsafe-inline\"'; dev-only allowances), production is stricter."
    tests:
      - path: "tests/auth/securityHeaders.test.ts"
        type: unit
        cases:
          - "sets HSTS and CSP headers"
          - "auth responses have Cache-Control: no-store, Pragma: no-cache, and Expires: 0"
          - "dev vs prod CSP differences are applied"
          - "sets X-Content-Type-Options: nosniff"
          - "sets Referrer-Policy"
          - "sets Permissions-Policy"

  - id: step-03
    title: "JWKS fetcher with edge caching & forced re-fetch"
    rationale: "Stateless RS256 verification with minimal network overhead."
    depends_on: ["step-01"]
    hints: []
    changes:
      - create: "src/auth/jwks.ts"
      - create: "src/auth/verify.ts"
    acceptance_criteria:
      - "Fetches JWKS via caches.default using ETag/If-None-Match; TTL ≤ 9 minutes; cache scope applies only to JWKS."
      - "On verify failure due to kid/signature mismatch: force one JWKS re-fetch (revalidate/bypass) then retry verify once."
      - "Verifies alg=RS256, iss matches Supabase (default issuer `${SUPABASE_URL}/auth/v1` if AUTH_JWT_ISS is unset), aud if configured, nbf/iat/exp with ±60s skew."
    tests:
      - path: "tests/auth/jwks.test.ts"
        type: unit
        cases:
          - "caches JWKS and honors TTL"
          - "caps JWKS cache TTL to ≤ 9 minutes"
          - "forces single re-fetch on kid mismatch then retries verify"
          - "rejects non-RS256 tokens"
          - "enforces issuer and skew"
          - "defaults issuer to SUPABASE_URL/auth/v1 when AUTH_JWT_ISS is unset"
          - "enforces audience when AUTH_JWT_AUD is set; allows when unset"

  - id: step-04
    title: "Supabase token exchange utilities"
    rationale: "Boundary functions for login (exchange) and refresh (rotate)."
    depends_on: ["step-01"]
    changes:
      - create: "src/auth/supabaseTokens.ts"
      - create: "src/config/supabase.ts"
      - modify: ".dev.vars"
    acceptance_criteria:
      - "Provides exchangeLogin(credentials) → {access_token, refresh_token}."
      - "Provides refreshAccess(refresh_token) → {access_token, refresh_token}."
      - "Handles Supabase 4xx/5xx with typed errors including `invalid_grant`, 'already used', and 'invalid/revoked family'."
    tests:
      - path: "tests/auth/supabaseTokens.test.ts"
        type: unit
        cases:
          - "successful login returns tokens"
          - "successful refresh rotates tokens"
          - "maps invalid_grant already-used"
          - "maps invalid/revoked family"
          - "propagates 5xx as retryable"

  - id: step-05
    title: "/login route handler"
    rationale: "Perform login exchange and set cookies; HTMX-safe response."
    depends_on: ["step-01", "step-04", "step-02"]
    changes:
      - create: "src/routes/login.ts"
      - modify: "src/index.ts"
    hints:
      - "Reference: You MAY use a per-request Supabase client for SSR-style routes, but do not rely on 'sb' cookies for route protection."
      - "Authorization must use only the app's `__Host-*` cookies; for server→Supabase calls pass the access token via `Authorization: Bearer <token>` and `persistSession=false`."
    acceptance_criteria:
      - "POST /login exchanges with Supabase and sets both cookies."
      - "Returns 200 JSON for XHR or 302 to app page for full-page form; may include CSRF token/nonce for admin routes."
      - "No tokens logged; structured logs omit token contents."
    tests:
      - path: "tests/auth/loginRoute.test.ts"
        type: integration
        cases:
          - "sets both cookies on success"
          - "returns 200 JSON for HTMX with HX-Trigger optional"
          - "returns 302 for non-HTMX"
          - "does not log sensitive values"

  - id: step-06
    title: "Cookie clear utilities (global)"
    rationale: "Explicit, reusable clearing semantics as per cookie spec."
    depends_on: ["step-01"]
    changes:
      - modify: "src/auth/cookies.ts"
    acceptance_criteria:
      - "clearAllAuthCookies() sets Max-Age=0 for both cookies with __Host- semantics."
      - "Utility used by logout and by refresh failure paths where family is invalid/revoked."
    tests:
      - path: "tests/auth/cookiesClear.test.ts"
        type: unit
        cases:
          - "clearAllAuthCookies clears both cookies correctly"

  - id: step-07
    title: "Per-request auth middleware (verify path; GET vs HTMX)"
    rationale: "Fast-path local verify; correct unauth response semantics."
    depends_on: ["step-03", "step-02"]
    changes:
      - create: "src/middleware/auth.ts"
      - modify: "src/index.ts"
      - create: "src/types/auth.ts"
    hints:
      - "Reference: Supabase SSR server client cookie-bridge (Hono adapter env + parseCookieHeader/setCookie) with default 'sb' cookies for session state; avoid duplicating chunking logic. Ensure alignment with this spec's stateless `__Host-*` cookies."
    acceptance_criteria:
      - "If access cookie missing → unauth: 302 /login for full-page GET, 401 with HX-Redirect: /login for HTMX."
      - "If exp - now ≤ 60s, mark near-expiry and route to single refresh attempt."
      - "Successful verify attaches user claims (typed) to context using AuthClaims from src/types/auth.ts. Minimal shape: { sub: string; exp: number; iat: number; iss: string; aud?: string }."
      - "Rejects tokens supplied via Authorization header or query parameters; only cookies are accepted for app authorization."
    tests:
      - path: "tests/auth/middlewareVerify.test.ts"
        type: integration
        cases:
          - "unauth GET → 302 /login"
          - "unauth HTMX → 401 + HX-Redirect"
          - "near-expiry path triggers refresh pipeline"
          - "valid token attaches claims"
          - "rejects Authorization header or query tokens; only cookies accepted"

  - id: step-08
    title: "Single refresh attempt pipeline (race-aware)"
    rationale: "Exactly one refresh attempt; safe handling of parallel refresh races."
    depends_on: ["step-07", "step-04", "step-06"]
    changes:
      - modify: "src/middleware/auth.ts"
    acceptance_criteria:
      - "Attempts refresh at most once per request when token expired or near-expiry."
      - "On success: sets new access+refresh (rotation), verifies locally once, then proceeds."
      - "On invalid_grant 'already used' (parallel refresh): do NOT clear cookies; respond unauth (302/401 as per mode)."
      - "On invalid/revoked family: clear both cookies and unauth."
      - "On Supabase 5xx/network: do NOT clear cookies; respond 503 for GET, 503 JSON for HTMX (optionally HX-Trigger for retry UI)."
    tests:
      - path: "tests/auth/refreshPipeline.test.ts"
        type: integration
        cases:
          - "per-request single attempt enforced"
          - "success rotates tokens and proceeds"
          - "already-used ⇒ unauth without clearing"
          - "invalid family ⇒ clears cookies and unauth"
          - "5xx ⇒ 503 without cookie changes (GET and HTMX)"

  - id: step-09
    title: "/logout route (global sign-out)"
    rationale: "Revoke family at Supabase and clear cookies regardless of outcome."
    depends_on: ["step-04", "step-06"]
    changes:
      - create: "src/routes/logout.ts"
      - modify: "src/index.ts"
    acceptance_criteria:
      - "Calls Supabase global sign-out (best-effort)."
      - "Always clears both cookies."
      - "Returns 200 JSON for HTMX or 302 to landing for non-HTMX."
    tests:
      - path: "tests/auth/logoutRoute.test.ts"
        type: integration
        cases:
          - "clears cookies even if Supabase call fails"
          - "returns 302 for non-HTMX, 200 for HTMX"
          - "invokes Supabase sign-out endpoint (best-effort)"

  - id: step-10
    title: "Rate limiting & precise CORS for auth endpoints"
    rationale: "Mitigate brute-force and cross-origin risks."
    depends_on: ["step-05", "step-09"]
    changes:
      - create: "src/middleware/rateLimit.ts"
      - modify: "src/index.ts"
    acceptance_criteria:
      - "Applies IP/user-agent rate limits to /login and /logout (and any other public auth routes, if present) with sensible ceilings."
      - "CORS only permits credentials for trusted origins (configured via AUTH_TRUSTED_ORIGINS); never reflects arbitrary origins; sets Access-Control-Allow-Credentials: true and Vary: Origin; preflights handled correctly."
    tests:
      - path: "tests/auth/rateCors.test.ts"
        type: integration
        cases:
          - "enforces rate limit on /login"
          - "rejects disallowed origins with credentials"
          - "enforces rate limit on /logout"
          - "sets Vary: Origin on CORS responses"

  - id: step-11
    title: "CSRF protection for state-changing routes"
    rationale: "Prevent CSRF on admin/state-changing endpoints."
    depends_on: ["step-05", "step-07"]
    changes:
      - create: "src/middleware/csrf.ts"
      - modify: "src/index.ts"
    acceptance_criteria:
      - "Provides token/double-submit pattern; token issued post-login and validated on state-changing routes."
      - "CSRF cookie name: __Host-csrf with flags Secure=true, HttpOnly=false, Path=/, SameSite=Lax; header: X-CSRF-Token."
      - "HTMX requests carry token via header; failure yields 403."
    tests:
      - path: "tests/auth/csrf.test.ts"
        type: unit
        cases:
          - "issues token on login"
          - "validates token on POST"
          - "rejects missing/invalid token with 403"
          - "sets __Host-csrf cookie with correct flags"

  - id: step-12
    title: "Minimal observability (structured logs; no token contents)"
    rationale: "Operational visibility without leaking secrets."
    depends_on: ["step-07", "step-08"]
    changes:
      - create: "src/observability/authLogs.ts"
      - modify: "src/middleware/auth.ts"
    acceptance_criteria:
      - "Logs counters via structured records for auth.verify_ok/auth.expired/auth.sig_fail/auth.jwks_miss and auth.refresh_ok/auth.refresh_invalid_grant/auth.refresh_used/auth.refresh_5xx."
      - "Never logs token contents or PII; includes a correlation id (prefer `cf-ray` header when present, else generate an x-request-id)."
    tests:
      - path: "tests/auth/logs.test.ts"
        type: unit
        cases:
          - "emits structured events without secrets"
          - "categorizes refresh outcomes correctly"

  - id: step-13
    title: "Local Supabase dev workaround (HS256 and cookie flags)"
    rationale: "Allow local development with Supabase CLI by supporting HS256 verification with SUPABASE_JWT_SECRET and relaxed cookie flags; keep RS256+JWKS in non-dev."
    depends_on: ["step-01", "step-03", "step-07"]
    changes:
      - modify: "src/auth/verify.ts"
      - modify: "src/config/supabase.ts"
      - modify: ".dev.vars"
      - modify: "wrangler.jsonc"
    acceptance_criteria:
      - "When DEV_SUPABASE_LOCAL=1 AND SUPABASE_URL host is localhost or 127.0.0.1: HS256 verification using SUPABASE_JWT_SECRET; no JWKS call. Otherwise, refuse HS256 and fail closed."
      - "When DEV_SUPABASE_LOCAL is unset or '0': RS256 verification with JWKS cache and forced re-fetch."
      - "Local development runs over HTTPS (wrangler dev); cookies remain Secure=true and `__Host-*` semantics are identical across environments."
      - "Fails closed if both HS256 secret and JWKS misconfigured or missing."
      - "No tokens or secrets logged."
    tests:
      - path: "tests/auth/devMode.test.ts"
        type: unit
        cases:
          - "HS256 verify path works with SUPABASE_JWT_SECRET"
          - "JWKS path used when DEV_SUPABASE_LOCAL=0"
          - "cookies Secure=true in both dev (HTTPS) and prod"
          - "JWKS fetch not called in dev mode"
          - "dev HS256 refused when SUPABASE_URL is non-local (fails closed)"

  - id: step-14
    title: "Role-based route guards (requireAdmin, requireTrustee)"
    rationale: "Enforce role-specific access to protected routes using JWT claims parsed by the auth middleware."
    depends_on: ["step-07", "step-12"]
    changes:
      - modify: "src/middleware/auth.ts"
      - modify: "src/types/auth.ts"
    hints:
      - "Extract roles from access token claims (e.g., 'role', 'roles', or a custom app_roles field). Support: a single string (comma/space-separated) or an array of strings."
      - "Normalize roles to lowercase strings; ignore non-string values."
      - "Authorization continues to rely only on `__Host-*` cookies. Do not accept Authorization headers or query parameters."
      - "Semantics: Missing required role ⇒ 403. For full-page GET respond with 302 redirect to '/', for HTMX/XHR respond with 403 JSON."
      - "Optionally treat 'admin' as including 'trustee' (admin ⇒ trustee)."
    acceptance_criteria:
      - "Implements extractRolesFromClaims(claims) → Set<string> with normalized roles."
      - "Exports requireAdmin and requireTrustee middlewares that assume requireAuth has already attached claims."
      - "When role missing: HTMX/XHR → 403 JSON { ok: false, error: 'forbidden' }; full-page GET → 302 to '/'; other requests → 403 JSON."
      - "When role present: proceeds to next handler."
      - "Does not log token contents or PII."
    tests:
      - path: "tests/auth/roles.test.ts"
        type: integration
        cases:
          - "requireAdmin denies when roles missing (403/302 semantics)"
          - "requireAdmin allows when role includes admin"
          - "requireTrustee allows when role includes trustee"
          - "HTMX forbidden returns 403 JSON without redirect"
          - "no tokens or secrets logged in dev mode"
---

## Overview (Human Context)

Authoritative spec: the YAML frontmatter above. The prose below provides context and guidance for reviewers and contributors.

Implement a secure, stateless authentication layer with:

- Access token cookie (`__Host-access_token`, TTL ~10–15m)
- Refresh token cookie (`__Host-refresh_token`, TTL ~30–90d)
- Local RS256 verify using JWKS cached at the edge (≤ 9 minutes) with 1 forced re-fetch on `kid`/signature failure
- Middleware that performs at most one refresh attempt per request and applies correct GET vs HTMX semantics
- Robust cookie clearing, logout, rate-limits, CSRF protections for state-changing routes, and minimal observability

## Notes

- Gates: Run typecheck → tests (aligned to available scripts). Format/lint gates are intentionally omitted here; the agent must record this deviation from D3 defaults in the output report. If format/lint scripts are added later, restore those gates.
- Dev mode: `.dev.vars` should include `DEV_SUPABASE_LOCAL=1`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_JWT_SECRET` for local HS256 verification.

## Implementation Reference: Supabase SSR client

The following server-side pattern shows how to bridge request cookies and set response cookies when using the Supabase SSR client with Hono. Use this as a reference for server endpoints that interact with Supabase via `@supabase/ssr`. Apply selectively so it remains compatible with this spec's stateless cookie strategy.

```ts
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Context, MiddlewareHandler } from 'hono'
import { env } from 'hono/adapter'
import { setCookie } from 'hono/cookie'

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient
  }
}

export const getSupabase = (c: Context) => {
  return c.get('supabase')
}

type SupabaseEnv = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const supabaseEnv = env<SupabaseEnv>(c)
    const supabaseUrl = supabaseEnv.SUPABASE_URL
    const supabaseAnonKey = supabaseEnv.SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL missing!')
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY missing!')
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(c.req.header('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => setCookie(c, name, value, options))
        },
      },
    })

    c.set('supabase', supabase)

    await next()
  }
}
```

Usage in routes:

```ts
import { Hono } from 'hono'
import { getSupabase, supabaseMiddleware } from './middleware/auth.middleware'

const app = new Hono()
app.use('*', supabaseMiddleware())

app.get('/api/user', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.auth.getUser()

  if (error) console.log('error', error)

  if (!data?.user) {
    return c.json({
      message: 'You are not logged in.',
    })
  }

  return c.json({
    message: 'You are logged in!',
    userId: data.user,
  })
})

app.get('/signout', async (c) => {
  const supabase = getSupabase(c)
  await supabase.auth.signOut()
  console.log('Signed out server-side!')
  return c.redirect('/')
})

// Retrieve data with RLS enabled. The signed in user's auth token is automatically sent.
app.get('/countries', async (c) => {
  const supabase = getSupabase(c)
  const { data, error } = await supabase.from('countries').select('*')
  if (error) console.log(error)
  return c.json(data)
})

export default app
```

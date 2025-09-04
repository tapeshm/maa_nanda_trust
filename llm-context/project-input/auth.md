---
feature_id: auth
title: Authentication Flow for Hono + Cloudflare Workers + Supabase (SSR/HTMX)
allowed_paths:
  - "src/**"
  - "tests/**"
  - "wrangler.jsonc"
  - ".dev.vars"
language: typescript
frameworks: ["hono", "vitest", "jose", "htmx"]
build:
  format: ["pnpm", "fmt"]
  lint: ["pnpm", "lint"]
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
  - "Development requires setting Secure=false to allow http localhost connection"
  - "Project already uses pnpm + Vitest + ESLint + Prettier or equivalent scripts."
artifacts:
  runtime_env:
    - ".dev.vars"
    - "wrangler.jsonc"
  config:
    - "vite.config.ts"
    - "vitest.config.ts"
    - "src/config/csp.ts"
    - "src/config/supabase.ts"
---

## Overview

Implement a secure, stateless authentication layer with:

- Access token cookie (`__Host-access_token`, TTL ~10–15m)
- Refresh token cookie (`__Host-refresh_token`, TTL ~30–90d)
- Local RS256 verify using JWKS cached at the edge (≤ 9 minutes) with 1 forced re-fetch on `kid`/signature failure
- Middleware that performs at most one refresh attempt per request and applies correct GET vs HTMX semantics
- Robust cookie clearing, logout, rate-limits, CSRF protections for state-changing routes, and minimal observability

## Steps

- id: step-01
  title: Cookie schema & helpers (`__Host-*`)
  rationale: "Consistently set, rotate, and clear secure cookies for access and refresh tokens."
  changes:
  - create: "src/auth/cookies.ts"
  - modify: ".env.example"
  acceptance_criteria:
  - "Access and refresh cookies are set with: __Host- prefix, HttpOnly, Secure, Path=/, SameSite=Lax."
  - "Helpers expose: setAccessCookie(ttl), setRefreshCookie(ttl), clearAccessCookie(), clearRefreshCookie(), clearAllAuthCookies()."
  - "TTL defaults: access ≈ 10–15 minutes; refresh ≈ 30–90 days; configurable via env."
  - "For development set Secure to false."
  - "Use Hono cookie middleware, when creating Helper functions. Avoid reinventing wheels"
  tests:
  - path: "tests/auth/cookies.test.ts"
      type: unit
      cases:
    - "sets correct flags for access cookie"
    - "sets correct flags for refresh cookie"
    - "clears cookies with Max-Age=0"
    - "respects TTL overrides from env"

- id: step-02
  title: Security headers & cache control
  rationale: "Global security posture and no-store on auth responses."
  depends_on: ["step-01"]
  changes:
  - create: "src/middleware/securityHeaders.ts"
  - create: "src/config/csp.ts"
  - modify: "src/index.ts"
  acceptance_criteria:
  - "Adds HSTS (includeSubDomains; preload optional), sensible CSP scaffold, X-Content-Type-Options, Referrer-Policy, Permissions-Policy."
  - "Auth routes respond with Cache-Control: no-store."
  tests:
  - path: "tests/auth/securityHeaders.test.ts"
      type: unit
      cases:
    - "sets HSTS and CSP headers"
    - "auth responses have Cache-Control: no-store"

- id: step-03
  title: JWKS fetcher with edge caching & forced re-fetch
  rationale: "Stateless RS256 verification with minimal network overhead."
  depends_on: ["step-01"]
  changes:
  - create: "src/auth/jwks.ts"
  - create: "src/auth/verify.ts"
  acceptance_criteria:
  - "Fetches JWKS via caches.default using ETag/If-None-Match; TTL ≤ 9 minutes; cache scope applies only to JWKS."
  - "On verify failure due to kid/signature mismatch: force one JWKS re-fetch (revalidate/bypass) then retry verify once."
  - "Verifies alg=RS256, iss matches Supabase, aud if configured, nbf/iat/exp with ±60s skew."
  tests:
  - path: "tests/auth/jwks.test.ts"
      type: unit
      cases:
    - "caches JWKS and honors TTL"
    - "forces single re-fetch on kid mismatch then retries verify"
    - "rejects non-RS256 tokens"
    - "enforces issuer and skew"

- id: step-04
  title: Supabase token exchange utilities
  rationale: "Boundary functions for login (exchange) and refresh (rotate)."
  depends_on: ["step-01"]
  changes:
  - create: "src/auth/supabaseTokens.ts"
  - create: "src/config/supabase.ts"
  - modify: ".env.example"
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
  title: /login route handler
  rationale: "Perform login exchange and set cookies; HTMX-safe response."
  depends_on: ["step-01", "step-04", "step-02"]
  changes:
  - create: "src/routes/login.ts"
  - modify: "src/index.ts"
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
  title: Cookie clear utilities (global)
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
  title: Per-request auth middleware (verify path; GET vs HTMX)
  rationale: "Fast-path local verify; correct unauth response semantics."
  depends_on: ["step-03", "step-02"]
  changes:
  - create: "src/middleware/auth.ts"
  - modify: "src/index.ts"
  acceptance_criteria:
  - "If access cookie missing → unauth: 302 /login for full-page GET, 401 with HX-Redirect: /login for HTMX."
  - "If exp - now ≤ 60s, mark near-expiry and route to single refresh attempt."
  - "Successful verify attaches user claims (typed) to context."
  tests:
  - path: "tests/auth/middlewareVerify.test.ts"
      type: integration
      cases:
    - "unauth GET → 302 /login"
    - "unauth HTMX → 401 + HX-Redirect"
    - "near-expiry path triggers refresh pipeline"
    - "valid token attaches claims"

- id: step-08
  title: Single refresh attempt pipeline (race-aware)
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
  title: /logout route (global sign-out)
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

- id: step-10
  title: Rate limiting & precise CORS for auth endpoints
  rationale: "Mitigate brute-force and cross-origin risks."
  depends_on: ["step-05", "step-09"]
  changes:
  - create: "src/middleware/rateLimit.ts"
  - modify: "src/index.ts"
  acceptance_criteria:
  - "Applies IP/user-agent rate limits to /login, /refresh, /logout with sensible ceilings."
  - "CORS only permits credentials for trusted origins; preflights handled correctly."
  tests:
  - path: "tests/auth/rateCors.test.ts"
      type: integration
      cases:
    - "enforces rate limit on /login"
    - "rejects disallowed origins with credentials"

- id: step-11
  title: CSRF protection for state-changing routes
  rationale: "Prevent CSRF on admin/state-changing endpoints."
  depends_on: ["step-05", "step-07"]
  changes:
  - create: "src/middleware/csrf.ts"
  - modify: "src/index.ts"
  acceptance_criteria:
  - "Provides token/double-submit pattern; token issued post-login and validated on state-changing routes."
  - "HTMX requests carry token via header; failure yields 403."
  tests:
  - path: "tests/auth/csrf.test.ts"
      type: unit
      cases:
    - "issues token on login"
    - "validates token on POST"
    - "rejects missing/invalid token with 403"

- id: step-12
  title: Minimal observability (structured logs; no token contents)
  rationale: "Operational visibility without leaking secrets."
  depends_on: ["step-07", "step-08"]
  changes:
  - create: "src/observability/authLogs.ts"
  - modify: "src/middleware/auth.ts"
  acceptance_criteria:
  - "Logs counters via structured records for verify_ok/expired/sig_fail/jwks_miss, refresh_ok/invalid_grant/used/5xx."
  - "Never logs token contents or PII; includes correlation id/request id."
  tests:
  - path: "tests/auth/logs.test.ts"
      type: unit
      cases:
    - "emits structured events without secrets"
    - "categorizes refresh outcomes correctly"

- id: step-13
  title: Local Supabase dev workaround (HS256 and cookie flags)
  rationale: "Allow local development with Supabase CLI by supporting HS256 verification with `SUPABASE_JWT_SECRET` and relaxed cookie flags; keep RS256+JWKS in non-dev."
  depends_on: ["step-01", "step-03", "step-07"]
  changes:
  - modify: "src/auth/verify.ts"
  - modify: "src/config/supabase.ts"
  - modify: ".dev.vars"
  - modify: "wrangler.jsonc"
  acceptance_criteria:
  - "When `DEV_SUPABASE_LOCAL=1`: HS256 verification using `SUPABASE_JWT_SECRET`; no JWKS call."
  - "When `DEV_SUPABASE_LOCAL` is unset or '0': RS256 verification with JWKS cache and forced re-fetch."
  - "Dev cookies set with `Secure=false` and adjusted `__Host-` semantics for http localhost."
  - "Production cookies use `Secure=true`."
  - "Fails closed if both HS256 secret and JWKS misconfigured or missing."
  - "No tokens or secrets logged."
  tests:
  - path: "tests/auth/devMode.test.ts"
      type: unit
      cases:
    - "HS256 verify path works with `SUPABASE_JWT_SECRET`"
    - "JWKS path used when `DEV_SUPABASE_LOCAL=0`"
    - "cookies Secure=false in dev, true otherwise"
    - "JWKS fetch not called in dev mode"

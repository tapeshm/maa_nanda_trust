# Temple Trust Website

This repository contains a fully‑typed Cloudflare Workers application for the
Temple Trust.  The application uses [Hono](https://hono.dev) for routing and
server‑side rendering, [Cloudflare D1](https://developers.cloudflare.com/d1/) for
SQL storage, [R2](https://developers.cloudflare.com/r2/) for media storage,
[Workers KV](https://developers.cloudflare.com/kv/) for caching and runtime
state, [Tailwind CSS](https://tailwindcss.com/) for styling, and
[HTMX](https://htmx.org/) for lightweight dynamic behaviour.  Content for
public pages is stored using the [Editor.js](https://editorjs.io/) schema and
rendered on the server.

## Features

* **Edge‑native:** The entire application runs on Cloudflare’s global network
  using Workers.  Routing, middleware and rendering are handled by
  Hono, a lightweight framework that runs anywhere JavaScript does.  The
  application sets up proper security headers with the `secureHeaders`
  middleware【212270213774445†L210-L222】 and protects against CSRF using
  Hono’s built‑in `csrf` middleware【827260761473227†L218-L246】.
* **Server‑side rendering with JSX:** Pages are rendered on the server using
  Hono’s JSX support.  The TypeScript compiler is configured with
  `"jsx": "react-jsx"` and `"jsxImportSource": "hono/jsx"` so that JSX
  compiles into lightweight function calls【517148552572020†L252-L299】.  A set of
  reusable templates under `src/templates` makes it easy to compose pages.
* **Persistent storage with D1:** All structured data lives in a single
  SQLite database provided by Cloudflare D1.  The schema (in
  `migrations/schema.sql`) defines tables for content blocks, media metadata,
  administrative users and finance records.  Prepared statements are used to
  query and mutate the database via `c.env.DB.prepare()`【503742541464715†L149-L170】.
* **Media uploads with R2:** Files uploaded through the admin interface are
  stored in an R2 bucket.  The Workers binding `env.R2` exposes methods to
  write (`put`), read (`get`) and delete (`delete`) objects【839556421027750†L273-L335】.  An
  accompanying table in D1 stores metadata like the filename and MIME type.
* **Caching with KV:** Frequently read data (for example, rendered content
  blocks) can be cached in a KV namespace.  The `utils/cache.ts` module
  provides helper functions to read and write values from `env.KV`【162888665588579†L111-L131】.
* **Authentication and authorisation:** Administrative routes are protected by
  a Basic Auth middleware.  The `verifyUser` option is used to compare
  credentials against environment variables【398093354732524†L220-L248】.  This
  approach allows credentials to be rotated without code changes.  All state
  changing routes also use CSRF protection and secure headers.
* **Validation with Zod:** Incoming data is validated using
  [Zod](https://zod.dev) and the `@hono/zod-validator` middleware.  This
  ensures that only correctly shaped objects reach your business logic【949580580081126†L365-L475】.
* **Editor.js integration:** Non‑technical admins can edit page content using
  Editor.js.  The JSON produced by Editor.js is stored in D1 and is converted
  into HTML on the server.  The `utils/editor.ts` module performs a
  best‑effort conversion of common block types and escapes user supplied
  content to prevent XSS.
* **Responsive UI with Tailwind CSS and HTMX:** The HTML templates include
  Tailwind via the CDN and HTMX for minimal dynamic behaviour.  Tailwind’s
  CDN build allows rapid development without a separate build step, while HTMX
  enables actions like form submission and partial reloads without a heavy
  client framework.

## Project structure

```
temple-trust/
├── README.md               – this file
├── package.json            – dependencies and scripts
├── tsconfig.json           – TypeScript configuration with JSX support
├── wrangler.toml           – Cloudflare Workers configuration with bindings
├── migrations/
│   └── schema.sql          – SQL schema for the D1 database
└── src/
    ├── index.tsx           – entry point; builds the Hono application
    ├── bindings.ts         – type definitions for environment bindings
    ├── utils/
    │   ├── editor.ts       – Editor.js to HTML renderer and escaping helpers
    │   ├── db.ts           – database helper functions for D1
    │   └── cache.ts        – KV caching helper functions
    ├── middleware/
    │   ├── auth.ts         – Basic Auth middleware using env vars
    │   ├── csrf.ts         – CSRF protection middleware wrapper
    │   └── secure.ts       – secure headers middleware wrapper
    ├── routes/
    │   ├── index.ts        – aggregates all routes into one router
    │   ├── content.ts      – read and edit content blocks
    │   ├── finance.ts      – list and add finance records
    │   ├── media.ts        – upload and serve media files
    │   └── admin.ts        – admin dashboard and overview
    └── templates/
        ├── layout.tsx      – common HTML layout with navigation
        ├── page.tsx        – generic page that displays content
        ├── adminLayout.tsx – layout used for admin pages
        ├── finance.tsx     – table view of finance records
        ├── login.tsx       – Basic login prompt (for completeness)
        └── error.tsx       – error page template
```

## Getting started

Before running the application you need to have the [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI installed and a Cloudflare account with D1, R2 and KV resources provisioned.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment and bindings**

   Update `wrangler.toml` with your binding IDs.  The example file includes
   placeholders for the D1 database, R2 bucket and KV namespace.  At a minimum
   you should define `[[d1_databases]]`, `[[r2_buckets]]` and
   `[[kv_namespaces]]` entries.  You must also set `ADMIN_USERNAME` and
   `ADMIN_PASSWORD` variables in the `[vars]` section for Basic Auth.

3. **Apply database migrations**

   Cloudflare D1 supports migrations.  Run the following to create tables defined
   in `migrations/schema.sql`:

   ```bash
   npx wrangler d1 migrations apply DB
   ```

   Replace `DB` with the binding name used in `wrangler.toml`.  The migration
   creates tables for content blocks, media metadata, admin users and finance
   records.

4. **Run locally**

   Start the development server with:

   ```bash
   npm run dev
   ```

   Wrangler will serve the Worker on http://localhost:8787 and proxy D1, R2
   and KV requests.  Local R2 operations are stored on disk; use
   `--remote` if you want to interact with the real bucket【839556421027750†L268-L271】.

5. **Deploy**

   After verifying locally, deploy to Cloudflare with:

   ```bash
npm run deploy
```

## Integration tests

- Local Supabase (HS256):
  - `.dev.vars` is already configured to point to your local Supabase via `host.docker.internal:54321`.
  - Ensure Supabase is running on the host: `supabase start`.
  - Seed local users by setting `ADMIN_USERS` in `.dev.vars` and running `pnpm add:users`.
  - Tests:
    - `tests/integration/supabase-health.integration.spec.ts` checks `/auth/v1/health`.
    - `tests/integration/auth-app-context.integration.spec.ts` initializes the middleware and signs in using the app context client.

- Hosted Supabase (JWKS, asymmetric):
  - In `.dev.vars`, provide:
    - `SUPABASE_HOSTED_URL` (already populated with your project URL)
    - `SUPABASE_HOSTED_ANON_KEY` (already populated with your anon key)
    - `SUPABASE_HOSTED_EMAIL` and `SUPABASE_HOSTED_PASSWORD` for a test user
  - Run `pnpm test` — the hosted test `tests/integration/auth-middleware-hosted.integration.spec.ts` will:
    - Sign in to the hosted project, obtain a real JWT
    - Verify against the real JWKS endpoint and assert JWKS caching
  - If any hosted vars are missing, the test is skipped.

Notes
- Local Supabase uses HS256 (shared secret) by default, so JWKS verification isn’t applicable locally.
- Hosted Supabase uses asymmetric keys; the JWKS-based path is the primary verification flow tested.

## Auth debugging

- Toggle verbose middleware logs by setting `DEBUG_AUTH` in `.dev.vars`:
  - `DEBUG_AUTH="1"` to enable (development/tests)
  - `DEBUG_AUTH="0"` to disable (recommended for production)
- Local verification:
  - For local Supabase (HS256), set `SUPABASE_JWT_SECRET` in `.dev.vars` (default matches the CLI output from `supabase status`).
  - Middleware automatically detects HS* tokens and verifies with the shared secret.
- Hosted verification:
  - For hosted Supabase (ES256/RS256), middleware fetches JWKS and verifies tokens with the public key; cache is used when available.

## Security considerations

* **Basic Auth:** Credentials are read from environment variables and passed to
  Hono’s `verifyUser` option.  This avoids storing credentials in code and
  allows rotation via the Cloudflare dashboard.  The middleware is scoped to
  `/admin/*` routes【398093354732524†L220-L248】.
* **CSRF protection:** The default CSRF middleware compares the `Origin` header
  against the request URL【827260761473227†L218-L246】.  For additional
  protection you can specify allowed origins in `src/middleware/csrf.ts`.
* **Secure headers:** The `secureHeaders` middleware sets common security
  headers similar to Helmet【212270213774445†L210-L222】.  Adjust the options in
  `src/middleware/secure.ts` if you need to customise the policy.
* **Validation:** All API routes use Zod schemas to validate input
  【949580580081126†L365-L475】.  If validation fails, a 400 response is
  returned.
* **Content sanitisation:** User‑generated content stored via Editor.js is
  converted to HTML on the server with escaping to mitigate XSS attacks.

## References

* Hono example for querying D1 from a Worker【503742541464715†L149-L170】.
* Basic Auth middleware usage【398093354732524†L220-L248】.
* CSRF protection middleware【827260761473227†L218-L246】.
* Secure headers middleware【212270213774445†L210-L222】.
* JSX usage with Hono【517148552572020†L252-L299】.
* Zod validation and `@hono/zod-validator`【949580580081126†L365-L475】.
* R2 Worker API example【839556421027750†L273-L335】.
* KV usage example【162888665588579†L111-L131】.

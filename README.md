# Temple Trust Website

This Cloudflare Workers project is the foundation for the Temple Trust site. It
runs on Hono, renders HTML on the server, and uses Cloudflare services
(Workers, D1, KV, R2) for storage and caching.

## Current Status

Only the authentication layer is implemented:

- Secure cookie helpers for Supabase access/refresh tokens (__Host-*).
- JWT verification with JWKS + HS256 dev fallback, refresh pipeline, and
  role-based guards.
- Security headers, CSRF token issuance, and auth-aware layout state.

All prior Basic Auth + Editor.js scaffolding has been removed. Public pages are
minimal placeholders until the new editor work lands.

## Development

- `pnpm dev` – run Wrangler dev with asset watchers.
- `pnpm run dev:wrangler` – Workers dev server only.
- `pnpm test` – run the Vitest suite (auth coverage so far).
- `pnpm run watch:css` – watch Tailwind source and rebuild `dist/client/assets/app.css`.

## Project Layout (trimmed)

```
src/
  auth/          # Auth helpers (cookies, JWKS, Supabase wrappers)
  middleware/    # Security headers, auth context, rate limiting, CSRF helpers
  routes/        # app router (public placeholder + auth routes)
  templates/     # Layout, error, page + login templates
  utils/         # Content helpers (D1 access), env helpers, request helpers
```

## Next Steps

- Implement the TipTap-based content editor for protected pages (per
  `llm-context/project-input/editor.md`).
- Reintroduce content rendering once the new editor pipeline is in place.
- Gradually restore finance/media features using the new auth foundation.

## Tooling Notes

- Tailwind CSS output lives in `dist/client/assets/app.css`; `scripts/prepare-assets.mjs`
  copies `htmx.min.js` locally for Workers.
- `env.d.ts` maps Cloudflare bindings to the typed `Bindings` interface so Vitest
  and Workers share the same environment surface.

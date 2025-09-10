# LLM Context: Invariant Project Overview

This document describes the enduring architecture and conventions of the project so LLMs can assist without requiring frequent updates. It avoids enumerating specific files, versions, or ephemeral implementation details. Update this only when a major architectural change occurs.

## Purpose

- Public website for a temple trust: content pages, media gallery, and simple finance visibility.
- Administrative area for managing content, media, and finance with role‑based access control.
- Server‑rendered HTML with minimal, progressive enhancement on the client.

## Platform

- Cloudflare Workers as the execution and deployment platform.
- Data and storage use Cloudflare services: D1 (relational data), R2 (media objects), and KV (caching and small key–value data).
- This document should be revised if the runtime or core storage services change.

## Core Architecture

- Request lifecycle: A single Worker application initializes middleware (security headers and CSRF), mounts feature routers, and provides consistent 404/error responses.
- Routing model: Modular, feature‑scoped routers mounted under stable path prefixes (e.g., public content, finance, media, admin, auth). Handlers return full HTML or partial fragments for progressive enhancement.
- Rendering: Server‑side rendering via JSX templates. A shared layout provides head/body structure, navigation, theming, and common UI elements. Client‑side JS is small and focused on enhancements (e.g., partial HTML swaps, UI toggles).
- State and storage:
  - D1 stores canonical relational data (e.g., content blocks, finance records, media metadata).
  - R2 stores binary media objects; database retains metadata and keys.
  - KV caches rendered content or lightweight computed values with TTL; mutating actions invalidate relevant keys.
- Authentication and authorization:
  - JWT‑based authentication compatible with Supabase semantics.
  - Tokens may originate from SSR cookies or Authorization headers.
  - Verification uses JWKS in production; HMAC or JWKS in local/test as appropriate.
  - Middleware attaches an auth context and offers role guards (e.g., admin/trustee) for protected routes.
- Caching: KV is used opportunistically for read‑heavy paths; auth‑sensitive responses are not cached, and writes invalidate dependent cache entries.
- Errors and safety: Centralized error handling and not‑found rendering; security headers and CSRF checks applied to state‑changing methods.

## Development Model

- Language and style: TypeScript with strict typing across routes, middleware, utilities, templates, and tests. Keep modules small and composable; prefer SSR‑first UI with progressive enhancement.
- Environment and bindings: Wrangler provides environment bindings for D1, R2, KV, and secrets. Types ensure `c.env` and bindings are well‑typed.
- Local development: A dev server simulates the Worker runtime; schema migrations run locally; CSS and other assets are watched during development.
- Testing: Tests run in a Workers‑like isolate. Database migrations are applied during setup; tests prefer hermetic behavior and avoid external networks unless explicitly configured.
- Build and deploy: The Worker is bundled and deployed via Wrangler. Update this document only if the deployment target or bundling strategy fundamentally changes.

## Data Domains

- Content: Page‑like documents identified by slugs, with structured blocks and titles. Admin can create and edit; public views render to sanitized HTML.
- Media: Metadata records reference objects in R2 (key, filename, type, size). Public pages may reference media by key; admin can upload/list.
- Finance: Dated entries for credits/debits and supporting notes. Public view is read‑only; admin actions are role‑gated.
- Migrations: Schema evolves via numbered migrations. Typical additions include a migration, typed helpers, and targeted tests.

## Extensibility

- New route/feature: Create a namespaced route, mount it in the aggregate router, and render via SSR templates. Apply security headers, CSRF, and appropriate auth guards. Cache read‑heavy fragments in KV; invalidate on writes.
- New data model: Add a migration, expose typed helpers for D1 access, and write small tests for schema/queries. Keep route handlers thin and move cross‑cutting logic to utilities/middleware.
- UI changes: Favor server‑rendered templates and progressive enhancement (e.g., HTMX‑style partial swaps) over heavy client frameworks.

## Security Posture

- Security headers applied globally for all responses.
- CSRF protection enforced for state‑changing verbs using origin checks.
- JWT verification in middleware (JWKS in production; HMAC/JWKS in local/test), plus role‑based guards.
- Sanitization when transforming user‑authored content blocks to HTML.
- Secrets are provided only via environment bindings; do not hardcode secrets.

## Invariants (Trigger Updates Only If Broken)

- Cloudflare Workers runtime and deployment target.
- Lightweight, middleware‑centric routing with server‑side JSX rendering.
- Cloudflare D1/R2/KV as primary data stores.
- Middleware‑first security: secure headers + CSRF + JWT auth with role guards.
- SSR‑first UI with progressive enhancement and minimal client JS.
- Strong typing for environment bindings and data helpers.
- Tests run in a Workers‑like isolate with migrations applied.

## When To Update This Document

- Moving away from Cloudflare Workers or replacing D1/R2/KV.
- Replacing server‑side JSX or the routing approach with a materially different framework or an SPA‑first architecture.
- Switching from JWT‑based auth or changing core auth semantics/identity provider.
- Major repo reorganization that abandons modular feature routers or the middleware‑centric design.

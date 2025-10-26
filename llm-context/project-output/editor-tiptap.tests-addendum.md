Editor Tests Addendum — Coverage Plan (editor-tiptap)

Purpose
- Close identified test gaps to satisfy editor.md acceptance criteria without short‑circuiting behavior.
- Scope: tests only; no production code changes. Paths stay under `tests/**` and reuse existing helpers.

Test Environment & Principles
- Use Vitest with JSDOM for browser code; Workers pool for route tests where relevant.
- Avoid short-circuiting: do not bypass actual module under test; keep stubs minimal and local (e.g., fetch, R2/KV, htmx hooks).
- For “no cookie read” guarantees, assert no access to `document.cookie` via a getter spy.
- Prefer asserting DOM/class changes, emitted requests, and serialized form parameters over internal state.

Plan By Spec Step (files and key assertions)

1) step-01 Bootstrap editor bundle and manifest
- tests/frontend/editor/bootstrap.test.ts
  - initializes editors once per `[data-editor]`; subsequent calls are idempotent.
  - no matching roots → no-op without throw.
- tests/utils/assets.test.ts
  - resolves editor JS entry from manifest; returns CSS array when present and throws helpful error when entry missing.
  - dev & prod use same resolution code path.

2) step-03 Load SSR content into editors
- tests/frontend/editor/content.test.ts
  - hydrates editor with valid JSON payload from adjacent `<script type="application/json">` keyed by root id.
  - falls back to default empty doc on missing/invalid JSON without throw.
  - multiple editors hydrate independently from their own payloads.

3) step-04 Render admin editor page (SSR)
- tests/admin/editor-page.test.ts
  - unauthenticated → 401 (HTMX) or 302 redirect (HTML); authorized admin → 200.
  - SSR includes editor containers with `data-editor` attributes and JSON payload scripts adjacent to each container.
  - script `src` and optional CSS `<link>` are resolved via Vite manifest.
  - strict CSP: JSON script tags carry `nonce` matching response CSP header.
  - forms render `hx-headers` with `X-CSRF-Token` sourced server-side (no client cookie read).

4) step-05 Capture editor changes for HTMX saves
- tests/frontend/editor/form.test.ts
  - on submit, injects `content_json[<id>]` and `content_html[<id>]` hidden inputs per editor id; HTML falls back to '' when unavailable.
  - multiple editors serialize to distinct hidden inputs without overwrites.
  - forms w/ no registered editors still submit without throw.
  - HTMX `configRequest` overwrites outgoing params from hidden inputs when present; client code does not read cookies.

5) step-06 Image upload tooling (server + client edges)
- tests/routes/admin/upload-image.test.ts
  - rejects unauthenticated (401) and authenticated non-admin (403).
  - requires valid CSRF token; missing/invalid → 403.
  - validates MIME + extension (png/jpg/jpeg/webp) and size ≤ `MEDIA_MAX_UPLOAD_BYTES`; oversized → 413.
  - sets R2 `httpMetadata.contentType` from uploaded file type; responds `{ url }`.
  - verifies Origin/Host against `AUTH_TRUSTED_ORIGINS`; mismatch → 403.
- tests/routes/media.test.ts
  - GET `/media/:key+` accepts nested keys matching `^[A-Za-z0-9/_\-.]+$`; rejects invalid.
  - streams bytes with `Cache-Control: public, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`.
  - 404 when object missing; content type set from stored metadata.

6) step-10 Lifecycle & HTMX integration
- tests/frontend/editor/bootstrap.lifecycle.test.ts
  - reinitializes editors on `htmx:afterSwap` without double registration.
  - destroys editor instances and unregisters on DOM removal via `MutationObserver` or `htmx:beforeCleanup`.
  - no-op gracefully when HTMX is absent (no throws).
- tests/frontend/editor/form-sync.test.ts
  - FormSync registers editors/forms, refreshes hidden inputs immediately, and dedups HTMX params when hidden fields exist.
  - logs a single warning when an editor root lacks an `id`; serialization no-ops without throw.

7) step-11 Flow layout & grid utilities
- tests/ui/imageGrid.classes.spec.ts
  - built CSS (via STATIC_ASSETS) contains `.editor-figure-grid-2` and `.editor-figure-grid-3` selectors under a components layer; captions stay within figure block (structure-level assertion).

8) step-12 Tiptap node: imageFigure (commands & URL policy)
- tests/editor/imageFigure.commands.spec.ts
  - `setSize('xx') → 'm'`; `setAlign('weird') → 'center'`; `setWrap('unknown') → 'text'`.
  - `src='javascript:…'`/`data:…` rejected/cleared; `src='https://…'` and relative accepted.
- tests/editor/imageFigure.dom.spec.ts
  - DOM bears `editor-figure`, `editor-image`, `editor-figcaption`; size/align/wrap classes match attrs.

9) step-06 WYSIWYG parity (class-level) & step-07 a11y
- tests/parity/classParity.spec.tsx
  - editor preview wrapper vs SSR `<Content>` wrapper and figure subtree expose equal class sets and matching tag names.
- tests/a11y/semantics.spec.tsx
  - each `<figure>` has exactly one `<figcaption>`; `<img>` always has `alt` (empty allowed).
  - toolbar groups use `role='group'` with labelled headings.

Traceability (step → files)
- 01 → tests/frontend/editor/bootstrap.test.ts, tests/utils/assets.test.ts
- 03 → tests/frontend/editor/content.test.ts
- 04 → tests/admin/editor-page.test.ts
- 05 → tests/frontend/editor/form.test.ts
- 06 → tests/routes/admin/upload-image.test.ts, tests/routes/media.test.ts
- 10 → tests/frontend/editor/bootstrap.lifecycle.test.ts, tests/frontend/editor/form-sync.test.ts
- 11 → tests/ui/imageGrid.classes.spec.ts
- 12 → tests/editor/imageFigure.commands.spec.ts, tests/editor/imageFigure.dom.spec.ts
- 06 parity → tests/parity/classParity.spec.tsx
- 07 a11y → tests/a11y/semantics.spec.tsx

Anti–Short‑Circuit Measures
- Keep stubs minimal and targeted; do not replace modules under test with no‑op shims.
- Assert observable effects (DOM/class changes, parameters, headers) instead of private state.
- Spy on `document.cookie` getter to assert no reads in client code.
- For HTMX hooks, provide a tiny event bus shim; ensure handlers attach/detach as specified.
- For manifest resolution tests, load static JSON fixtures instead of injecting precomputed paths.

Next Actions
- Create the listed test files with focused cases and reuse `tests/integration/editor.helpers.ts` utilities.
- Ensure Vitest JSDOM is configured for `tests/frontend/**` and Workers pool for route tests touching Hono handlers.
- Keep changes idempotent and aligned with `allowed_paths`.


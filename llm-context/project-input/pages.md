---
feature_id: pages
title: Page creation, preview, and publish flow (Admin + Public)
allowed_paths:
  - src/
  - tests/
  - wrangler.jsonc
  - migrations/**
  - .dev.vars
language: TypeScript
frameworks:
  - hono
  - htmx
  - tiptap
  - vite
  - tailwindcss@v4
build:
  format: ["pnpm", "exec", "prettier", "--check", "."]
  lint: ["pnpm", "lint"]
  typecheck: ["pnpm", "run", "type-check"]
  test: ["pnpm", "test", "--run"]
  coverage_min: 0.80
constraints:
  - Cloudflare Workers environment (stateless; no in-memory state).
  - Auth and Editor systems are pre-implemented (see existing auth and editor code).
  - SSR only (no client-side frameworks) using Hono + HTMX + Tiptap.
  - Preview routes must be identical to public routes except reading from preview snapshots (`status='preview'`).
  - Public routes must never access preview data (`status='preview'`).
  - Editor content must be rendered from the HTML captured by the existing editor integration (not from ProseMirror JSON) to ensure SSR compatibility on Cloudflare Workers.
assumptions:
  - RequireAdmin and other auth middlewares are available from the existing auth implementation.
  - Environment variables for database and Tiptap editor are correctly configured via .dev.vars and secrets.
  - Tailwind v4 and shared Editor styles are available in the project.
  - Landing page, activities, and events are the only supported templates for this iteration.
  - Editor components save both ProseMirror JSON and pre-rendered HTML (content_html). Pages render only the HTML portion for the published view; JSON is stored solely for backup and editing purposes.
artifacts:
  runtime_env:
    - .dev.vars
    - wrangler.jsonc
  config:
    - src/config/pages.ts
  bindings:
    - KV: PAGES_CACHE
steps:
  - id: step-01
    title: Review auth, HTMX behavior, and reuse editor components
    rationale: The project includes authentication middleware and a Tiptap editor integration with HTML rendering. This step locks down auth behavior (including HTMX semantics) and confirms reuse of the existing editor. All admin and preview routes must be protected; page editing embeds the existing EditorInstance, capturing both JSON and HTML.
    depends_on: []
    hints:
      - Use requireAdmin (or equivalent) to guard admin and preview routes.
      - Detect HTMX via the HX-Request header equals "true". For unauthorized HTMX requests, return 401 and set HX-Redirect to "/login". For full-page unauthorized requests, return 302 to "/login".
      - Reuse the existing EditorInstance (for example, src/templates/components/editor). Submissions include content_json[...] and content_html[...] fields. Server-side rendering uses only content_html.
      - Do not create or modify editor configuration or styles; reuse shared editor integration and Tailwind.
    changes:
      - create: src/config/pages.ts
      - create: tests/pages/authEditorIntegration.test.ts
    acceptance_criteria:
      - Admin and preview routes are protected by auth. Unauthorized: 302 redirect for full-page, 401 + HX-Redirect for HTMX.
      - Admin editing page includes the element required by EditorInstance (for example, data-editor) and posts both content_json[...] and content_html[...].
      - No new editor configuration or styles are introduced.
    tests:
      - path: tests/pages/authEditorIntegration.test.ts
        type: unit
        cases:
          - unauthenticated GET /admin/landing returns 302; unauthenticated HTMX GET returns 401 and HX-Redirect: /login
          - admin editing page contains data-editor and posts content_json[...] and content_html[...]
  - id: step-02
    title: Define explicit route skeletons for admin, preview, and public
    rationale: Establish concrete route contracts so later steps can focus on data and template logic.
    depends_on:
      - step-01
    hints:
      - Group routes by module: src/routes/admin/pages.ts, src/routes/preview/pages.ts, src/routes/public/pages.ts; mount in src/index.ts.
      - Allowed slugs: landing | activities | events.
      - Admin routes (protected): GET /admin/:slug
      - Preview routes (protected): GET /preview/:slug
      - Public route patterns (unprotected):
        - GET / → redirect to latest published landing page at /landing/:id
        - GET /:slug/:id where slug ∈ {landing,activities,events} and id matches a published page snapshot (`pages.id` with status=published)
    changes:
      - create: src/routes/admin/pages.ts
      - create: src/routes/preview/pages.ts
      - create: src/routes/public/pages.ts
      - modify: src/index.ts
      - create: tests/pages/routes.test.ts
    acceptance_criteria:
      - All eight routes are defined and mounted: three admin (one per slug), three preview (one per slug), public /, and public /:slug/:id.
      - Admin and preview routes use requireAdmin from step-01.
      - Each route returns a distinct placeholder HTML indicating which route was hit.
      - Public GET / redirects to /landing/:id for the latest published landing page.
      - Public GET /:slug/:id returns 200 with placeholder when id is any integer; unknown slug returns 404.
    tests:
      - path: tests/pages/routes.test.ts
        type: integration
        cases:
          - GET /admin/landing (authorized) returns 200 with "admin landing placeholder"
          - GET /preview/activities (authorized) returns 200 with "preview activities placeholder"
          - GET / redirects (302) to /landing/:id (latest published)
          - GET /landing/123 returns 200 with "public placeholder"
          - GET /foo/123 returns 404
          - unauthenticated GET /admin/landing follows step-01 auth semantics
  - id: step-03
    title: Implement unified page data model with status-based persistence
    rationale: Define deterministic storage for pages and related content in D1 using a single set of tables. Pages track whether a snapshot is the current preview draft or a published version via a status flag, avoiding drift between duplicated schemas.
    depends_on:
      - step-02
    hints:
      - Implement the SQL in migrations/0001_pages.sql exactly as specified in the updated Data Model DDL section below (single `pages` table with `status` ∈ {'preview','published'} and shared `sections`, `activities`, `events` tables referencing `pages.id`).
      - Create repository classes (PreviewRepo and PublishRepo) that operate on the shared tables. Preview saves insert new rows with `status='preview'`; publish updates the same row to `status='published'` and timestamps `published_at`.
      - Admin forms post to /admin/:slug/save and /admin/:slug/publish using application/x-www-form-urlencoded.
      - Version is per-slug and starts at 1 (no version 0). Each POST /admin/:slug/save increments the version for that slug only. Compute next version as COALESCE(MAX(version), 0) + 1 within `pages` filtered to the slug (all statuses) so versions remain monotonic after publish.
      - Saving a new preview snapshot replaces any prior preview snapshot for that slug (previous preview rows are removed once the new version is persisted).
    changes:
      - create: migrations/0001_pages.sql
      - create: src/repositories/previewRepo.ts
      - create: src/repositories/publishRepo.ts
      - create: src/routes/admin/save.ts
      - create: src/routes/admin/publish.ts
      - create: tests/pages/modelPersistence.test.ts
    acceptance_criteria:
      - D1 tables exist exactly as in the DDL below; `pages` enforces UNIQUE(slug, version, status) with `status` constrained to preview|published.
      - Saving to preview inserts a new `pages` row with `status='preview'` plus related `sections`/`activities`/`events`; version increments per slug starting at 1.
      - Publishing the latest preview updates that row to `status='published'`, stamps `published_at`, and leaves previously published versions intact.
      - Public GET /:slug/:id reads only rows where `status='published'` and does not reflect preview changes until publish.
    tests:
      - path: tests/pages/modelPersistence.test.ts
        type: integration
        cases:
          - POST /admin/landing/save inserts a preview snapshot in shared tables and sets version 1 on first save, 2 on second save
          - POST /admin/landing/publish flips snapshot status to published and preserves associated data
          - GET /landing/:id reads only published snapshots and ignores preview-only edits
          - Versions for different slugs are independent (saving activities does not affect landing's version)
  - id: step-04
    title: Implement Admin Edit Forms & HTMX Actions
    rationale: Provide the core admin UX for editing page properties and managing nested items (activities, events) with full-page POST and HTMX progressive enhancement, as defined in "Admin UX Requirements".
    depends_on:
      - step-03
    hints:
      - GET /admin/:slug renders the full edit form for the latest preview version (or a new draft).
      - Forms must work without JS (full-page POST /admin/:slug/save).
      - Use hx-post and hx-delete for HTMX actions on sub-items (add/remove/reorder).
      - Implement HTMX routes: POST /admin/:slug/items (add), DELETE /admin/:slug/items/:item_id (remove), POST /admin/:slug/items/reorder.
      - HTMX routes target the preview snapshot (status=preview) by adding/removing child rows in the shared activities/events tables and return HTML fragments (for example, new item row or updated list).
      - All routes are protected by requireAdmin.
    changes:
      - modify: src/routes/admin/pages.ts
      - modify: src/routes/admin/save.ts
      - create: src/routes/admin/items.ts
      - modify: src/index.ts
      - create: src/templates/admin/landingForm.ts
      - create: src/templates/admin/activitiesForm.ts
      - create: src/templates/admin/eventsForm.ts
      - create: src/templates/admin/components/activityItem.ts
      - create: src/templates/admin/components/eventItem.ts
      - create: tests/pages/adminForms.test.ts
    acceptance_criteria:
      - GET /admin/:slug renders the correct form (landing, activities, or events) populated with the latest preview data.
      - Forms include all fields from Admin UX Requirements (title, hero, layout toggles, editor instances, item lists).
      - POST /admin/activities/items (HTMX) adds a new activity linked to the current preview page and returns an HTML fragment for the new item.
      - DELETE /admin/activities/items/:item_id (HTMX) removes the item belonging to the preview page and returns 200 OK.
      - POST /admin/events/items (HTMX) adds a new event linked to the current preview page and returns an HTML fragment.
      - DELETE /admin/events/items/:item_id (HTMX) removes the event belonging to the preview page and returns 200 OK.
      - POST /admin/:slug/items/reorder updates item positions (pos) and returns the updated list fragment.
    tests:
      - path: tests/pages/adminForms.test.ts
        type: integration
        cases:
          - GET /admin/activities renders form with item list
          - POST /admin/activities/items (HTMX) adds an item and returns fragment
          - DELETE /admin/activities/items/1 (HTMX) removes an item
          - POST /admin/events/items (HTMX) adds an event
          - POST /admin/activities/items/reorder updates positions and returns updated list
          - Full-page POST to /admin/landing/save updates all page fields
  - id: step-05
    title: Shared templates and SSR rendering
    rationale: Implement real SSR templates for landing, activities, and events using stored HTML and shared layout.
    depends_on:
      - step-03
    hints:
      - Implement renderLanding, renderActivitiesPage, and renderEventsPage (Hono JSX or string templates) using content_html and configuration from sections.
      - "Activities layout controlled by sections.config_json: {\"activities_layout\": \"carousel\"|\"grid\"}."
      - Both preview and public routes reuse the same render functions but with different repositories.
    changes:
      - create: src/templates/landingTemplate.ts
      - create: src/templates/activitiesTemplate.ts
      - create: src/templates/eventsTemplate.ts
      - modify: src/routes/admin/pages.ts
      - modify: src/routes/preview/pages.ts
      - modify: src/routes/public/pages.ts
      - create: tests/pages/templateRendering.test.ts
    acceptance_criteria:
      - Templates render hero image, H1 title, editor HTML content, activities, events, and optional donate button.
      - Rich text comes exclusively from stored content_html in the database.
      - Activities layout switches between carousel and grid via config_json.
      - Preview and public rendering are identical for identical data.
      - Section ordering respects sections.pos.
    tests:
      - path: tests/pages/templateRendering.test.ts
        type: integration
        cases:
          - renderLanding includes hero, H1, welcome content, activities, events, donate button when configured
          - renderActivitiesPage respects carousel vs grid and sorts activities by pos ascending
          - renderEventsPage sorts by start_date ascending and omits past events when configured
          - preview and public pages render byte-identical HTML for same data (string equality)
  - id: step-06
    title: Finalize flow and end-to-end tests
    rationale: Wire save → preview → publish with versioning and verify end-to-end behavior.
    depends_on:
      - step-05
    hints:
      - Version is per-slug and starts at 1. Increment on each POST /admin/:slug/save for that slug only. Publish promotes the current preview row by flipping its status to published (publish does not change the version number).
      - Do not mutate or delete prior published rows; public IDs remain stable and addressable.
    changes:
      - modify: src/routes/admin/pages.ts
      - modify: src/routes/admin/save.ts
      - modify: src/routes/admin/publish.ts
      - modify: src/routes/preview/pages.ts
      - modify: src/routes/public/pages.ts
      - create: tests/pages/endToEnd.test.ts
    acceptance_criteria:
      - Admins can create, preview, and publish landing, activities, and events pages. Published pages appear at /:slug/:id and match the preview.
      - Editing preview creates a new `pages` row with status preview (starting at 1 and incrementing by 1 per slug) without altering the currently published version until publish is called.
      - Public routes never read rows where status=preview.
      - All prior step tests pass.
    tests:
      - path: tests/pages/endToEnd.test.ts
        type: e2e
        cases:
          - create, preview, publish landing page and verify public rendering matches preview
          - edit preview without publishing; public page remains unchanged
          - create and publish activities page with multiple activities in configured order
          - create and publish events page with upcoming events sorted
          - version semantics: first save sets version 1, second save sets version 2; publish exposes version 2; a third save inserts version 3 as preview while public remains at version 2 until republish
  - id: step-07
    title: Edge caching and publish-time pre-render
    rationale: Most traffic is unauthenticated and reads static content. Serve public pages from KV to avoid D1 on hot paths. Invalidate and repopulate cache on publish; preview is never cached.
    depends_on:
      - step-06
    hints:
      - Add a KV binding `PAGES_CACHE` in wrangler.jsonc. Keys:
        - pages:html:{slug}:{id}:v{version} → full HTML string
        - pages:pointer:landing:current → JSON { id, version }
      - On publish: render HTML with the same templates used by preview/public, store to KV under the versioned key, and update the landing pointer when slug=landing.
      - On public GET /: use pointer to fetch the versioned HTML; if missing, fall back to D1 render (filtering status=published), then populate KV.
      - On public GET /:slug/:id: try KV first; if miss, render from D1 (status=published) and populate KV.
      - Set `ETag` as sha256 of HTML; set `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`.
      - Do not cache preview responses; send `Cache-Control: no-store` for preview endpoints.
    changes:
      - modify: wrangler.jsonc
      - modify: src/routes/public/pages.ts
      - modify: src/routes/admin/publish.ts
      - create: tests/pages/cacheBehavior.test.ts
    acceptance_criteria:
      - After a publish, subsequent public GET /:slug/:id is served from KV without D1 access when cache is warm.
      - Public GET / uses the landing pointer to resolve the current landing id and serves from KV when warm.
      - ETag is present and stable across identical content; client receives 304 when sending If-None-Match with the current ETag.
      - Preview endpoints set Cache-Control: no-store.
    tests:
      - path: tests/pages/cacheBehavior.test.ts
        type: integration
        cases:
          - publish stores versioned HTML and updates landing pointer in KV
          - public GET /:slug/:id hits KV on cache warm path and sets Cache-Control + ETag
          - public GET / resolves landing pointer and serves cached HTML when available
          - preview GET is never cached and sets no-store
  - id: step-08
    title: Refactoring for simplicity, reuse, and DX/UX
    rationale: Consolidate shared logic, improve performance and developer experience without changing features or acceptance results.
    depends_on:
      - step-07
    hints:
      - Extract and reuse a RichText SSR component for prose rendering across templates.
      - Deduplicate media URL normalization with a shared helper.
      - Centralize published HTML rendering shared by publish and public routes to remove duplicate slug→renderer dispatch.
      - Add DB indexes for hot lookups: pages(slug, status, version DESC).
      - Harden version increments against concurrency by retrying on UNIQUE(slug,version,status) conflict or computing next version atomically.
      - Extract bracketed form parsing utilities (sections/activities/events) into a typed helper to simplify routes.
      - Improve admin non-HTMX POST UX: redirect back to GET /admin/:slug with a success indicator; keep JSON for HTMX.
      - Replace placeholder redirect to /landing/1 when no published landing exists with a branded empty-state page.
      - Store ETag next to HTML in KV to avoid recomputing on hot paths; consider TTLs aligned with Cache-Control.
    changes:
      - modify: src/templates/components/RichText.tsx
      - modify: src/utils/pages/media.ts
      - modify: src/utils/pages/render.ts
      - modify: src/routes/admin/publish.ts
      - modify: src/routes/public/pages.ts
      - modify: src/templates/landingTemplate.tsx
      - modify: src/templates/activitiesTemplate.tsx
      - modify: src/templates/eventsTemplate.tsx
      - modify: migrations/0001_pages.sql
      - create: src/utils/forms/
    acceptance_criteria:
      - Shared helpers are used consistently across templates and routes.
      - Public and preview rendering remain byte-identical for the same data; existing tests continue to pass unchanged.
      - Query performance improves for latest-by-slug lookups via added indexes.
      - Admin UX supports both HTMX and full-page form posts gracefully.
      - ETag and KV behaviors remain compatible with current cache tests.
    tests:
      - path: tests/pages/templateRendering.test.ts
        type: integration
        cases:
          - existing cases pass; no HTML changes for same inputs
      - path: tests/pages/cacheBehavior.test.ts
        type: integration
        cases:
          - warm-cache behavior and ETag semantics unchanged
---

## Overview (Human Context)

This specification defines the requirements and incremental steps for implementing a structured page creation, preview, and publishing system in a Cloudflare Workers application using Hono, HTMX, and Tiptap. The goal is to allow administrators to build landing, activities, and events pages through an authenticated interface, preview changes, and publish them for public consumption. Key features include:

- Three route roots: `/admin/*` for editing, `/preview/*` for reviewing pending changes, and public routes (`/` redirect and `/:slug/:id`) for live content.
- Single storage model with status flag: each snapshot lives in the shared `pages` tables with `status` ∈ {preview,published}. Publishing promotes a preview snapshot by flipping its status; no duplicated schemas.
- Consistent templates: landing, activities, and events pages share a common style and template logic. All editor content must render identically in preview and public views using shared Tailwind styles.
- Admin-only access: all editing and preview routes require authentication via existing auth middleware. Public routes are unauthenticated.
- Versioning and publishing: every save increments a per-slug version number on a preview snapshot. Publishing updates that snapshot to `status='published'` while retaining prior published versions.
- Test-driven workflow: each step defines specific tests to verify behavior. Implementations must satisfy the acceptance criteria and ensure all tests pass to proceed to the next step.

## Notes

- The build commands include format and lint gates, aligning with the D3 common instructions. Adjust them if the repository uses different scripts, but record deviations in the output report.
- The data model described in step-03 matches the handwritten notes: pages have sections (welcome, activities, events), activities and events have titles and optional images and dates, and a floating donate button is configurable on landing pages.
- Further templates (for example, gallery pages) are out of scope; focus only on landing, activities, and events for this iteration.

## Admin UX Requirements

- Landing page editor includes fields:
  - Title (text)
  - Hero image key (text; references existing media key)
  - Donate button toggle (boolean)
  - Welcome section rich text (uses EditorInstance; posts content_html and content_json)
  - Section ordering (welcome, activities, events) via simple up/down controls; persists to sections.pos
- Activities page editor:
  - Page title (text)
  - Layout toggle (grid | carousel) stored in sections.config_json
  - Item management: add/remove/reorder activities with fields: title, image key (optional), image alt (optional), description rich text (EditorInstance)
- Events page editor:
  - Page title (text)
  - Item management: add/remove/reorder events with fields: title, image key (optional), image alt (optional), start date, end date (optional), description rich text
- Actions:
  - Save (creates a new preview version and remains in editor)
  - Preview (navigates to /preview/:slug showing latest preview version using public templates)
- Publish (confirmation dialog summarizing version to publish; on confirm promotes the preview snapshot to published and returns to editor with success notice and link to public URL)
- Feedback:
  - Inline validation messages on required fields
  - Non-JS flow works via full-page POST/redirects; HTMX progressively enhances add/remove/reorder interactions
- Pixel parity:
  - Preview uses the identical render pipeline as public; the returned HTML must be byte-identical for the same data

## Caching Strategy (Senior SWE View)

- Serve public pages from KV to avoid D1 on the hot path; re-render and repopulate KV on cache misses.
- KV keys:
  - pages:html:{slug}:{id}:v{version} → SSR HTML string
  - pages:pointer:landing:current → JSON pointer { id, version }
- Headers:
  - ETag = sha256(HTML)
  - Cache-Control = public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400
  - Preview endpoints set Cache-Control: no-store
- Invalidation:
  - On publish: write the versioned HTML and update the landing pointer when applicable; older versions remain addressable
- Fallbacks:
  - If KV miss, render from D1 using the published snapshot (status='published'), serve response, then populate KV

## Route Contract (Authoritative)

- Slugs: `landing | activities | events` (any other slug → 404)
- Admin (protected):
  - `GET /admin/:slug` → edit UI for latest preview version of the page for `:slug` (creates an initial draft if none exists)
  - `POST /admin/:slug/save` → persists a new preview snapshot (status='preview') and increments version
  - `POST /admin/:slug/publish` → promotes the latest preview snapshot to status='published'
  - `POST /admin/:slug/items` → HTMX add sub-item (activities/events) tied to the current preview snapshot; returns fragment
  - `DELETE /admin/:slug/items/:item_id` → HTMX remove sub-item from the preview snapshot; returns 200/204 and optional fragment
  - `POST /admin/:slug/items/reorder` → HTMX reorder sub-items; updates pos and returns updated list fragment
- Preview (protected):
  - `GET /preview/:slug` → renders latest preview version using the same templates as public
- Public (unprotected):
  - `GET /` → redirects to the latest published landing page at `/landing/:id`
  - `GET /:slug/:id` → renders published page by `pages.id` (status='published'); 404 if not found or slug mismatch
- Unauthorized behavior:
  - Full-page requests: 302 redirect to `/login`
  - HTMX requests (header `HX-Request: true`): 401 with `HX-Redirect: /login`

## Data Model DDL (Authoritative — implement exactly)

```sql
-- Shared page snapshots with status flag
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL CHECK (slug IN ('landing','activities','events')),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  hero_image_key TEXT,
  donate_enabled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('preview','published')) DEFAULT 'preview',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT,
  UNIQUE(slug, version, status)
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('welcome','activities','events')),
  pos INTEGER NOT NULL DEFAULT 0,
  config_json TEXT,
  content_html TEXT,
  content_json TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_key TEXT,
  image_alt TEXT,
  description_html TEXT,
  description_json TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_key TEXT,
  image_alt TEXT,
  start_date TEXT, -- ISO 8601 (YYYY-MM-DD) in UTC
  end_date TEXT,   -- ISO 8601 (YYYY-MM-DD) in UTC or NULL
  description_html TEXT,
  description_json TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pages_slug_status_version ON pages(slug, status, version DESC);
CREATE INDEX IF NOT EXISTS idx_sections_page ON sections(page_id);
CREATE INDEX IF NOT EXISTS idx_activities_page ON activities(page_id);
CREATE INDEX IF NOT EXISTS idx_events_page ON events(page_id);
```

## Editor Contract

- Editor posts two fields per rich text area: `content_json[...]` (opaque) and `content_html[...]` (sanitized HTML).
- Server stores and renders from `content_html[...]` only.
- JSON is retained for preview snapshots only (`sections.content_json`, `activities.description_json`, `events.description_json` when linked to status='preview') for recovery/editing and is not used at runtime. Published snapshots may store NULL in these columns.
- Published tables do not store JSON; only HTML is rendered publicly.

## Error Handling

- Not found: return 404 for unknown slugs or missing IDs.
- Invalid input: return 400 with a brief message; do not leak internals.
- CSRF: enforced by existing middleware for POSTs.

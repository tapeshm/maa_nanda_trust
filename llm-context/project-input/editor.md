---
feature_id: editor-tiptap
title: Tiptap Editor for Hono + Cloudflare Workers + D1 + R2 (SSR/HTMX)
allowed_paths:
  - "src/**"
  - "tests/**"
  - "migrations/**"
  - "wrangler.jsonc"
  - ".dev.vars"
  - "vite.config.ts"
  - "vitest.config.ts"
  - "tailwind.config.js"
  - "package.json"
  - "pnpm-lock.yaml"
language: typescript
frameworks: ["hono", "vitest", "tiptap", "vite", "htmx"]
build:
  format: ["pnpm", "exec", "prettier", "--check", "."]
  lint: ["pnpm", "lint"]
  typecheck: ["pnpm", "run", "type-check"]
  test: ["pnpm", "test", "--run"]
  coverage_min: 0.80
constraints:
  - "Cloudflare Workers runtime (stateless, no reliable in-memory state)."
  - "No frontend framework; pure SSR with server-side JSX templates."
  - "No DOM on server; instantiate editor only in the browser."
  - "Editor code under src/frontend/**, bundled by Vite; assets resolved via Vite manifest in both dev (vite build --watch) and prod; no hardcoded asset paths."
  - "Tiptap injectCSS=false; styling via Tailwind + @tailwindcss/typography (prose classes)."
  - "Image uploads via file input element; no client-side framework dependencies."
  - "Provide a basic toolbar for non-technical admins (bold/italic, headings, lists, image)."
  - "On save, capture both ProseMirror JSON and the editor-produced HTML in the browser; persist both to D1 to preserve parity without requiring @tiptap/html on Workers."
assumptions:
  - "Admin auth and CSRF middleware exist and are reusable across routes."
  - "Wrangler provides configured bindings for D1 (DB) and R2 (media)."
  - "Asset resolution uses the same manifest-based resolver for dev (`vite build --watch`) and prod."
  - "Tailwind Typography (`@tailwindcss/typography`) is enabled; prose classes are verified in tests."
  - "Default envs in `.dev.vars`: `CONTENT_MAX_BYTES=262144`, `LOG_SAMPLE_RATE=1.0`."
  - "Wrangler provides a Durable Object rate limiter binding (`RATE_LIMITER_DO`) for 429 protections."
artifacts:
  runtime_env: [".dev.vars", "wrangler.jsonc"]
  config: ["vite.config.ts", "vitest.config.ts", "wrangler.jsonc"]
steps:
  - id: step-01
    title: Bootstrap editor bundle and dependencies
    rationale: Establish the editor entrypoint, dependencies, and bootstrap hook so admin pages can load the client bundle.
    depends_on: []
    hints:
      - "Add @tiptap/core, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-placeholder, @tiptap/html, and @tiptap/pm as dependencies."
      - "Expose a dedicated Vite entry (e.g., editor) and register initEditors on DOMContentLoaded."
      - "Install or update lint/format dev dependencies so `pnpm exec prettier --check .` and `pnpm lint` succeed."
      - "Respect existing dev flow: keep `vite build --watch` used by `watch:js` working with the new entry."
      - "Enable Vite manifest output and resolve assets via the manifest in both dev (`vite build --watch`) and prod (single resolver)."
      - "Prefer static import of the generated manifest in the Worker bundle (no runtime fetch). Build client assets before bundling the Worker."
      - "During dev, ensure the Worker rebuilds when the manifest changes: either watch `dist/**` with `wrangler dev` or restart `wrangler dev` on manifest updates (e.g., `concurrently`, `nodemon`)."
      - "update nodemon.json to watch manifest.json to the wrangler dev restarts upon manifest update"
    changes:
      - modify: "package.json"
      - modify: "nodemon.json"
      - modify: "pnpm-lock.yaml"
      - modify: "vite.config.ts"
      - create: "src/frontend/editor/index.ts"
      - create: "src/frontend/editor/bootstrap.ts"
      - create: "src/frontend/editor/types.ts"
      - create: "src/utils/assets.ts"
    acceptance_criteria:
      - "Vite builds emit an editor bundle without impacting existing entries."
      - "`initEditors()` finds uninitialized `[data-editor]` roots and schedules profile-specific setup after DOM ready."
      - "Repeated calls to `initEditors()` do not re-initialize already mounted editors."
      - "`pnpm run dev` and `vite build --watch` continue to compile the editor entry without breaking other assets."
      - "Server resolves the editor script path via the Vite manifest in both development and production (no hardcoded paths)."
      - "When the manifest lists CSS for the editor entry, the admin page includes a corresponding <link rel='stylesheet'>."
      - "The Worker statically imports the Vite manifest (no runtime fetch) and build scripts enforce order: `build:client` (vite build) runs before `build:worker`; `build` runs both in sequence."
      - "During `pnpm run dev`, Worker restarts when `dist/**/.vite/manifest.json` updates so the latest asset hashes are served."
    tests:
      - path: "tests/frontend/editor/bootstrap.test.ts"
        type: unit
        cases:
          - "initializes editors once per element"
          - "skips setup when no matching elements exist"
      - path: "tests/utils/assets.test.ts"
        type: unit
        cases:
          - "resolves editor entry JS from manifest"
          - "returns CSS array when present; admin template renders <link> tags"
          - "throws useful error when entry missing"
  - id: step-02
    title: Implement editor factory profiles
    rationale: Provide reusable functions that create basic and full Tiptap editors with shared styling.
    depends_on: ["step-01"]
    hints:
      - "Share common extensions via a helper and append Image only for the full profile."
      - "Set editorProps.attributes.class to `prose max-w-none focus:outline-none` and disable built-in CSS via injectCSS."
      - "Use Placeholder extension with default text `Start writing…`."
      - "Adjust tailwind config: src/styles/input.css set content globs to ['src/**/*.tsx','src/**/*.ts','src/templates/**/*.tsx','src/frontend/**/*.ts'] and enable `@tailwindcss/typography`."
      - "Do not include an HTML/Raw HTML extension; avoid raw HTML injection features."
    changes:
      - create: "src/frontend/editor/factory.ts"
      - create: "src/utils/editor/extensions.ts"
      - modify: "src/frontend/editor/bootstrap.ts"
      - modify: "tailwind.config.js"
      - modify: "src/styles/input.css"
    acceptance_criteria:
      - "`createEditor(element, 'basic')` returns a Tiptap Editor configured with StarterKit and no Image extension."
      - "`createEditor(element, 'full')` includes the Image extension and optional placeholder text."
      - "All editor instances share Tailwind-powered typography without inline CSS injection."
      - "Default placeholder text is `Start writing…` and is applied consistently when enabled."
      - "Client and server import a single shared `extensionsList(profile)` to avoid schema drift."
      - "Tailwind Typography plugin (`@tailwindcss/typography`) is enabled and styles are applied (prose classes visible)."
      - "Tailwind purge includes server JSX/TSX templates and frontend TS so `prose` classes are preserved."
    tests:
      - path: "tests/frontend/editor/factory.test.ts"
        type: unit
        cases:
          - "basic profile excludes Image extension"
          - "full profile includes Image extension"
          - "editorProps apply prose classes and disabled CSS injection"
          - "placeholder defaults to `Start writing…`"
      - path: "tests/frontend/editor/typography.test.ts"
        type: unit
        cases:
          - "applies prose classes from Tailwind (no injected CSS)"
      - path: "tests/editor/extensions-parity.test.ts"
        type: unit
        cases:
          - "client and server use identical extension list for a given profile"
      - path: "tests/utils/assets.test.ts"
        type: unit
        cases:
          - "resolves editor entry from manifest (dev & prod use same code path)"
          - "throws helpful error when entry is missing in manifest"
  - id: step-03
    title: Load SSR content into editors
    rationale: Ensure editors hydrate from server-provided ProseMirror JSON and support multiple instances per page.
    depends_on: ["step-02"]
    hints:
      - "Store initial content in a sibling `<script type=\"application/json\">` tag keyed by element id."
      - "Fallback to empty doc when JSON is missing or invalid."
      - "keep editor styles consistent and have a single source of truth for defining tailwindcss classes"
    changes:
      - create: "src/frontend/editor/content.ts"
      - create: "src/frontend/editor/styles.ts"
      - modify: "src/frontend/editor/bootstrap.ts"
      - modify: "src/frontend/editor/types.ts"
    acceptance_criteria:
      - "Editors read initial JSON payloads and hydrate without throwing on empty or malformed data."
      - "Multiple editors on the same page hydrate independently using their own payload."
      - "On client hydrate, content payload is validated for minimal ProseMirror shape (type='doc', content:Array); invalid shape falls back to empty doc without throw."
    tests:
      - path: "tests/frontend/editor/content.test.ts"
        type: unit
        cases:
          - "hydrates editor with valid JSON payload"
          - "falls back to default content when JSON missing or invalid"
  - id: step-04
    title: Render admin editor page
    rationale: Expose an authenticated admin route that injects editor containers, initial JSON, and the editor bundle.
    depends_on: ["step-03"]
    hints:
      - "Mount a new admin router under `/admin` in `src/routes/index.ts`."
      - "Reuse `requireAuth` and `requireAdmin` middleware before handler execution."
      - "Embed `data-editor-profile` to select basic vs full editor."
      - "Load the editor bundle path via a manifest-aware resolver to keep dev and prod consistent."
      - "If assets are served via a binding, fetch `/manifest.json`; otherwise import the JSON at build time."
      - "If CSP is strict (no 'unsafe-inline'), add a per-request nonce to <script type='application/json'> payload tags and include it in the CSP header (script-src 'self' 'nonce-...')."
      - "Ensure the bootstrap script tag is permitted by CSP: either load from `self` with `script-src 'self'` for external scripts, or nonce inline if necessary."
    changes:
      - create: "src/routes/admin/index.tsx"
      - create: "src/templates/admin/editorPage.tsx"
      - modify: "src/routes/index.ts"
    acceptance_criteria:
      - "`GET /admin/:slug/:id` enforces auth: unauthenticated → 401 (or redirect for HTML GET), authenticated non-admin → 403, admin → 200."
      - "Successful responses include editor containers with `data-editor` attributes and script tags that load the bundle."
      - "Initial ProseMirror JSON is emitted in `<script type=\"application/json\">` tags adjacent to each editor container."
      - "Script src is resolved via the Vite manifest in both dev and prod."
      - "If the manifest record contains a 'css' array, all stylesheets are linked in the response head."
      - "Under strict CSP, initial content <script type='application/json'> tags carry a nonce that matches the response CSP header."
    tests:
      - path: "tests/admin/editor-page.test.ts"
        type: integration
        cases:
          - "unauthenticated returns 401 (HTMX) or redirect (HTML)"
          - "authorized admin receives HTML with editor container and bundle script"
          - "authenticated non-admin returns 403"
          - "strict CSP: JSON script tag includes nonce matching CSP header"
  - id: step-05
    title: Capture editor changes for HTMX saves
    rationale: Prepare editor state serialization and ensure forms submit JSON payloads via HTMX.
    depends_on: ["step-04"]
    hints:
      - "Attach a submit listener that injects both `editor.getJSON()` and `editor.getHTML()` (when available) into hidden inputs (`content_json[...]` and `content_html[...]`)."
      - "Emit HTMX-friendly responses for partial swaps."
      - "Server renders hx-headers='{"X-CSRF-Token":"..."}' directly on the <form> using a token from the request context; no client JS reads cookies."
      - "Support multiple editors in a single <form>: serialize each editor into a hidden input named `content_json[<root-id>]` using the editor container's `id`."
    changes:
      - modify: "src/frontend/editor/bootstrap.ts"
      - create: "src/frontend/editor/form.ts"
      - modify: "src/templates/admin/editorPage.tsx"
    acceptance_criteria:
      - "Hidden inputs are kept in sync with editor JSON and HTML before each HTMX submission (HTML falls back to an empty string when unavailable)."
      - "Forms without matching editors do not throw and still submit."
      - "Forms include server-rendered hx-headers with `X-CSRF-Token`; client JS does not access cookies to obtain the token."
      - "If a form contains multiple editors, each is serialized into distinct hidden inputs (`content_json[<id>]`, `content_html[<id>]`) keyed by its container id (no overwrites)."
    tests:
      - path: "tests/frontend/editor/form.test.ts"
        type: unit
        cases:
          - "serializes editor state into hidden input before submit"
          - "captures editor HTML alongside JSON"
          - "ignores forms with no registered editor"
          - "renders hx-headers with `X-CSRF-Token`; client JS does not read cookies"
          - "serializes multiple editors to content_json[<id>] fields deterministically"
  - id: step-06
    title: Implement image upload tooling
    rationale: Provide client toolbar actions and secure backend routes for image uploads and delivery.
    depends_on: ["step-05"]
    hints:
      - "fix toolbar styling in one place, along with editor style - add or modify tailwindcss classes for styling toolbar"
      - "Use a hidden file input triggered by a toolbar button to pick images."
      - "Restrict files to png, jpg/jpeg, or webp with size ≤ 5 MiB."
      - "Store media under `images/<timestamp>_<random>.<ext>` in R2 and respond with `{ url }`."
      - "Public media route pattern supports nested keys: `GET /media/:key+` (capture nested) and validate against `^[A-Za-z0-9/_\-.]+$` to prevent traversal."
      - "When putting to R2, set `httpMetadata.contentType` from the uploaded file's MIME type."
      - "Optionally set strong ETag on GET responses using the R2 object etag for cache revalidation (not required)."
      - "Make max size configurable via env (e.g., `MEDIA_MAX_UPLOAD_BYTES=5242880` in .dev.vars)."
      - "Set image alt text when inserting: read from a sibling `<input name=\"image_alt\">` if present; default to empty string."
      - "Add Origin/Host verification middleware for POST requests (upload/save). Reject when Origin/Host do not match configured origin; respond 403."
      - "If a sibling `input[name=\"image_alt\"]` is empty, prompt once (non-blocking) before insert; allow empty `alt` if user confirms."
    changes:
      - create: "src/frontend/editor/toolbar.ts"
      - modify: "src/frontend/editor/bootstrap.ts"
      - modify: "src/frontend/editor/styles.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - create: "src/routes/admin/upload.ts"
      - create: "src/routes/media.ts"
      - modify: "src/routes/index.ts"
      - modify: ".dev.vars"
    acceptance_criteria:
      - "Toolbar button triggers file picker and uploads via fetch POST to `/admin/upload-image`."
      - "Server rejects unauthenticated (401) and authenticated non-admin (403) upload attempts."
      - "CSRF: upload requests must include a valid token matching the `__Host-csrf` cookie; otherwise respond 403."
      - "Uploads validate both MIME type and file extension against png, jpg/jpeg, or webp and reject files over the configured max (5 MiB by default via .dev.vars)."
      - "R2 PUT sets httpMetadata.contentType to the uploaded file's MIME."
      - "`GET /media/:key+` validates key with `^[A-Za-z0-9/_\-.]+$`, allows nested paths, and streams R2 objects with `Cache-Control: public, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`."
      - "Inserted images include provided alt text when available; otherwise alt is an empty string."
      - "State-changing uploads verify request Origin/Host against AUTH_TRUSTED_ORIGINS; mismatches return 403."
      - "Oversized file returns 413 Payload Too Large; unsupported type/extension returns 415 Unsupported Media Type."
      - "Inserted image `src` must be a relative path under the app's `/media/` prefix (e.g., `/media/<key>`)."
      - "MIME sniff prevention enforced: `X-Content-Type-Options: nosniff` on media GET; uploads with mismatched extension vs MIME are rejected."
      - "Toolbar exposes only: bold, italic, heading (H2/H3), bullet list, ordered list, image."
      - "`HEAD /media/:key+` returns headers (Content-Type, Cache-Control, ETag) without a body."
    tests:
      - path: "tests/frontend/editor/toolbar.test.ts"
        type: unit
        cases:
          - "initiates upload and inserts image on success"
          - "handles upload errors with user-friendly feedback"
          - "inserts image with provided alt text from sibling input"
          - "prompts for alt when empty (can proceed with empty)"
          - "no extra commands rendered"
      - path: "tests/admin/upload-image.test.ts"
        type: integration
        cases:
          - "unauthenticated upload returns 401"
          - "authenticated non-admin upload returns 403"
          - "missing/invalid CSRF returns 403"
          - "stores valid images and returns media URL"
          - "rejects > 5 MiB or unsupported types"
          - "serves stored image via /media route with cache headers"
          - "media response includes X-Content-Type-Options: nosniff"
          - "GET /media returns correct Content-Type from R2 httpMetadata"
          - "media route accepts nested keys and rejects invalid characters"
          - "path traversal attempt (e.g., '..%2f') is rejected with 400/404"
          - "POST /admin/upload-image with mismatched Origin returns 403"
          - "HEAD /media returns headers and no body"
          - "exceed rate limit returns 429 for upload"
  - id: step-07
    title: Persist editor content in D1
    rationale: Provide HTMX save endpoint and schema to store ProseMirror JSON per document.
    depends_on: ["step-06", "step-10"]
    hints:
      - "Add a migration that creates an `editor_documents` table with slug, document_id, profile, content_json, content_html, and updated_at columns."
      - "Use parameterized statements for inserts/updates and return an HTMX-friendly JSON payload."
      - "Require CSRF token validation via header (`X-CSRF-Token` or `HX-CSRF-Token`) or form field (`csrf_token`/`_csrf`) consistent with middleware."
      - "Add Origin/Host verification middleware for POST requests (upload/save). Reject when Origin/Host do not match configured origin; respond 403."
      - "Validate `content_json` against a minimal schema: doc type + array content + allowed node types (paragraph, heading, list, image, etc.); violations return 422."
      - "Validate `content_html` length and allowed tags/attributes; reject payloads that exceed CONTENT_MAX_BYTES or include disallowed markup."
      - "Include an `etag` (updated_at or revision) hidden field and reject save with 409 Conflict if the stored `updated_at` differs (multi-tab protection)."
      - "On successful update, explicitly set `updated_at = CURRENT_TIMESTAMP` in the UPDATE statement (do not rely on defaults)."
    changes:
      - create: "migrations/0006_editor_documents.sql"
      - create: "src/models/editorDocuments.ts"
      - create: "src/routes/admin/saveContent.ts"
      - modify: "src/routes/admin/index.tsx"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: ".dev.vars"
    acceptance_criteria:
      - "`POST /admin/save-content` requires admin auth and upserts both ProseMirror JSON and the captured HTML into D1."
      - "CSRF: requests must include a valid `X-CSRF-Token` (double-submit: token + `__Host-csrf` cookie) or an equivalent server-rendered token; otherwise 403."
      - "Auth: unauthenticated → 401 (or redirect for HTML), authenticated non-admin → 403."
      - "Migration adds the editor_documents table with a composite primary key across slug and document_id."
      - "Successful saves respond with `{ ok: true, contentId }` or an HTMX fragment confirming persistence."
      - "State-changing endpoints verify request Origin/Host against AUTH_TRUSTED_ORIGINS; mismatches return 403."
      - "Malformed/invalid `content_json` (fails minimal shape validation) returns 422 Unprocessable Entity."
      - "Invalid or unsafe `content_html` (disallowed tags/attrs or `/media/` mismatch) causes the server to discard the submitted HTML, log a warning, and persist sanitized fallback HTML regenerated from the JSON."
      - "Reject payloads where either `content_json` or `content_html` exceed CONTENT_MAX_BYTES (default 256 KiB) with 413 Payload Too Large."
      - "On successful update, `updated_at` is set to the current timestamp to ensure a fresh ETag/revision for concurrency control."
    tests:
      - path: "tests/admin/save-content.test.ts"
        type: integration
        cases:
          - "unauthenticated save returns 401 (HTMX) or redirect (HTML)"
          - "authenticated non-admin save returns 403"
          - "missing/invalid CSRF returns 403"
          - "persists new content and updates existing rows"
          - "returns HTMX-friendly response payload"
          - "exceed rate limit returns 429 for save"
      - path: "tests/admin/security-origin.test.ts"
        type: integration
        cases:
          - "POST with mismatched Origin returns 403"
          - "> content size returns 413"
      - path: "tests/admin/save-content-conflict.test.ts"
        type: integration
        cases:
          - "stale etag returns 409"
      - path: "tests/admin/save-content-schema.test.ts"
        type: integration
        cases:
          - "node type outside allow-list returns 422"
  - id: step-08
    title: Render ProseMirror content for public pages
    rationale: Deliver stored rich text to end users with SSR HTML parity.
    depends_on: ["step-07"]
    hints:
      - "Render stored HTML captured during save; wrap in a container with the `prose` class."
      - "Validate stored HTML before rendering (tags, attributes, media paths); fall back to sanitized output derived from the saved JSON when needed."
      - "Return 404 when a document is missing."
      - "Defensive parse JSON: ensure `type: doc` and expected shape; on corrupt or invalid payload, render a safe empty document without throwing (or return 404)."
    changes:
      - create: "src/utils/editor/render.ts"
      - modify: "src/routes/content.tsx"
      - modify: "src/models/editorDocuments.ts"
    acceptance_criteria:
      - "Stored HTML (captured client-side) renders directly with Tailwind prose styling when it passes validation."
      - "Public content route fetches from D1 and returns 404 when no document exists."
      - "Invalid/corrupt JSON is caught; logs a structured warning with document identifiers and renders a safe empty document (or 404 as configured)."
      - "Stored HTML is validated against the allowed tag/attribute list and media path regex; invalid HTML triggers regeneration from JSON via the fallback renderer."
    tests:
      - path: "tests/routes/content-render.test.ts"
        type: integration
        cases:
          - "renders stored document HTML"
          - "returns 404 for missing documents"
          - "corrupt JSON payload renders safe empty output (no exception)"
          - "invalid shape logs warning and renders safe empty output"
          - "stored HTML failing validation regenerates output from JSON"
  - id: step-09
    title: Verify end-to-end editor workflow
    rationale: Ensure the combined admin editing and public rendering flow works as expected.
    depends_on: ["step-08"]
    hints:
      - "Use the Workers Vitest pool to exercise GET → POST → GET across admin and public routes."
      - "Seed auth context via middleware helpers without hitting real Supabase."
      - "Emit structured JSON logs for editor actions (mount, save ok, save fail, upload ok/fail) with request id (cf-ray or generated)."
    changes:
      - create: "tests/integration/editor-flow.test.ts"
      - create: "src/observability/editorLogs.ts"
    acceptance_criteria:
      - "Integration test covers creating, saving, and retrieving a document end-to-end."
      - "Coverage remains ≥ 80%."
      - "Logs include request_id (prefer cf-ray), route, and outcome (ok|fail); never include content_json or file bytes."
      - "Log sampling configurable via LOG_SAMPLE_RATE (default 1.0); redaction enforced (no content_json, no raw file bytes)."
    tests:
      - path: "tests/integration/editor-flow.test.ts"
        type: integration
        cases:
          - "admin can author content and see persisted state"
          - "public route returns newly saved content"
      - path: "tests/integration/editor-multi-save.test.ts"
        type: integration
        cases:
          - "form with two editors persists both documents (distinct keys) and re-renders correctly"
      - path: "tests/observability/editor-logs.test.ts"
        type: unit
        cases:
          - "logs redact PII and exclude document content"
  - id: step-10
    title: Refine editor lifecycle and HTMX integration
    rationale: Reduce duplicate payload handling, centralize form/editor synchronization, and harden lifecycle cleanup before persistence work.
    depends_on: ["step-06"]
    hints:
      - "Treat hidden inputs as the single source of truth for HTMX submissions; refresh the HTMX parameters from those hidden values instead of clearing them."
      - "Provide `hasEditorHiddenFields(form)` to detect hidden fields and only use param-only mode when hidden fields are absent."
      - "Extract a FormSync helper (WeakMap/WeakSet) to register editors/forms, refresh hidden fields, and expose serialize utilities for tests."
      - "Warn once per `[data-editor]` root that lacks an `id` so serialization issues surface early."
      - "Observe DOM removals: destroy editors and unregister content sources via a MutationObserver and `htmx:beforeCleanup`."
      - "Rescan automatically after `htmx:afterSwap` by invoking existing initializer routines."
      - "Bootstrap remains resilient when HTMX is absent; hooks are guarded and no-op without throwing."
    changes:
      - modify: "src/frontend/editor/bootstrap.ts"
      - modify: "src/frontend/editor/form.ts"
      - create: "src/frontend/editor/formSync.ts"
      - create: "tests/frontend/editor/bootstrap.lifecycle.test.ts"
      - create: "tests/frontend/editor/form-sync.test.ts"
    acceptance_criteria:
      - "HTMX `configRequest` handler refreshes hidden inputs and overwrites outgoing parameters with the same serialized values (no stale duplicates when hidden fields exist)."
      - "FormSync tracks editor instances and associated forms via WeakMap/WeakSet, refreshing hidden inputs immediately on register."
      - "Removing an editor root triggers instance.destroy() and unregisters its content source via MutationObserver or `htmx:beforeCleanup`."
      - "Bootstrap automatically re-runs initialization after `htmx:afterSwap`, mounting any new editors/forms without double-registering existing ones."
      - "A warning logs once when an editor root lacks an `id`; serialization still no-ops without throwing."
      - "Lifecycle and serialization logic covered by unit tests for MutationObserver handling and FormSync helpers."
    tests:
      - path: "tests/frontend/editor/bootstrap.lifecycle.test.ts"
        type: unit
        cases:
          - "reinitializes editors on htmx swap and cleans up on removal"
          - "destroys editors when roots are removed via MutationObserver"
          - "does not throw when HTMX is absent (hooks no-op)"
      - path: "tests/frontend/editor/form-sync.test.ts"
        type: unit
        cases:
          - "registers editors/forms and refreshes hidden inputs"
          - "skips duplicate HTMX parameters when hidden inputs exist"
          - "logs warning once for editor without id"

  - id: step-12
    title: Editor hardening and parity
    rationale: Address security, styling, and rendering gaps surfaced in review while documenting the Workers runtime limitation.
    depends_on: ["step-07", "step-08", "step-10"]
    hints:
      - "Run `csrfProtect()` on `/admin/upload-image` before any handlers; missing/invalid tokens must return 403."
      - "Ensure editor root classes include `max-w-none` and `focus:outline-none`; assert via typography unit tests."
      - "Adjust CSP builder so `img-src` only allows `'self'`; guard with a regression test."
      - "Update the server renderer to stay aligned with `extensionsList(profile)` and expand parity tests to catch drift."
      - "Record the `@tiptap/html` limitation in code comments/docstrings so future work understands the fallback."
    changes:
      - modify: "src/routes/admin/upload.ts"
      - modify: "tests/admin/security-origin.test.ts"
      - modify: "src/frontend/editor/styles.ts"
      - modify: "tests/frontend/editor/typography.test.ts"
      - modify: "src/config/csp.ts"
      - create: "tests/config/csp.test.ts"
      - modify: "src/utils/editor/render.ts"
      - modify: "tests/editor/extensions-parity.test.ts"
    acceptance_criteria:
      - "Image upload endpoint enforces CSRF tokens; missing/invalid tokens receive 403 and regression tests cover the path."
      - "Editor root classes include `prose max-w-none focus:outline-none`, verified by typography unit tests."
      - "CSP builder restricts `img-src` to `'self'` only with dedicated coverage."
      - "Saved HTML is validated before rendering, documented alongside the `@tiptap/html` limitation, and parity tests ensure the fallback renderer matches `extensionsList(profile)` when regeneration is required."
    tests:
      - path: "tests/admin/security-origin.test.ts"
        type: integration
        cases:
          - "returns 403 when CSRF token missing for upload-image"
  - path: "tests/frontend/editor/typography.test.ts"
    type: unit
    cases:
      - "editor root includes required Tailwind tokens"
      - path: "tests/config/csp.test.ts"
        type: unit
        cases:
          - "img-src directive restricts to self"
      - path: "tests/editor/extensions-parity.test.ts"
        type: unit
        cases:
          - "server renderer matches extensions profile"

  - id: step-13
    title: Image figure sizing, alignment, and captions
    rationale: Replace the legacy image node with an accessible figure node so admins can control presentation while keeping stored JSON/HTML and SSR output safe, synchronized, and CLS-friendly.
    depends_on: ["step-06", "step-08", "step-09", "step-12"]
    hints:
      - "Create `src/utils/editor/extensions/imageFigure.ts` defining an `imageFigure` block node (group: 'block', content: 'inline*' for caption only, selectable, draggable, isolating, defining). DOM: `<figure class=\"editor-figure editor-figure--size-{size} editor-figure--align-{align}\">` + child `<img class=\"editor-image\" …>` (image comes from node attrs only) + `<figcaption class=\"editor-figcaption\">` (caption = node content). If `<figcaption>` absent on parse, produce empty content."
      - "Have `parseHTML` wrap legacy `<img>` markup into the figure structure, normalize size/align defaults, parse `width/height` as base-10 integers; if units are present or value is non-integer, drop the attribute; for numeric values outside `[1,8192]`, clamp into `[1,8192]`; store attrs as numbers. Set `class=\"editor-image\"` on the nested `<img>` and drop unexpected classes/attrs—including `style`, any `on*`, or `data-*`."
      - "Restrict `<img>` attributes to { src, alt, width, height, loading, decoding, class, aria-describedby }. `src` MUST be either a relative `/media/...` URL or an absolute same-origin URL whose path starts with `/media/...`; reject everything else (drop the node during sanitization and regenerate from JSON). Always emit an `alt` attribute; if not provided, set `alt=\"\"` (empty string). Freeze enums: `size ∈ {'original','large','medium','small'}` and `align ∈ {'start','center','end'}`; unknown tokens normalize to `size:'medium'`, `align:'center'`. For `aria-describedby`, only accept a single ID that matches `^imgcap-[A-Za-z0-9_-]{8,22}$` and resolves to the sibling `<figcaption>`; otherwise drop the attribute."
      - "Expose `setImageFigure` (with optional `captionText`) and `updateImageFigure` commands that always `editor.chain().focus().…` so toolbar interactions mutate attributes/content without re-inserting nodes. If caption content is non-empty, set `aria-describedby` on `<img>` pointing to a stable `id` emitted on `<figcaption>`; remove the attribute when caption becomes empty."
      - "Store a `captionId` attribute on the node; when inserting a new figure, generate `captionId = 'imgcap-' + customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789_-', 10)()`. Use this attribute for both `<figcaption id>` and the `<img aria-describedby>` value; if a legacy node lacks `captionId`, create one during upgrade."
      - "Update the upload flow to decode intrinsic image dimensions once (e.g., `createImageBitmap`; Safari fallback to `HTMLImageElement.decode()`), insert figures with `{ width, height, size: 'medium', align: 'center' }`, and cache the probe result; keep width/height immutable afterward."
      - "Wire full-profile toolbar controls for `[data-editor-image-size]`, `[data-editor-image-align]`, and a caption-focus button `[data-editor-image-caption]`; enable them only when selection is within an `imageFigure`, hydrate UI state on `selectionUpdate`, and persist adjustments through `updateAttributes` or by placing the caret inside figcaption. On `selectionUpdate`, if stored `size|align` are invalid, reflect normalized defaults (`medium|center`) in UI state without remounting the node."
      - "Adjust `extensionsList()` to register the new module for both client and server profiles and expand parity tests so they assert shared instances plus schema-signature coverage for the figure node. Remove `@tiptap/extension-image` from the full profile to prevent schema collisions."
      - "Tighten `schemaSignature.ts`, `render.ts`, and `isSafeEditorHtml()` to whitelist only `<figure>`, `<img>`, `<figcaption>`; strip all `style`, `on*`, and `data-*`; allow `'aria-describedby'` on `<img>` and `'id'` on `<figcaption>` only. In captions allow only `<strong>`, `<em>`, `<code>` (escape others). Enforce `src` same-origin `/media/...` rule; clamp numeric `width/height` to `[1,8192]`; always emit `loading=\"lazy\"` and `decoding=\"async\"`. Require exactly one `<img>` child inside `<figure>`; if zero or more than one are present, drop the HTML node during sanitization and regenerate from JSON. Upgrade legacy JSON/HTML (`image` node or bare `<img>`) into `imageFigure` with defaults. Validate that `<figcaption id>` matches `^imgcap-[A-Za-z0-9_-]{8,22}$`; otherwise create a new `captionId` (`'imgcap-' + customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789_-', 10)()`) and persist it in both JSON and HTML during capture/SSR."
      - |
        In `src/styles/input.css`, define the figure/image utility classes directly so Tailwind keeps them alongside the generated utilities:
        ```css
        @import "tailwindcss";
        /* Width presets and alignment rules */
        .editor-figure--size-original{ width:100%; }
        .editor-figure--size-large{ width:75%; }
        .editor-figure--size-medium{ width:50%; }
        .editor-figure--size-small{ width:33.3333%; }
        .editor-figure--align-start{ margin-inline-start:0; margin-inline-end:auto; }
        .editor-figure--align-center{ margin-inline:auto; }
        .editor-figure--align-end{ margin-inline-start:auto; margin-inline-end:0; }
        .editor-image{ width:100%; height:auto; display:block; }
        .editor-figcaption:empty{ display:none; }
        ```
        Custom selectors are not purged by Tailwind v4+, so no inline safelist is required—just ensure the raw CSS ships with the bundle. Keep the typography check asserting that these classes are present.
    changes:
      - create: "src/utils/editor/extensions/imageFigure.ts"
      - modify: "src/utils/editor/extensions.ts"  # remove @tiptap/extension-image; register shared imageFigure in client & server profiles
      - modify: "src/utils/editor/schemaSignature.ts"
      - modify: "src/utils/editor/render.ts"
      - modify: "src/frontend/editor/toolbar.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/styles/input.css"
      - modify: "tests/frontend/editor/toolbar.test.tsx"
      - modify: "tests/editor/extensions-parity.test.ts"
      - modify: "tests/utils/editor/render.image.test.ts"
      - modify: "tests/frontend/editor/typography.test.ts"
    acceptance_criteria:
      - "Full-profile editors surface size presets (`original|large|medium|small`), alignment (`start|center|end`), and caption tooling, active only when an `imageFigure` is selected; toolbar updates use `updateAttributes('imageFigure', …)` or move the caret into `<figcaption>` without remounting the node or shifting the selection anchor."
      - "Image uploads insert an `imageFigure` with intrinsic numeric `width`/`height` (immutable thereafter), defaults `{ size:'medium', align:'center' }`, preserved `alt`, optional caption; subsequent toolbar edits persist to both ProseMirror JSON and captured HTML."
      - "Width/height are immutable after insert (no toolbar controls to edit them); attempts to change via commands are ignored and do not affect JSON/HTML."
      - "Sanitization/fallback rendering permit only whitelisted tags/attrs/classes, forbid `style/on*/data-*`, enforce `src` to be `/media/...` or absolute same-origin `/media/...`, clamp `width/height` to `[1,8192]`, emit `loading=\"lazy\"` and `decoding=\"async\"`, allow only `<strong>`, `<em>`, `<code>` inside figcaptions (escape others), and upgrade legacy JSON/HTML into `imageFigure`."
      - "Sanitization enforces exactly one `<img>` per `imageFigure`; documents violating this are normalized by regenerating from JSON."
      - "If caption text exists, `<img>` includes a valid `aria-describedby` that resolves to its sibling `<figcaption id=\"imgcap-…\">`; if the idref is missing or invalid, the attribute is dropped."
      - "Inline figcaptions support the allowed marks and render inside `<figcaption class=\"editor-figcaption\">…</figcaption>`; empty captions collapse via CSS so legacy documents without captions do not leave visual gaps."
      - "Captured HTML and SSR output always include `alt` on `<img>`; when authoring omitted it, `alt=\"\"` is emitted."
      - "When caption is non-empty, `<img>` includes `aria-describedby` referencing the `<figcaption>`; when empty, the attribute is absent."
      - "The `<figcaption id>` comes from the node's persisted `captionId` (generated `'imgcap-' + customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789_-', 10)()`); captured HTML and SSR output reuse the same value, and missing/invalid ids are regenerated once during upgrade."
      - "Client/server extension parity excludes the legacy `Image` extension and includes a shared `imageFigure` instance; schema helpers enumerate `size`, `align`, `src`, `alt`, `width`, `height`."
      - "Tailwind v4 builds retain all `editor-figure`/`editor-image` BEM classes in dev & prod, and parity tests confirm client/server share the same `imageFigure` extension while schema helpers enumerate its attrs."
    tests:
      - path: "tests/frontend/editor/toolbar.test.tsx"
        type: unit
        cases:
          - "applies size/alignment presets to the selected `imageFigure` without remounting (stable node id/pos) and without changing selection anchor"
          - "updates alignment buttons and reflects active state from selection"
          - "normalizes invalid stored size|align to (medium|center) on selectionUpdate without remounting"
          - "focuses figcaption editing and persists caption text inline"
          - "ignores attempts to change intrinsic width/height via commands; attrs remain unchanged and JSON/HTML are identical"
      - path: "tests/editor/extensions-parity.test.ts"
        type: unit
        cases:
          - "full profile registers a shared `imageFigure` extension instance and does not register the legacy `Image` extension"
          - "schema signature exposes `imageFigure` attrs: { src, alt, width, height, size, align }"
      - path: "tests/utils/editor/render.image.test.ts"
        type: unit
        cases:
          - "renders sanitized imageFigure JSON to expected figure/img/figcaption markup with intrinsic dimensions, loading hints, and allowed marks"
          - "rejects/normalizes invalid `size|align|width|height`, strips forbidden caption tags/attrs and all style/on*/data-*; rejects disallowed `<img>` attrs; upgrades legacy HTML/JSON into `imageFigure`"
          - "accepts `src` = `/media/x.webp` and `https://<same-origin>/media/x.webp`; rejects `https://cdn.example/x.webp` and regenerates from JSON"
          - "emits `aria-describedby` on `<img>` when caption text is present and removes it when caption becomes empty"
          - "rejects figures with zero or multiple `<img>` children and regenerates valid markup from JSON (exactly one `<img>`)"
          - "on capture, drops HTML figure with invalid/missing `<img>` and regenerates from JSON to a single `<img>`"
          - "ensures `<img>` always has alt; emits `alt=\"\"` when authoring omitted it"
          - "accepts `aria-describedby` that matches `^imgcap-[A-Za-z0-9_-]{8,22}$` and points to sibling `<figcaption>`; drops invalid or missing idrefs"
          - "drops `aria-describedby` when caption is empty or `<figcaption>` lacks the matching id"
          - "reuses the node's persisted `captionId` (pattern `'imgcap-' + customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789_-', 10)()`) for both `<figcaption id>` and `<img aria-describedby>`"
          - "regenerates missing/invalid `captionId` values to a new `'imgcap-' + customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789_-', 10)()` and persists them back to JSON/HTML"
      - path: "tests/frontend/editor/typography.test.ts"
        type: unit
        cases:
          - "keeps BEM classes (size: original|large|medium|small; align: start|center|end) available in the generated CSS even when unused in TSX markup"
          - "includes the `.editor-figure`, `.editor-image`, and `.editor-figcaption` class declarations in the emitted stylesheet"

  - id: step-14
    title: Image toolbar and layout UX refinements
    rationale: Streamline image-only controls, prevent misleading alerts, and let surrounding copy flow around aligned figures without remounting nodes so the editor feels polished for non-technical authors.
    depends_on: ["step-13"]
    hints:
      - "Wrap image-specific controls (alt text, caption focus, size, alignment) in a secondary panel/section that mounts once per editor (sibling to the primary toolbar) and toggles visibility only while an `imageFigure` is selected."
      - "Each editor root manages its own image panel instance; do not share DOM or state across multiple editors rendered on the same page."
      - "Subscribe to `selectionUpdate`/`transaction` to recompute `editor.isActive('imageFigure')`; mutate panel state without tearing down DOM."
      - "Expose the panel with accessible labelling (e.g., headings plus `role=group`/`aria-labelledby`) so groups are announced correctly."
      - "Hide the alt-text input until an image is active; keep the value in sync with the node attrs, allow clearing to empty string, and ensure tab order remains predictable (no forced focus unless expressly triggered)."
      - "Treat size presets as layout hints that update only the `size` attribute; never mutate the intrinsic width/height captured at insert time."
      - "Move caption editing into the image panel (no top-level button) and use the existing command to create a `TextSelection` inside `<figcaption>` without remounting the node."
      - "Return a discriminated result from the upload helper so success resolves without running the generic failure alert; treat any HTTP 2xx as success and surface only failed network/non-2xx responses."
      - "Debounce panel visibility/state updates (≈100 ms or `requestAnimationFrame`) to avoid flicker during rapid selection changes; re-use the same panel DOM when switching between figures."
      - "Render the panel as an inline sibling that stays visible via `position: sticky` (or equivalent) so controls remain accessible while scrolling longer documents."
      - "Sanitise alt-text input by stripping HTML, enforcing a 250-character limit (with inline counter), and falling back to the node's attrs when truncation occurs."
      - "Update `.editor-figure--align-start|end` styles to float using logical properties (`float: inline-start/inline-end`, `display: flow-root`, sensible margins) so paragraphs wrap cleanly; verify RTL mirrors correctly and clear subsequent blocks when needed."
      - "Ensure `.editor-figure` and descendant `<img>` elements remain within the editor column on all breakpoints (`max-width: 100%`, responsive sizing) so aligned media never overflows or causes horizontal scroll."
      - "Add regression coverage for panel toggling, alert behaviour, wrap layout, focus rules, and node stability to prevent future drift."
    changes:
      - modify: "src/frontend/editor/toolbar.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/frontend/editor/styles.ts"
      - modify: "src/styles/input.css"
      - modify: "tests/frontend/editor/toolbar.test.tsx"
      - modify: "tests/frontend/editor/bootstrap.test.ts"
      - modify: "tests/frontend/editor/typography.test.ts"
    acceptance_criteria:
      - "Primary toolbar shows global formatting actions only; each editor owns a single image panel that toggles visibility without DOM remounts and appears only while an `imageFigure` is active."
      - "Within the image panel, size presets and alignment controls are separated into labelled groups (`role=group`, `aria-labelledby`) with active state derived from the node attrs."
      - "Alt-text editing UI is hidden until an image is selected, sanitises input to plain text, enforces a 250-character limit with inline feedback, and hiding the panel never mutates the stored alt value."
      - "When the alt-text input is focused, clicking size/alignment controls does not blur the field; Tab/Shift+Tab follow the panel’s DOM order, and pressing Escape restores the node’s current alt value and returns focus to the editor."
      - "Preset size controls update only the `size` attribute; intrinsic width/height remain immutable after insert. Switching back to ‘Original’ applies the layout preset without mutating width/height or remounting the node."
      - "Panel visibility/state updates are debounced (~100 ms or `requestAnimationFrame`) to prevent flicker; switching between figures updates the same panel instance in place, and losing the image selection hides the panel without tearing it down."
      - "Panel layout keeps controls reachable while scrolling (e.g., `position: sticky`) and hides the panel when the editor loses focus, preserving state for the next selection."
      - "Focusing the caption via the panel moves the caret into `<figcaption>` without scroll jumps or node churn; if the selection is already inside the caption the command is a no-op; if absent, create an empty caption and place the selection inside without replacing the figure."
      - "Successful uploads are defined as HTTP 2xx responses and resolve without firing the generic failure alert; rejected requests or non-2xx responses emit the alert exactly once."
      - "Paragraphs wrap alongside start/end aligned figures using logical floats (`float: inline-start/inline-end`, `display: flow-root`), while center-aligned figures remain block-level (`margin-inline: auto`); subsequent block elements clear the float, captions remain inside the figure, and DOM reading order stays figure → caption → text for both LTR and RTL."
      - "Multiple editors on the same page maintain independent panel state and listeners; destroying one editor cleans up without affecting the others."
      - "Aligned figures and their `<img>` contents obey the editor container width at every breakpoint; no horizontal overflow or scrollbar appears, and small screens collapse floats gracefully (stacking when necessary)."
    tests:
      - path: "tests/frontend/editor/toolbar.test.tsx"
        type: unit
        cases:
          - "image panel mounts once, toggles visibility with an active `imageFigure`, and retains node id/attrs across toggles"
          - "size/alignment groups render inside the panel with correct active state tied to node attrs"
          - "successful image upload resolves without firing the failure alert; rejected uploads fire exactly one alert"
          - "caption focus command places selection in figcaption without changing node key"
          - "alt-text input sanitises pasted HTML, enforces the 250-character limit with inline feedback, and Escape restores the node attr while refocusing the editor"
          - "clicking size or alignment controls while the alt-text field is focused does not blur the input"
          - "rapid selection changes do not re-focus or re-append the panel (debounced visibility update)"
          - "panel updates alt-text display when node attrs change externally (e.g., undo/redo) without remounting"
          - "caption focus creates a caption when missing, preserves node key/attrs, and is a no-op when the selection is already inside the figcaption"
          - "multiple editors on the same page maintain independent panel state and listeners"
          - "panel hides when the editor loses focus and reappears with preserved state after re-selection"
          - "keyboard navigation (Tab/Shift+Tab) traverses panel controls predictably and returns to the editor after the last control"
      - path: "tests/frontend/editor/bootstrap.test.ts"
        type: unit
        cases:
          - "image panel mounts once per editor and does not re-append on repeated selection toggles"
          - "destroying the editor unregisters panel event listeners"
          - "multiple editors register independent panels and clean up correctly when one editor is destroyed"
          - "panel visibility responds to editor blur/focus events surfaced through bootstrap observers"
      - path: "tests/frontend/editor/typography.test.ts"
        type: unit
        cases:
          - "aligned figures allow adjacent paragraphs to wrap without overlapping captions in LTR"
          - "long captions wrap within the figure without overlapping adjacent text"
          - "aligned figures mirror correctly under RTL (inline-start/end)"
          - "RTL snapshot confirms computed float/margin values mirror correctly"
          - "center-aligned figures stay block-level with no text wrapping"
          - "floated figures clear properly when followed by another figure or block element"
          - "caption text does not overflow figure bounds on narrow viewports"
          - "RTL layouts avoid scrollbar overlap or clipping when figures align to inline-start/end"
          - "responsive figures clamp width to 100% and prevent horizontal overflow on small viewports"


---

## Overview (Human Context)

Authoritative spec: the YAML frontmatter above. The prose below provides context and guidance for reviewers and contributors.

Prepare a D3-compatible input spec for integrating the Tiptap V3 editor with SSR HTML, Hono, Cloudflare Workers, R2, and D1.

It will support modular editor creation, ProseMirror JSON output, Tailwind prose styling, and secure usage within authenticated admin routes only.

## Overview

* Add **Tiptap v3** rich-text editor to **SSR HTML** app (no frontend framework).
* Stack: **Hono** on **Cloudflare Workers**; storage in **R2** (images), content in **D1** (JSON).
* Editor initialized on **server-rendered `contenteditable` elements**; **deferred binding** on client.
* **Factory pattern**: basic editor (text), full editor (text + images).
* **Tailwind typography (`prose`)** for consistent look; same UX across all editors.
* Admin-only, authenticated routes; content serialized to **ProseMirror JSON**.

---

## Constraints

* Pure SSR; **no React/Vue**; SSR templates written in JSX.
* Editor code in `src/frontend/**`; **Vite** bundles for dev/prod; assets resolved via the Vite manifest in both dev (`vite build --watch`) and prod—no hardcoded asset paths.
* **Single source of truth**: app `__Host-*` cookies (auth already defined elsewhere).
* **No DOM on server**; instantiate editor **only in browser**.
* Image uploads via **file input** → **R2**; URLs inserted into doc.
* Tiptap `injectCSS: false`; rely on Tailwind + `@tailwindcss/typography` for styles (`prose` classes).
* Provide a basic toolbar suitable for non-technical admins.
* Persist both JSON and browser-generated HTML on save; render stored HTML when valid, falling back to the shared JSON renderer (derived from `extensionsList(profile)`) when necessary. Document that `@tiptap/html` is unavailable on Workers.
* Save via **HTMX** → **D1**.

---

## Assumptions

* Tailwind + `@tailwindcss/typography` available to style editor output.
* R2 bucket and D1 DB bindings configured in `wrangler`.
* Admin auth middleware already exists and is reusable.
* Latest **Tiptap v3** packages available in build.

---

## Artifacts

* Frontend: `src/frontend/editor/*.ts` (factory, init, configs).
* Styling: Tailwind CSS with typography.
* Hono routes (Workers):

  * `/admin/:slug/:id` (page with editor (can have multiple editors))
  * `/admin/upload-image` (POST; CSRF required)
  * `/admin/save-content` (POST, HTMX; CSRF required)
  * `/media/:key+` (GET from R2; nested keys allowed)
* Server renderer: helper to regenerate HTML from ProseMirror JSON as a fallback when stored HTML fails validation (Workers runtime cannot run `@tiptap/html`).

---

## Editor Architecture

* **Selector-based init**: `document.querySelectorAll('[data-editor]')`.
* **Factory**: `createEditor(element, profile)` where `profile ∈ {basic, full}`.
* **Mount**: `new Editor({ element, extensions, content, editorProps })`.
* Toolbar: Add a simple intuitive toolbar for non-technical admins.
* **Content in**: JSON provided via inline `<script type="application/json">` or data-attrs.
* **Content out**: `editor.getJSON()` (on save).
* **Parity**: single shared `extensionsList(profile)` module imported by both client and server rendering to prevent drift.

---

## Extensions

* **Base**: `StarterKit` (paragraph, heading, lists, code, link, etc.).
* **Full**: `StarterKit + Image` (optional `Placeholder`).
* Configure `Image` (optional `HTMLAttributes`).
* Keep input rules & keymaps from StarterKit.
* Use a shared module for extension configuration; no duplicate lists across client/server.

---

## Styling (Tailwind)

* Apply `prose` via `editorProps.attributes.class = 'prose max-w-none focus:outline-none'`.
* Set `injectCSS: false` (let Tailwind control styles).
* Uniform theme across all editor instances.

---

## Image Upload Flow

* UI: hidden `<input type="file" accept="image/*">` + trigger button.
* Client: POST `FormData(image)` to `/admin/upload-image` with `X-CSRF-Token` set (via `hx-headers` or global default). If a sibling `<input name="image_alt">` is present, include its value on insertion.
* Server:

  * Auth check.
  * Validate type/extension and size (≤ 5 MiB by default from `.dev.vars`, set `MEDIA_MAX_UPLOAD_BYTES=5242880`).
  * `R2.put(key, blob, { httpMetadata: { contentType: <file.mimetype> } })` → return JSON `{ url: "/media/<key>" }`.
* Client: `editor.chain().focus().setImage({ src: url }).run()`.
* Insert images with `{ src, alt }`, defaulting `alt: ""` if no input present.

---

## Persistence (HTMX + D1)

* Form with hidden `content_json` field; `hx-post="/admin/save-content"`.
* On submit: set hidden field with `JSON.stringify(editor.getJSON())`.
* Server:

  * Auth check.
  * Upsert JSON into D1 row (`TEXT` column).
  * Return success (optional HTMX swap snippet).

---

## SSR Rendering for End Users

* Prefer the HTML captured client-side at save time; validate before rendering (allowed tags/attributes, `/media/...` sources, no `data:` images).
* If stored HTML fails validation or is missing, regenerate from the saved ProseMirror JSON using the fallback renderer driven by `extensionsList(profile)`.
  * Document the Workers restriction that prevents using `@tiptap/html`; the fallback must stay in parity with the client schema and marks.
* Inject rendered HTML into a container with `class="prose"`.
* Defensive parse and validate JSON shape; if invalid, render a safe empty document (or return 404) without throwing.

---

## Routes (Hono)

* `GET /admin/:slug/:id` → SSR page with editor + script include.
* `POST /admin/upload-image` → R2 write, returns `{url}` (auth + CSRF required).
* `POST /admin/save-content` → D1 update (auth + CSRF required).
* `GET /media/:key+` → validate key against `^[A-Za-z0-9/_\-.]+$`; stream from R2 with immutable cache headers (ETag optional) and `X-Content-Type-Options: nosniff`.
* `HEAD /media/:key+` → return headers (including Content-Type, Cache-Control, ETag) without the body.
* (Public) `GET /:slug/:id` → render stored HTML when valid; otherwise regenerate from JSON via the fallback renderer.

---

## Security

* **Admin-only** guards on `/admin/*` and upload/save endpoints; expect 401 (unauth) vs 403 (forbidden) deterministically.
* Enforce **CSRF** on state-changing verbs using cookie `__Host-csrf` and headers `X-CSRF-Token`/`HX-CSRF-Token`, or form fields `csrf_token`/`_csrf`.
* Validate uploads (MIME and extension) and size (≤ 5 MiB).
* Public `GET /media/*` with long cache; optional ETag for revalidation.
* Do not inject raw HTML; render strictly from ProseMirror JSON via schema.
* Load the editor bundle via a manifest-aware resolver in both development and production; no hardcoded or fallback paths.
* Rate-limit state-changing admin endpoints (`/admin/upload-image`, `/admin/save-content`) with a simple token bucket per IP (and per user id if available); on exceed, return 429.
* For pages that render editor content, set CSP `img-src 'self'` (omit `data:`) to disallow external or inline image sources.
* Never eval/insert raw HTML from client; render via schema only.

---

## Testing (Key Cases)

* Editor mounts on SSR element; basic formatting works.
* Tailwind `prose` styles applied.
* Save → D1 contains valid JSON; reload restores content.
* Upload image → `/media/*` URL inserted and loads.
* Unauthorized access blocked for admin routes.
* Stored HTML remains in parity (it was produced by the editor); fallback renderer stays aligned with client extensions for drift detection.
* Large content performance acceptable; JSON size within limits.

---

## D3 Step Outline (suggested)

1. **Scaffold frontend** (`src/frontend/editor/…`), Vite entry & build wiring.
2. **Editor factory** (basic/full profiles), deferred init on `[data-editor]`.
3. **Tailwind integration** (`prose` class via `editorProps`).
4. **Initial content loader** (JSON injection; per-element pairing).
5. **Image upload UI + client handler** (CSRF header via HTMX).
6. **Upload route** (auth + CSRF) → R2 put with httpMetadata.contentType; `GET /media/:key+` with cache.
7. **Lifecycle refactor** (FormSync, HTMX hooks, MutationObserver cleanup) — placed after toolbar/upload; persistence depends on this.
8. **HTMX save flow** (auth + CSRF; hidden field, submit) → D1 persist.
9. **Server render helper** (fallback renderer derived from `extensionsList(profile)`) for public pages.
10. **Auth guards** on admin endpoints; validations.
11. **Smoke & integration tests** (mount, save, upload, render).

---

## Open Decisions (defaults if unspecified)

* Placeholder text (optional): `"Start writing…"` via `Placeholder` extension.
* Max file size for images (e.g., **5 MB**) & accepted types (`image/png|jpeg|webp`).
* Media key format in R2: `images/<timestamp>_<random>.<ext>`; public read via `/media/:key+`.
* Cache headers for media: `public, max-age=31536000, immutable`.

---

## Build & Gates

* **typecheck** → **test** (coverage ≥ 80%).
* Keep editor code tree **modular**; no framework runtime.

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
      - "Server renders hx-headers='{'X-CSRF-Token':'...'}' directly on the <form> using a token from the request context; no client JS reads cookies."
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

  - id: step-11
    title: Content typography & tokens
    rationale: Single source of truth for content styles.
    hints:
      - "Create `src/frontend/editor/ui/content.css` with Tailwind Typography under the namespaced root `.content-prose.prose`."
      - "Expose CSS vars `--editor-bg`, `--editor-border`, `--editor-focus` for editor chrome."
      - "Add helper `contentClass(): string` returning 'content-prose prose'."
      - "Ensure no global `.prose` selectors are emitted outside `.content-prose`."
    changes:
      - create: "src/frontend/editor/ui/content.css"
      - create: "src/frontend/editor/ui/content.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/frontend/editor/styles.ts"
    acceptance_criteria:
      - "Editor and SSR wrappers both use exactly `contentClass()`."
      - "h2/h3/p/ul/ol/blockquote/hr appear under a `.content-prose` ancestor."
      - "No standalone `.prose` rules outside the namespace in built CSS."
    tests:
      - path: "tests/ui/contentClass.spec.tsx"
        type: unit
        cases:
          - "SSR <Content> and <EditorContent> wrappers have equal className sets."
          - "Rendered h2/p nodes are descendants of `.content-prose`."
      - path: "tests/ui/contentCss.namespace.spec.ts"
        type: unit
        cases:
          - "`content.css`/built CSS contains `.content-prose.prose` and does not contain a top-level `.prose{` rule."
  - id: step-12
    title: Tiptap node: imageFigure
    rationale: Accessible image with controlled attrs.
    depends_on: ["step-11"]
    hints:
      - "File: `src/frontend/editor/extensions/imageFigure.ts`."
      - "Attrs: {src:string; alt:string; size:'s'|'m'|'l'|'xl'; align:'left'|'center'|'right'}."
      - "DOM: `<figure class='editor-figure editor-figure--size-{size} editor-figure--align-{align}'>` + `<img class='editor-image' alt> <figcaption class='editor-figcaption'>`."
      - "Commands clamp invalid values; parseHTML migrates bare <img> into figure and strips inline styles/classes."
      - "URL policy: allow `https:` and relative URLs; reject `javascript:` and `data:`."
    changes:
      - create: "src/frontend/editor/extensions/imageFigure.ts"
      - modify: "src/frontend/editor/factory.ts"
      - modify: "src/utils/editor/extensions.ts"
      - modify: "src/utils/editor/schemaSignature.ts"
      - modify: "src/utils/editor/render.ts"
    acceptance_criteria:
      - "Round-trip parse/serialize preserves attrs and caption content."
      - "Invalid size/align inputs clamp to size='m', align='center'."
      - "Reject unsupported URL schemes for `src`."
    tests:
      - path: "tests/editor/imageFigure.roundtrip.spec.ts"
        type: unit
      - path: "tests/editor/imageFigure.dom.spec.ts"
        type: unit
        cases:
          - "Classes `editor-figure`, `editor-image`, `editor-figcaption` exist; size/align classes match attrs."
      - path: "tests/editor/imageFigure.migration.spec.ts"
        type: unit
      - path: "tests/editor/imageFigure.commands.spec.ts"
        type: unit
        cases:
          - "setSize('xx') → 'm'; setAlign('weird') → 'center'."
          - "`src='javascript:alert(1)'` rejected/cleared; `src='https://…'` accepted."
  - id: step-13
    title: Toolbar shell (basic + writing)
    rationale: Fixed, responsive toolbar with reactive states.
    depends_on: ["step-12"]
    hints:
      - "File: `src/frontend/editor/ui/Toolbar.tsx`."
      - "Profiles: `basic` (H2/H3, paragraph, ol/ul, quote, br, hr) and `writing` (=basic + image)."
      - "Disabled/active use classes; buttons not removed from DOM."
      - "A11y: group via `role='group'` + `aria-labelledby`."
    changes:
      - create: "src/frontend/editor/ui/Toolbar.tsx"
      - modify: "src/frontend/editor/bootstrap.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/frontend/editor/styles.ts"
    acceptance_criteria:
      - "Image selected → text mark buttons have `.is-disabled`; image button enabled."
    tests:
      - path: "tests/editor/toolbar.profile.spec.tsx"
        type: unit
      - path: "tests/editor/toolbar.state.spec.tsx"
        type: unit
  - id: step-14
    title: Image action sub-panel
    rationale: Contextual controls; no remount churn.
    depends_on: ["step-13"]
    hints:
      - "File: `src/frontend/editor/ui/ImagePanel.tsx` (sibling to toolbar)."
      - "Visibility toggled on selectionUpdate via `hidden`/class; the node stays mounted."
      - "Controls: presets 33.33/50/75/100 → size s/m/l/xl; align L/C/R; alt input (empty allowed); inline caption."
      - "Dismiss on outside click and `Esc`."
    changes:
      - create: "src/frontend/editor/ui/ImagePanel.tsx"
      - modify: "src/frontend/editor/ui/Toolbar.tsx"
      - modify: "src/frontend/editor/styles.ts"
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/frontend/editor/bootstrap.ts"
    acceptance_criteria:
      - "Panel visible only with imageFigure selection; actions update attrs immediately."
    tests:
      - path: "tests/editor/imagePanel.visibility.spec.tsx"
        type: unit
      - path: "tests/editor/imagePanel.actions.spec.tsx"
        type: unit
      - path: "tests/editor/imagePanel.keyboard.spec.tsx"
        type: unit
  - id: step-15
    title: Flow layout & grids (CSS grid)
    rationale: Text flow and simple image grids without floats.
    depends_on: ["step-14"]
    hints:
      - "Define component classes in `content.css` (`@layer components`)."
      - "`.editor-figure--align-left|center|right` implemented with grid/justify utilities."
      - "`.editor-figure-grid-2` and `-3` utilities (stack under `sm`)."
      - "`.editor-figcaption` width tracks image block; no overflow."
    changes:
      - modify: "src/frontend/editor/ui/content.css"
      - modify: "src/frontend/editor/extensions/imageFigure.ts"
    acceptance_criteria:
      - "Markup carries alignment/grid classes; captions remain within figure."
    tests:
      - path: "tests/editor/imageFigure.align.spec.ts"
        type: unit
      - path: "tests/ui/imageGrid.classes.spec.ts"
        type: unit
        cases:
          - "`content.css` contains selectors `.editor-figure-grid-2` and `.editor-figure-grid-3`."
  - id: step-16
    title: WYSIWYG parity (class-level)
    rationale: Same classes and key elements between Editor and SSR.
    depends_on: ["step-15"]
    hints:
      - "Fixture: h2 + p + imageFigure(with caption)."
      - "Render via editor preview wrapper and SSR `<Content>`."
      - "Compare class sets and element names for wrapper and figure subtree."
    changes:
      - modify: "src/templates/admin/editorPage.tsx"
      - modify: "src/frontend/editor/ui/Toolbar.tsx"
      - modify: "src/frontend/editor/ui/ImagePanel.tsx"
      - modify: "src/frontend/editor/ui/content.ts"
    acceptance_criteria:
      - "Wrapper and figure subtree have equal class sets and matching tag names (figure/img/figcaption)."
    tests:
      - path: "tests/parity/classParity.spec.tsx"
        type: unit
  - id: step-17
    title: Accessibility essentials
    rationale: Minimal semantics enforced cheaply.
    depends_on: ["step-16"]
    hints:
      - "Ensure one `<figcaption>` inside each `<figure>`; `<img>` always has `alt` (empty allowed)."
      - "Toolbar sections labelled and grouped."
    changes:
      - modify: "src/frontend/editor/ui/Toolbar.tsx"
      - modify: "src/frontend/editor/ui/ImagePanel.tsx"
      - modify: "src/frontend/editor/extensions/imageFigure.ts"
    acceptance_criteria:
      - "DOM contains expected roles and relations."
    tests:
      - path: "tests/a11y/semantics.spec.tsx"
        type: unit
        cases:
          - "figure→figcaption relation exists; img has `alt` (including empty)."
          - "Toolbar sections expose `role='group'` with labelled headings."



---

## Overview (Human Context)

Authoritative spec: the YAML frontmatter above. The prose below provides context and guidance for reviewers and contributors.

Implement a WYSIWYG rich text editor using Tiptap in a Cloudflare Workers environment with Hono, D1, and R2. The editor should support server-side rendering (SSR) with HTMX for dynamic interactions without a frontend framework.

- id: step-01
  title: Content typography & tokens
  rationale: Single source of truth for content styles.
  hints:
  - "Create `src/ui/content.css` with Tailwind Typography under the namespaced root `.content-prose.prose`."
  - "Expose CSS vars `--editor-bg`, `--editor-border`, `--editor-focus` for editor chrome."
  - "Add helper `contentClass(): string` returning 'content-prose prose'."
  - "Ensure no global `.prose` selectors are emitted outside `.content-prose`."
  acceptance_criteria:
  - "Editor and SSR wrappers both use exactly `contentClass()`."
  - "h2/h3/p/ul/ol/blockquote/hr appear under a `.content-prose` ancestor."
  - "No standalone `.prose` rules outside the namespace in built CSS."
  tests:
  - name: content-class-parity
      file: tests/ui/contentClass.spec.tsx
      asserts:
    - "SSR <Content> and <EditorContent> wrappers have equal className sets."
    - "Rendered h2/p nodes are descendants of `.content-prose`."
  - name: no-global-prose
      file: tests/ui/contentCss.namespace.spec.ts
      asserts:
    - "`content.css`/built CSS contains `.content-prose.prose` and does not contain a top-level `.prose{` rule."

- id: step-02
  title: Tiptap node: imageFigure
  rationale: Accessible image with controlled attrs.
  depends_on: ["step-01"]
  hints:
  - "File: `src/editor/extensions/imageFigure.ts`."
  - "Attrs: {src:string; alt:string; size:'s'|'m'|'l'|'xl'; align:'left'|'center'|'right'}."
  - "DOM: `<figure class='editor-figure editor-figure--size-{size} editor-figure--align-{align}'>` + `<img class='editor-image' alt> <figcaption class='editor-figcaption'>`."
  - "Commands clamp invalid values; parseHTML migrates bare <img> into figure and strips inline styles/classes."
  - "URL policy: allow `https:` and relative URLs; reject `javascript:` and `data:`."
  acceptance_criteria:
  - "Round-trip parse/serialize preserves attrs and caption content."
  - "Invalid size/align inputs clamp to size='m', align='center'."
  - "Reject unsupported URL schemes for `src`."
  tests:
  - name: roundtrip-attrs
      file: tests/editor/imageFigure.roundtrip.spec.ts
  - name: dom-classing
      file: tests/editor/imageFigure.dom.spec.ts
      asserts:
    - "Classes `editor-figure`, `editor-image`, `editor-figcaption` exist; size/align classes match attrs."
  - name: migrate-bare-img
      file: tests/editor/imageFigure.migration.spec.ts
  - name: commands-clamp-and-url
      file: tests/editor/imageFigure.commands.spec.ts
      asserts:
    - "setSize('xx') → 'm'; setAlign('weird') → 'center'."
    - "`src='javascript:alert(1)'` rejected/cleared; `src='https://…'` accepted."

- id: step-03
  title: Toolbar shell (basic + writing)
  rationale: Fixed, responsive toolbar with reactive states.
  depends_on: ["step-02"]
  hints:
  - "File: `src/editor/ui/Toolbar.tsx`."
  - "Profiles: `basic` (H2/H3, paragraph, ol/ul, quote, br, hr) and `writing` (=basic + image)."
  - "Disabled/active use classes; buttons not removed from DOM."
  - "A11y: group via `role='group'` + `aria-labelledby`."
  acceptance_criteria:
  - "Image selected → text mark buttons have `.is-disabled`; image button enabled."
  tests:
  - name: profile-controls
      file: tests/editor/toolbar.profile.spec.tsx
  - name: state-reactivity
      file: tests/editor/toolbar.state.spec.tsx

- id: step-04
  title: Image action sub-panel
  rationale: Contextual controls; no remount churn.
  depends_on: ["step-03"]
  hints:
  - "File: `src/editor/ui/ImagePanel.tsx` (sibling to toolbar)."
  - "Visibility toggled on selectionUpdate via `hidden`/class; the node stays mounted."
  - "Controls: presets 33.33/50/75/100 → size s/m/l/xl; align L/C/R; alt input (empty allowed); inline caption."
  - "Dismiss on outside click and `Esc`."
  acceptance_criteria:
  - "Panel visible only with imageFigure selection; actions update attrs immediately."
  tests:
  - name: visibility-guard
      file: tests/editor/imagePanel.visibility.spec.tsx
  - name: preset-mapping
      file: tests/editor/imagePanel.actions.spec.tsx
  - name: esc-dismiss
      file: tests/editor/imagePanel.keyboard.spec.tsx

- id: step-05
  title: Flow layout & grids (CSS grid)
  rationale: Text flow and simple image grids without floats.
  depends_on: ["step-04"]
  hints:
  - "Define component classes in `content.css` (`@layer components`)."
  - "`.editor-figure--align-left|center|right` implemented with grid/justify utilities."
  - "`.editor-figure-grid-2` and `-3` utilities (stack under `sm`)."
  - "`.editor-figcaption` width tracks image block; no overflow."
  acceptance_criteria:
  - "Markup carries alignment/grid classes; captions remain within figure."
  tests:
  - name: align-class-parity
      file: tests/editor/imageFigure.align.spec.ts
  - name: grid-component-classes-present
      file: tests/ui/imageGrid.classes.spec.ts
      asserts:
    - "`content.css` contains selectors `.editor-figure-grid-2` and `.editor-figure-grid-3`."

- id: step-06
  title: WYSIWYG parity (class-level)
  rationale: Same classes and key elements between Editor and SSR.
  depends_on: ["step-05"]
  hints:
  - "Fixture: h2 + p + imageFigure(with caption)."
  - "Render via editor preview wrapper and SSR `<Content>`."
  - "Compare class sets and element names for wrapper and figure subtree."
  acceptance_criteria:
  - "Wrapper and figure subtree have equal class sets and matching tag names (figure/img/figcaption)."
  tests:
  - name: class-parity-editor-vs-ssr
      file: tests/parity/classParity.spec.tsx

- id: step-07
  title: Accessibility essentials
  rationale: Minimal semantics enforced cheaply.
  depends_on: ["step-06"]
  hints:
  - "Ensure one `<figcaption>` inside each `<figure>`; `<img>` always has `alt` (empty allowed)."
  - "Toolbar sections labelled and grouped."
  acceptance_criteria:
  - "DOM contains expected roles and relations."
  tests:
  - name: semantics-present
      file: tests/a11y/semantics.spec.tsx
      asserts:
    - "figure→figcaption relation exists; img has `alt` (including empty)."
    - "Toolbar sections expose `role='group'` with labelled headings."

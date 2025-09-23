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
  - "Render content from ProseMirror JSON using generateHTML on the server; keep extensions in sync via a shared extensionsList(profile)."
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
    changes:
      - create: "src/frontend/editor/content.ts"
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
      - "Attach a submit listener that injects `editor.getJSON()` into a hidden `content_json` input."
      - "Emit HTMX-friendly responses for partial swaps."
      - "Server renders hx-headers='{"X-CSRF-Token":"..."}' directly on the <form> using a token from the request context; no client JS reads cookies."
      - "Support multiple editors in a single <form>: serialize each editor into a hidden input named `content_json[<root-id>]` using the editor container's `id`."
    changes:
      - modify: "src/frontend/editor/bootstrap.ts"
      - create: "src/frontend/editor/form.ts"
      - modify: "src/templates/admin/editorPage.tsx"
    acceptance_criteria:
      - "Hidden inputs are kept in sync with editor JSON before each HTMX submission."
      - "Forms without matching editors do not throw and still submit."
      - "Forms include server-rendered hx-headers with `X-CSRF-Token`; client JS does not access cookies to obtain the token."
      - "If a form contains multiple editors, each is serialized into a distinct hidden input keyed by its container id (no overwrites)."
    tests:
      - path: "tests/frontend/editor/form.test.ts"
        type: unit
        cases:
          - "serializes editor state into hidden input before submit"
          - "ignores forms with no registered editor"
          - "renders hx-headers with `X-CSRF-Token`; client JS does not read cookies"
          - "serializes multiple editors to content_json[<id>] fields deterministically"
  - id: step-06
    title: Implement image upload tooling
    rationale: Provide client toolbar actions and secure backend routes for image uploads and delivery.
    depends_on: ["step-05"]
    hints:
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
    depends_on: ["step-06"]
    hints:
      - "Add a migration that creates an `editor_documents` table with slug, document_id, profile, content_json, and updated_at columns."
      - "Use parameterized statements for inserts/updates and return an HTMX-friendly JSON payload."
      - "Require CSRF token validation via header (`X-CSRF-Token` or `HX-CSRF-Token`) or form field (`csrf_token`/`_csrf`) consistent with middleware."
      - "Add Origin/Host verification middleware for POST requests (upload/save). Reject when Origin/Host do not match configured origin; respond 403."
      - "Validate `content_json` against a minimal schema: doc type + array content + allowed node types (paragraph, heading, list, image, etc.); violations return 422."
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
      - "`POST /admin/save-content` requires admin auth and upserts ProseMirror JSON into D1."
      - "CSRF: requests must include a valid `X-CSRF-Token` (double-submit: token + `__Host-csrf` cookie) or an equivalent server-rendered token; otherwise 403."
      - "Auth: unauthenticated → 401 (or redirect for HTML), authenticated non-admin → 403."
      - "Migration adds the editor_documents table with a composite primary key across slug and document_id."
      - "Successful saves respond with `{ ok: true, contentId }` or an HTMX fragment confirming persistence."
      - "State-changing endpoints verify request Origin/Host against AUTH_TRUSTED_ORIGINS; mismatches return 403."
      - "Malformed/invalid `content_json` (fails minimal shape validation) returns 422 Unprocessable Entity."
      - "Reject `content_json` payloads over CONTENT_MAX_BYTES (default 256 KiB) with 413 Payload Too Large."
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
      - "Use `generateHTML` with the same extensions list used on the client."
      - "Wrap rendered HTML in a container with the `prose` class."
      - "Return 404 when a document is missing."
      - "Defensive parse JSON: ensure `type: doc` and expected shape; on corrupt or invalid payload, render a safe empty document without throwing (or return 404)."
      - "Use `@tiptap/html` for rendering; do not enable HTML/RawHTML extension anywhere."
    changes:
      - create: "src/utils/editor/render.ts"
      - modify: "src/routes/content.tsx"
      - modify: "src/models/editorDocuments.ts"
    acceptance_criteria:
      - "Stored ProseMirror JSON renders to sanitized HTML with Tailwind prose styling."
      - "Public content route fetches from D1 and returns 404 when no document exists."
      - "Invalid/corrupt JSON is caught; logs a structured warning with document identifiers and renders a safe empty document (or 404 as configured)."
      - "Renderer only emits images whose `src` matches `/^\\/media\\/[A-Za-z0-9/_\\-.]+$/`."
      - "Rendered HTML never includes <img> with external origins or data: URLs."
    tests:
      - path: "tests/routes/content-render.test.ts"
        type: integration
        cases:
          - "renders stored document HTML"
          - "returns 404 for missing documents"
          - "corrupt JSON payload renders safe empty output (no exception)"
          - "invalid shape logs warning and renders safe empty output"
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
* Render content from ProseMirror JSON using `generateHTML` on the server; keep client and server extensions in sync via a shared `extensionsList(profile)`.
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
* Server renderer: helper to **generate HTML** from ProseMirror JSON.

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

* Server-side convert JSON → HTML:

  * `generateHTML(contentJSON, [StarterKit, Image])`.
* Inject into page wrapped with `class="prose"`.
* Use the same shared `extensionsList(profile)` used on the client.
* Defensive parse and validate JSON shape; if invalid, render a safe empty document (or return 404) without throwing.

---

## Routes (Hono)

* `GET /admin/:slug/:id` → SSR page with editor + script include.
* `POST /admin/upload-image` → R2 write, returns `{url}` (auth + CSRF required).
* `POST /admin/save-content` → D1 update (auth + CSRF required).
* `GET /media/:key+` → validate key against `^[A-Za-z0-9/_\-.]+$`; stream from R2 with immutable cache headers (ETag optional) and `X-Content-Type-Options: nosniff`.
* `HEAD /media/:key+` → return headers (including Content-Type, Cache-Control, ETag) without the body.
* (Public) `GET /:slug/:id` → render JSON to HTML via `generateHTML`.

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
* Server `generateHTML` renders expected HTML (parity with editor).
* Large content performance acceptable; JSON size within limits.

---

## D3 Step Outline (suggested)

1. **Scaffold frontend** (`src/frontend/editor/…`), Vite entry & build wiring.
2. **Editor factory** (basic/full profiles), deferred init on `[data-editor]`.
3. **Tailwind integration** (`prose` class via `editorProps`).
4. **Initial content loader** (JSON injection; per-element pairing).
5. **Image upload UI + client handler** (CSRF header via HTMX).
6. **Upload route** (auth + CSRF) → R2 put with httpMetadata.contentType; `GET /media/:key+` with cache.
7. **HTMX save flow** (auth + CSRF; hidden field, submit) → D1 persist.
8. **Server render helper** (`generateHTML`) for public pages.
9. **Auth guards** on admin endpoints; validations.
10. **Smoke & integration tests** (mount, save, upload, render).

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

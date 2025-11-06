---
feature_id: page-admin-dashboard
title: Admin Dashboard Template
allowed_paths:
  - src/
  - tests/
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
  - "Routes template has been implemented"
  - SSR only (no client-side frameworks) using Hono + HTMX + Tiptap.
  - Preview routes must be identical to public routes except reading from preview snapshots (`status='preview'`).
assumptions:
  - RequireAdmin and other auth middlewares are available from the existing auth implementation.
  - Environment variables for database and Tiptap editor are correctly configured via .dev.vars and secrets.
  - Tailwind v4 and shared Editor styles are available in the project.
  - Admin Dashboard is the only supported templates for this iteration.
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
    title: Scaffold Admin Dashboard layout and HTMX navigation
    rationale: Create a dedicated admin layout (independent from public layout) based on the reference sidebar template, and wire HTMX-powered navigation to swap panel content into the main area. This establishes the foundation for admin pages without implementing actual forms.
    depends_on: []
    hints:
      - Protect all admin dashboard routes with requireAuth() and requireAdmin.
      - Base markup and classes on src/templates/references/sidebar-layout.html; do not introduce new CSS assets.
      - Create an AdminLayout component with a content slot element id="admin-content" and data-admin-content for HTMX targets.
      - "Sidebar items (exact order): Home, About-us, Activities, Events, Settings. Display labels as written; route slugs use {home, about-us, activities, events, settings}."
      - Use hx-get and hx-target="#admin-content" on sidebar links; also set hx-swap="innerHTML" and hx-push-url="true".
      - Provide panel routes that return placeholder fragments for HTMX requests and render full AdminLayout for full-page requests.
      - Default panel for GET /admin/dashboard is Home.
    changes:
      - create: src/templates/admin/layout.tsx
      - create: src/routes/admin/dashboard.tsx
      - modify: src/routes/index.ts
      - create: tests/pages/adminDashboardTemplate.test.ts
    acceptance_criteria:
      - Unauthorized behavior:
        - Full-page GET to /admin/dashboard and /admin/dashboard/:panel returns 302 redirect to /login.
        - "HTMX GET (HX-Request: true) to the same routes returns 401 and sets HX-Redirect: /login."
      - New layout:
        - Admin pages use AdminLayout (not src/templates/layout.tsx).
        - Layout includes left sidebar and main content area consistent with the reference; markup contains a wrapper with class "lg:pl-72".
        - Main content slot element exists with id="admin-content" and data-admin-content.
      - Sidebar navigation:
        - "Sidebar includes exactly five items in order: Home, About-us, Activities, Events, Settings."
        - Each sidebar link includes hx-get="/admin/dashboard/{panel}", hx-target="#admin-content", hx-swap="innerHTML", and hx-push-url="true".
      - Panel routes:
        - GET /admin/dashboard renders AdminLayout with the Home panel placeholder in the content slot.
        - "GET /admin/dashboard/{panel} where panel ∈ {home, about-us, activities, events, settings} returns:"
          - "For HTMX: a minimal fragment with attribute data-panel=\"{panel}\" (no full layout)."
          - "For full-page: AdminLayout with that panel placeholder rendered in the content slot."
      - Markup parity:
        - Output uses Tailwind classes from the reference and does not introduce public layout classes or new CSS assets.
    tests:
      - path: tests/pages/adminDashboardTemplate.test.ts
        type: integration
        cases:
          - Unauthorized full-page GET /admin/dashboard returns 302 redirect to /login
          - "Unauthorized HTMX GET /admin/dashboard returns 401 with HX-Redirect: /login"
          - GET /admin/dashboard renders AdminLayout with data-admin-content and contains class lg:pl-72
          - Sidebar shows items [Home, About-us, Activities, Events, Settings] in order with hx-get/hx-target/hx-swap/hx-push-url attributes
          - HTMX GET /admin/dashboard/{panel} returns fragment containing data-panel="{panel}"
      - Full-page GET /admin/dashboard/activities returns AdminLayout including data-panel="activities" in the content slot

  - id: step-02
    title: "Home panel: preview-or-edit with HTMX toggle"
    rationale: Implement functional Home panel content. When a saved Home page exists, show a simple preview placeholder; otherwise, show the Home edit form. Provide an in-panel banner to toggle between preview and form using HTMX swaps without leaving the dashboard. Do not depend on existing landing/public templates — those are being superseded.
    depends_on:
      - step-01
    hints:
      - Detection only; no public template rendering:
        - Provide a pluggable check via `src/routes/admin/home.data.ts` exporting `homeExists(env): Promise<boolean>` that returns false by default. Do not import old page repos or landing templates.
      - "Add explicit routes in `src/routes/admin/dashboard.tsx` (before `/:panel`):"
        - `GET /admin/dashboard/home` → default view: preview if preview data exists, else form.
        - `GET /admin/dashboard/home/preview` → returns preview fragment (HTMX) or full AdminLayout when not HTMX.
        - `GET /admin/dashboard/home/edit` → returns form fragment (HTMX) or full AdminLayout when not HTMX.
      - Build a Home form component using Tailwind classes from `src/templates/references/form-2-column-w-cards.html` (no new CSS):
        - Card 1 (hero-section): Title (text), Background image (text key), Short intro (Basic Editor).
        - Card 2 (generic content): Rich text editor with image support using `EditorInstance` and hidden `content_json[...]` and `content_html[...]` inputs.
        - Card 3: Activities placeholder card with descriptive text only.
        - Card 4: Events placeholder card with descriptive text only.
      - Place a top banner inside the Home panel with two controls: “Preview” and “Edit form”. These should be `<a>` or `<button>` elements with `hx-get` to the routes above, `hx-target="#admin-content"`, `hx-swap="innerHTML"`, and `hx-push-url="true"`.
      - Keep scope read-only; no POST/save handling in this step.
    changes:
      - create: src/templates/admin/dashboard/homeForm.tsx
      - create: src/routes/admin/home.data.ts
      - modify: src/routes/admin/dashboard.tsx
      - create: tests/pages/adminDashboardHome.test.ts
    acceptance_criteria:
      - Default rendering:
        - If `homeExists` returns false: `GET /admin/dashboard/home` renders the Home form within the AdminLayout content slot.
        - If `homeExists` returns true: `GET /admin/dashboard/home` renders a Home preview placeholder within the AdminLayout content slot. No public/landing templates are imported or used.
      - Banner toggle:
        - The Home panel contains a banner element with `data-home-banner` and `data-mode="preview"|"edit"` reflecting the current view.
        - Banner includes “Preview” and “Edit form” controls with `hx-get` to `/admin/dashboard/home/preview` and `/admin/dashboard/home/edit`, and `hx-target="#admin-content"`, `hx-swap="innerHTML"`, `hx-push-url="true"`.
        - `GET /admin/dashboard/home/preview` with `HX-Request: true` returns an HTML fragment containing `data-panel="home"` and `data-mode="preview"` (and `data-has-data="true"` when a preview snapshot is present) without the full layout wrapper.
        - `GET /admin/dashboard/home/edit` with `HX-Request: true` returns an HTML fragment containing `data-panel="home"` and `data-mode="edit"` and the form markup, without the full layout wrapper.
      - Form structure:
        - The form root has `data-home-form` and uses a two-column layout with classes including `md:grid-cols-3` and card wrapper classes like `sm:rounded-xl` and `shadow-xs` from the reference.
        - Hero section contains fields named `title`, `hero_image_key`, and `intro`.
        - Generic content card renders an `EditorInstance` with data attributes for hidden fields and names `content_json[home_body]` and `content_html[home_body]`.
        - Activities and Events placeholder cards render headings and helper text; no inputs are required in this step.
      - Full-page fallbacks:
        - Non-HTMX `GET /admin/dashboard/home/preview` and `/admin/dashboard/home/edit` render the AdminLayout with the corresponding view inside `#admin-content`.
      - Auth:
        - All routes remain protected with `requireAuth()` and `requireAdmin` (same semantics as step-01).
    tests:
      - path: tests/pages/adminDashboardHome.test.ts
        type: integration
        cases:
          - when_no_preview_exists_renders_form:
            - Mock auth middlewares to pass
            - Do not mock provider (default `homeExists` returns false)
            - GET /admin/dashboard/home → 200 with `data-admin-content` and `data-home-form`
          - when_preview_exists_renders_preview:
            - Mock `homeExists` to return true
            - GET /admin/dashboard/home → 200, contains `data-admin-content`, `data-panel="home"`, `data-mode="preview"`, and `data-has-data="true"` (no landing/public template markers)
          - toggle_to_edit_form_via_htmx:
            - Mock `homeExists` true, then GET /admin/dashboard/home/preview with HX-Request: true → 200, fragment includes `data-mode="preview"`
            - GET /admin/dashboard/home/edit with HX-Request: true → 200, fragment includes `data-mode="edit"` and `data-home-form`
          - banner_controls_have_htmx_attrs:
            - GET /admin/dashboard/home (authorized) → buttons/links contain hx-get to /admin/dashboard/home/preview and /admin/dashboard/home/edit with hx-target="#admin-content", hx-swap="innerHTML", hx-push-url="true"
          - form_contains_required_sections_and_fields:
            - GET /admin/dashboard/home/edit with HX-Request: true (authorized) → contains fields name="title", name="hero_image_key", name="intro" and editor hidden inputs for content_json[home_body] and content_html[home_body]; includes placeholder cards for activities and events



---

## Overview (Human Context)

This specification defines the Admin dashboard template and layout

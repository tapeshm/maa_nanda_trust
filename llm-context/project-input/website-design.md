---
feature_id: pages
title: Iterative website design
allowed_paths:
  - src/
  - tests/
language: TypeScript, HTML
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
assumptions:
  - This is an iterative design for the website. We work with html files to iterate and finalize the website experience and design.
  - Tailwind v4 and shared Editor styles are available in the project.
steps:
  - id: step-01
    title: Wireframe landing page with a plain html file for quick design iteration
    rationale: This step require setting up a quick and easy html file rendering to allow fast design iterations. This does not require any database or full application components. The primary purpose of this step is to iterate on website design and experience through a plain html file.
    depends_on: []
    hints:
      - Bypass the current implementation to directly render an html file for the landing page. A simple comment-out of application logic and plug in direct html rendering. Add a comment to change back to application logic later.
      - Do not create or modify any application logic. Just a quick reversible change to render a static html file.
      - Wireframe the updated design spec while keeping the original door + scroll experience: desktop top nav, mobile hamburger, menu links (About Us, Projects, Events, Transparency), floating Donate CTA (styled as donation box/coin), hero with subtle context image and door overlay, H2 "Rajrajeshwari Mandir" immediately below the hero, intro tagline, project cards with thumbnails and read-more links, events shown as postal-envelope invitation cards, scroll-inspired content background, and a footer.
    changes:
      - create: src/template/layout-iter.tsx
      - modify: src/routes/public/pages.ts
      - create: src/templates/references/landing-iter.html
    acceptance_criteria:
      - The landing page renders the static html file landing-iter.html with the navigation, hero + H2, intro tagline, projects cards, envelope-styled events cards, floating Donate CTA styled as donation box/coin, scroll manuscript feel, and footer matching the updated design spec.
    tests:
      - path: tests/pages/landing-iter.spec.ts
        type: integration
        cases:
          - "Landing serves static landing-iter.html with nav, hero + H2, Donate CTA (box/coin), projects cards, events cards, and scroll styling"
  - id: step-02
    title: Website experience concept
    rationale: Set the website experience concept. In this step we iterate on the user experience concept. Layout different concepts. View them on development server and iterate based on user feedback and design ideas.
    depends_on:
      - step-01
    hints:
      - Keep the design modular and parameterized for iteration; annotate the reference HTML with comments naming each section (door overlay, nav, hero, tagline, projects list, events list, scroll content, footer).
      - Use Tailwind utilities as the primary styling tool; add minimal custom CSS only for postal-envelope edges, door hinges, and the donation coin animation.
      - Minimize image usage; keep thumbnails small and use trustee headshots where needed.
      - Apply the structured content plan while preserving the door/scroll design: top nav (bells aesthetic) with links (About Us, Projects, Events, Transparency), mobile hamburger/scroll rod variant, floating Donate button styled as a donation box/coin, hero with subtle context image and H2 "Rajrajeshwari Mandir" beneath it, intro tagline, project cards (thumbnail, title, short description, read more to project ID page), events cards styled as invitation envelopes (date, location, event name, one-line description, link), scroll manuscript background, and footer.
      - Design ideas to retain: full-screen temple door that opens with smooth natural effect on load and via toggle; navigation styled as hanging temple bells; content on traditional scroll-like background (textured, high contrast, brass rods/cords); donation CTA as a brass donation box with coin drop/sound; door open/close toggle bottom-right; mobile hamburger styled as scroll rod that rolls out links.
    changes:
      - modify: src/templates/references/landing-iter.html
    acceptance_criteria:
      - The landing reference HTML reflects the updated page structure and preserves the temple-door/scroll design: navigation (bells style), hero with door overlay and H2 heading, intro tagline, projects cards with thumbnails/read-more links, envelope-styled events cards with date/location/name/description link, floating donation box CTA with coin effect, scroll manuscript background, footer, and a door toggle.
    tests:
      - path: tests/pages/landing-iter.design.test.ts
        type: integration
        cases:
          - "Nav links, floating donation box CTA, door toggle, and footer are present on the reference HTML"
          - "Hero with door overlay followed by H2 'Rajrajeshwari Mandir' is rendered"
          - "Projects and events cards follow the specified card structures on scroll-textured background"
  - id: step-03
    title: Extract generic public layout + components (Tailwind SSR)
    rationale: Convert the stabilized reference HTML into generic, reusable SSR templates for all public pages (not just landing) and align markup with Tailwind v4 utilities for maintainability and consistency.
    depends_on:
      - step-02
    hints:
      - Prefer small, focused SSR JSX components composed by a generic `PublicLayout` used across public routes.
      - Replace bespoke CSS with Tailwind v4 utilities; keep only scoped CSS for envelope edges or subtle accents.
      - Keep behaviors progressive and minimal: mobile hamburger toggle, floating Donate CTA, and menu focus handling via lightweight inline script/HTMX hooks.
      - Insert D3 anchors in new/modified files for traceability (e.g., // [D3:pages.step-03:layout], // [D3:pages.step-03:nav]).
      - Maintain accessibility: aria-labels, focus-visible styles, and scroll margin to avoid nav overlap.
    changes:
      - create: src/templates/public/layout/PublicLayout.tsx
      - create: src/templates/public/layout/PublicTopNav.tsx
      - create: src/templates/public/layout/PublicMobileMenu.tsx
      - create: src/templates/public/layout/PublicDoorToggle.tsx
      - create: src/templates/public/layout/DonateFloatingButton.tsx
      - create: src/templates/public/layout/PublicFooter.tsx
      - create: src/templates/public/blocks/Hero.tsx
      - create: src/templates/public/blocks/ScrollManuscript.tsx
      - create: src/templates/public/blocks/Introduction.tsx
      - create: src/templates/public/blocks/ProjectsList.tsx
      - create: src/templates/public/blocks/EventsEnvelopeCard.tsx
      - create: src/templates/public/blocks/ProjectStats.tsx
      - create: src/templates/public/blocks/TrusteesGrid.tsx
      - create: src/templates/public/blocks/FocusAreas.tsx
      - create: src/templates/public/effects/TempleDoor.tsx
      - create: src/templates/public/blocks/DonationCta.tsx
      - create: src/templates/public/pages/landing.tsx
      - create: src/templates/public/pages/about.tsx
      - create: src/templates/public/pages/projects.tsx
      - create: src/templates/public/pages/projectDetail.tsx
      - create: src/templates/public/pages/events.tsx
      - create: src/templates/public/pages/transparency.tsx
      - modify: src/routes/public/pages.ts
      - note: Do not delete src/templates/references/landing-iter.html; keep as design reference.
    acceptance_criteria:
      - A generic `PublicLayout` composes `PublicTopNav`, `PublicMobileMenu`, floating Donate CTA, and `PublicFooter`, and is used by public pages.
      - Desktop nav remains fixed at top with scroll offset; mobile hamburger defaults closed and toggles open/closed with focus-visible styles.
      - Landing page uses `PublicLayout` with `TempleDoor` overlay (initially closed/opening on load with toggle), bell-styled nav, hero (optional background image) followed by H2 "Rajrajeshwari Mandir", scroll-manuscript content wrapper, intro tagline, projects cards (thumbnail, title, short description, read-more link to project ID), events cards styled as postal/invitation envelopes showing date, location, event name, one-line description, and link, floating donation box CTA (coin animation/chime) linking to /donate, and footer.
      - About page renders overview text, focus areas list, and trustees grid with images/names/bios within scroll layout, plus a CTA to Transparency; no door overlay.
      - Projects page lists project cards identical to landing projects section; project detail template renders header (name/location), description, structured stats (location, start date, status, target end date, budget vs spent so far), and team contact section; uses scroll background.
      - Events page renders invitation-style cards with event name, location, status (upcoming/completed), and contact person within scroll layout.
      - Transparency page renders structured regulatory data (trust name, registration number/date, property details) and download links for regulatory documents within scroll layout.
      - Tailwind utilities replace general layout/spacing/typography; remaining CSS is minimal and scoped (door keyframes, coin animation, envelope edges).
      - Type-check, lint, format pass; tests for layout reuse and interactions are added and passing.
    tests:
      - path: tests/pages/publicLayout.ssr.test.ts
        type: integration
        cases:
          - "PublicLayout renders top nav (bells), mobile hamburger, floating donation box CTA, and footer"
          - "Content area is offset below fixed nav on scroll"
      - path: tests/pages/landing.ssr.test.ts
        type: integration
        cases:
          - "Landing renders hero with door overlay, H2 heading, intro, projects list with read-more links, and events envelope cards on scroll background"
          - "Mobile menu is hidden by default and toggles visible"
          - "Door overlay initial state is closed and can toggle open"
          - "Donation box CTA floats and links to /donate"
      - path: tests/pages/about.ssr.test.ts
        type: integration
        cases:
          - "About renders overview, focus areas, and trustees grid with images"
          - "Navigation present and content does not overlap on scroll"
          - "CTA links to transparency page"
      - path: tests/pages/projects.ssr.test.ts
        type: integration
        cases:
          - "Projects page renders list of project cards with thumbnails and read-more links"
          - "Project detail template renders description, stats, and team contacts"
      - path: tests/pages/events.ssr.test.ts
        type: integration
        cases:
          - "Events page shows invitation-style cards with status and contact person"
      - path: tests/pages/transparency.ssr.test.ts
        type: integration
        cases:
          - "Transparency page renders structured compliance data and download links"
      - path: tests/pages/accessibility.test.ts
        type: unit
        cases:
          - "Nav, hamburger, and Donate CTA expose aria-labels and focus-visible styles"
          - "Door toggle is keyboard operable with aria-label"
  - id: step-04
    title: Admin dashboard plan for Home, About, Projects, Events, Transparency
    rationale: Capture a high-level, non-technical admin experience to manage global layout settings and page content for public pages, balancing customization with simplicity. This is a planning step only; no implementation yet.
    depends_on:
      - step-03
    hints:
      - Global settings (shared): themeColor, googleFontsHref, skipLinkText, footerText, nav links (About Us, Projects, Events, Transparency), floating Donate CTA toggle, donateHref, donateLabel.
      - Home (page) content: hero (background image key or gradient, heading, subheading/tagline), H2 "Rajrajeshwari Mandir" text, intro body, projects list items (id, title, short description, thumbnail, read-more href), events list items (date, location, title, one-line description, link), page metadata, temple door enabled flag/timing, scroll texture toggle.
      - About (page) content: overview text, focus areas list (label + description), trustees grid (image key, name, short bio), CTA link to Transparency, page metadata.
      - Projects (listing) content: repeater of project cards (id/slug, title, location, status, short description, thumbnail, href). Project detail template: description, structured stats (location, start date, status, target end date, budget vs spent so far), team contacts (name, role, email/phone), optional gallery keys.
      - Events (page) content: cards with event name, location, status (upcoming/completed), date, contact person fields.
      - Transparency (page) content: trust name, registration number and date, property details, downloadable document links (title, href).
      - Storage outline: singleton public_layout_settings for global config; public_page rows keyed by slug (home, about, projects, project-detail template, events, transparency) storing page JSON. Normalization deferred unless needed.
      - Admin routes outline: GET/POST dashboard panels for home, about-us, projects, events, transparency, and settings; server-rendered preview endpoints; publish workflow integrates with existing publish pipeline.
      - Public SSR: pages read global + per-page data and render via PublicLayout; per-page overrides are minimal and explicit.
      - UX guardrails: plain language labels, help text, sensible defaults, limited overrides to avoid complexity; preview-first flow; accessible form controls.
      - Non-goals now: advanced animations, elaborate media workflows beyond basic R2 key input.
    changes: []
    acceptance_criteria:
      - The spec documents a high-level plan for admin-managed global layout and page content for Home, About, Projects, Events, and Transparency with structured fields matching the design spec.
      - The plan enumerates global settings, page sections, storage/endpoints outline, SSR integration, UX guardrails, and non-goals.
    tests:
      - path: docs-only
        type: n/a
        cases:
          - "Planning document updated with admin schemas and flows"
---

## Overview (Human Context)

This specification outlines the steps to iteratively design a unique and
engaging website for the Maa Nanda Trust. The focus is on creating a visually
appealing and culturally resonant experience that reflects the temple's
heritage while ensuring usability and accessibility.

## Updated Website Design Specification

- **Global Elements:** Top navigation (bells style — About Us, Projects, Events, Transparency), mobile hamburger/scroll-rod menu, floating "Donate" box/coin CTA on all pages, scroll-inspired layout for content, and footer.
- **Landing Page:** Hero with temple door overlay; smooth door-opening effect with toggle; H2 "Rajrajeshwari Mandir" immediately below hero; intro tagline; projects cards with thumbnail/title/description/read-more to project ID pages; events cards styled as postal/invitation envelopes showing date, location, name, one-line description, and link; donation box CTA with coin-drop feel; manuscript scroll background.
- **About Us Page:** Header with Trust name; overview; focus areas list; CTA to Transparency; trustees grid with image, name, short bio; rendered on scroll background without door overlay.
- **Projects Page:** Listing of project cards (same structure as landing projects); each opens a project detail template with name/location header, description, structured stats (location, start date, current status, target end date, budget vs amount spent so far), and team contacts; scroll background.
- **Events Page:** Invitation/envelope-style cards with event name, location, status (upcoming/completed), date, and contact person details; scroll background.
- **Transparency Page:** Structured regulatory/compliance data—trust name, registration number/date, property details, and download links for regulatory documents; scroll background.

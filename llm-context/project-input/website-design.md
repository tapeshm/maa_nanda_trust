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
    changes:
      - create: src/template/layout-iter.tsx
      - modify: src/routes/public/pages.ts
      - create: src/templates/references/landing-iter.html
    acceptance_criteria:
      - The landing page renders the static html file landing-iter.html.
    tests:
      - path: 
        type:
        cases:
  - id: step-02
    title: Website experience concept
    rationale: Set the website experience concept. In this step we iterate on the user experience concept. Layout different concepts. View them on development server and iterate based on user feedback and design ideas.
    depends_on:
      - step-01
    hints:
      - Make the website experience unique. Since, this is a temple trust - the website should reflect the theme by design.
      - All the design concepts should be implemented in modular and parameteric style to make iterations easier. Add explicit comments on the design concept that's implemented. Where needed always use parameters to make it easier to change the design.
      - Minimize the use of images. Use css effects and design to create the experience.
      - Use actual images for temple door, inside temple, donation box, bells if needed - and anywhere else where it adds value.
      - Only add custom css where needed. Leverage tailwindcss as much as possible.
      - Design Ideas:
        - Instead of a standard website layout - we do it differently. The page loads with a full screen image of temple door. Then as page loads - the door opens with a smooth natural effect - to give the user experience that they are entering the temple.
        - As the door opens - the home page will be a full screen image of the temple inside. The navigation buttons on top will be designed as if they are hanging temple bells - a nice css effect that they swing lighly when hovered and a nice effect when clicked.
        - The content will be put on a traditional scroll like background - to give the feel of ancient scriptures. The scroll-bg will be static on the background image. The center will have high opacity for reading the content easily. Give it a texture of old manuscript paper. With top and bottom brass rods, subtle saffron cords and tassels. Keep the texture gentle and high contrast for readability.
        - Add the donation link designed as donation box kept on a small traditional wooden table centered at the bottom of the page - floating above the scroll-bg. The donation box will have a traditional brass donation box look with a slot on top and engraved patterns. The donation button will be designed as a coin that drops into the box when clicked - with a nice sound effect.
        - Since, the door opening effect is a unique experience - add a small button at bottom right to toggle the door opening and closing effect for repeat visitors.
        - On smaller screens - instead of top navigation bells, use the standard design style of collapsible hamburger menu at top right. However, to fit the theme - design the hamburger icon as a scroll rod with saffron cords. When clicked, the scroll rolls out and shows the navigation links.
    changes:
      - modify: src/templates/references/landing-iter.html
    acceptance_criteria:
      - Keep this iterative based on user feedback and design ideas.
    tests:
      - path: 
        type:
        cases:
  - id: step-03
    title: Extract generic public layout + components (Tailwind SSR)
    rationale: Convert the stabilized reference HTML into generic, reusable SSR templates for all public pages (not just landing) and align markup with Tailwind v4 utilities for maintainability and consistency.
    depends_on:
      - step-02
    hints:
      - Prefer small, focused JSX components (SSR-only) composed by a generic `PublicLayout` used across public routes.
      - Replace bespoke CSS with Tailwind v4 utilities where feasible. Keep only necessary custom CSS (e.g., keyframes for door, coin); scope it to components.
      - Keep behaviors progressive and minimal: door overlay, mobile menu, and donation coin remain lightweight with inline script/HTMX hooks.
      - Insert D3 anchors in new/modified files for traceability (e.g., // [D3:pages.step-03:layout], // [D3:pages.step-03:nav], // [D3:pages.step-03:door]).
      - Maintain accessibility: aria-labels, focus-visible, and scroll margin to avoid nav overlap.
    changes:
      - create: src/templates/public/layout/PublicLayout.tsx
      - create: src/templates/public/layout/PublicTopNav.tsx
      - create: src/templates/public/layout/PublicMobileMenu.tsx
      - create: src/templates/public/layout/PublicFooter.tsx
      - create: src/templates/public/effects/TempleDoor.tsx
      - create: src/templates/public/blocks/Hero.tsx
      - create: src/templates/public/blocks/ScrollManuscript.tsx
      - create: src/templates/public/blocks/DonationCta.tsx
      - create: src/templates/public/pages/landing.tsx
      - create: src/templates/public/pages/about.tsx
      - modify: src/routes/public/pages.ts
      - note: Do not delete src/templates/references/landing-iter.html; keep as design reference.
    acceptance_criteria:
      - A generic `PublicLayout` composes `PublicTopNav`, `PublicMobileMenu`, and `PublicFooter`, and is used by the landing page and is suitable for other public pages.
      - Desktop nav remains fixed at top; content keeps a visible offset below the bar during scroll (no overlap).
      - Mobile “scroll menu” toggles open/close, closes on outside click/ESC, default closed.
      - Door overlay effect is a reusable component (can be omitted on non-landing pages) with the same behavior as step‑02.
      - An "About" page renders using `PublicLayout` with the ambient background, `PublicTopNav`, and a `ScrollManuscript` section (no door overlay or donation CTA required on About).
      - Donation CTA is a reusable block linking to "/donate" with coin animation/chime and delayed navigation (non-primary clicks bypass).
      - Tailwind utilities replace general layout/spacing/typography; remaining CSS is minimal and scoped.
      - Type-check, lint, format pass; tests for layout reuse and interactions are added and passing.
    tests:
      - path: tests/pages/publicLayout.ssr.test.ts
        type: integration
        cases:
          - "PublicLayout renders top nav and footer"
          - "Content area is offset below fixed nav on scroll"
      - path: tests/pages/landing.ssr.test.ts
        type: integration
        cases:
          - "Landing renders with PublicLayout + Hero + ScrollManuscript"
          - "Mobile menu is hidden by default and toggles visible"
          - "Door overlay initial state is closed"
          - "Donation link points to /donate and defers navigation after click"
      - path: tests/pages/about.ssr.test.ts
        type: integration
        cases:
          - "About renders with PublicLayout + ScrollManuscript and ambient background"
          - "Top nav present and content does not overlap on scroll"
          - "No door overlay or donation CTA on About"
      - path: tests/pages/landing.accessibility.test.ts
        type: unit
        cases:
          - "Sections have scroll-margin to avoid overlapping nav"
          - "Nav has appropriate aria-label and focus-visible styles"
  - id: step-04
    title: Admin dashboard plan for Home and About (PublicLayout)
    rationale: Capture a high-level, non-technical admin experience to manage global layout settings and page content for Home (landing) and About, balancing customization with simplicity. This is a planning step only; no implementation yet.
    depends_on:
      - step-03
    hints:
      - Global settings (shared): themeColor, googleFontsHref, skipLinkText, footerText.
      - Donation (global): includeFloatingDonation (bool), donationHref, donationLabel, donationAudioSrc; donation CTA appears on all public pages by default.
      - Navigation (global): links as a repeater with label, href, highlighted; validation guidance for in-page anchors.
      - Temple Door defaults (global): includeTempleDoorByDefault (bool), doorAutoOpenDelayMs; per-page override allowed.
      - Home (page) content: hero (eyebrow, title, subtitle/description, scrollHint, heroImageKey), manuscript intro (introEyebrow, introHeading, introBody), sections (repeater: id, eyebrow, heading, body), optional cards within sections (title, body), page metadata (pageTitle, metaDescription), layout overrides (includeTempleDoor, includeFooter), donation block toggle and optional per-page label/href override.
      - About (page) content: manuscript intro and sections (same structure as Home), page metadata, layout overrides (includeTempleDoor default off, includeFooter), donation block toggle consistent with new policy; supports sections without cards.
      - Storage outline: singleton public_layout_settings for global config; public_page rows keyed by slug (home, about) storing page JSON (hero, intro, sections, metadata, overrides). Normalization deferred unless needed.
      - Admin routes outline: GET/POST dashboard panels for home, about-us, and settings; server-rendered preview endpoints; publish workflow integrates with existing publish pipeline.
      - Public SSR: pages read global + per-page data and render via PublicLayout; per-page overrides are minimal and explicit.
      - UX guardrails: plain language labels, help text, sensible defaults, limited overrides to avoid complexity; preview-first flow; accessible form controls.
      - Non-goals now: media library UX beyond basic R2 key input, advanced animations configuration; can be phased later.
    changes: []
    acceptance_criteria:
      - The spec documents a high-level plan for admin-managed global layout and page content for Home and About.
      - The plan enumerates global settings, page sections, storage/endpoints outline, SSR integration, UX guardrails, and non-goals.
      - No code changes are required by this step.
    tests:
      - path:
        type:
        cases:
---

## Overview (Human Context)

This specification outlines the steps to iteratively design a unique and
engaging website for the Maa Nanda Trust. The focus is on creating a visually
appealing and culturally resonant experience that reflects the temple's
heritage while ensuring usability and accessibility.

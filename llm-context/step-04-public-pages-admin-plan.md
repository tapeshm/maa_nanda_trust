# Admin Dashboard Plan for Public Pages (Step-04)

**Feature:** Public layout and page content management
**Related Spec:** `website-design.md` Step-04
**Status:** Planning Document (No implementation yet)
**Dependencies:** Step-03 (PublicLayout components complete)

---

## 1. Overview

This document outlines the admin dashboard experience for managing:
- **Global layout settings** shared across all public pages
- **Page-specific content** for Home (landing) and About pages

### Goals
- Enable non-technical admins to manage website content
- Balance customization with simplicity
- Maintain preview-first workflow
- Keep UX accessible and intuitive
- Support existing publish/draft workflow

### Key Principles
- Plain language labels throughout
- Sensible defaults for all fields
- Minimal overrides to avoid complexity
- Preview before publish
- Progressive disclosure (advanced options hidden by default)

---

## 2. Data Models

### 2.1 Global Layout Settings (Singleton)

Shared configuration applied to all public pages unless overridden.

```typescript
// [D3:pages.step-04:global-settings]
interface PublicLayoutSettings {
  // Appearance
  themeColor: string                // Default: '#2f1b10'
  googleFontsHref: string | null    // Default: Cormorant Garamond + Inter
  skipLinkText: string              // Default: 'Skip to content'
  footerText: string                // Default: iteration message

  // Navigation (repeater)
  navLinks: Array<{
    label: string                   // Example: 'Darśan'
    href: string                    // Example: '#darshan' or '/about'
    highlighted: boolean            // Default: false (true for donation)
  }>

  // Floating Donation (Global CTA)
  includeFloatingDonation: boolean  // Default: true
  donationHref: string              // Default: '/donate'
  donationLabel: string             // Default: 'Donate'
  donationAudioSrc: string          // Default: '/assets/audio/coin-drop.mp3'

  // Temple Door (Defaults)
  includeTempleDoorByDefault: boolean  // Default: true
  doorAutoOpenDelayMs: number          // Default: 600
  doorLeftPanelImageKey: string | null // R2 key for left door panel
  doorRightPanelImageKey: string | null // R2 key for right door panel
}
```

**Storage:** Single row in `public_layout_settings` table (JSON blob)

---

### 2.2 Home Page Content

Landing page with hero, manuscript content, and donation section.

```typescript
// [D3:pages.step-04:home-content]
interface HomePageContent {
  slug: 'home'  // Fixed

  // Page Metadata
  pageTitle: string                 // Default: 'Maa Nanda Kansuwa Trust'
  metaDescription: string           // SEO description

  // Hero Section
  hero: {
    eyebrow: string | null          // Example: 'Maa Nanda Kansuwa Trust'
    title: string                   // Required: 'Enter the Divine Resonance'
    subtitle: string | null         // Optional short text
    description: string | null      // Optional longer text (alternative to subtitle)
    scrollHint: string              // Default: 'Scroll to Explore'
    heroImageKey: string | null     // R2 key for custom hero background
  }

  // Manuscript Content
  manuscript: {
    id: string                      // Default: 'seva'
    introEyebrow: string | null     // Default: 'Our Invocation'
    introHeading: string            // Required: Main heading
    introBody: string               // Required: Intro paragraph

    // Sections (repeater)
    sections: Array<{
      id: string                    // Example: 'festivals', 'community'
      eyebrow: string | null        // Example: 'Seasonal Rhythm'
      heading: string               // Required: Section heading
      body: string                  // Section text (can be empty if using cards)

      // Cards (optional nested repeater)
      cards: Array<{
        title: string               // Card heading
        body: string                // Card content
      }> | null
    }>
  }

  // Donation CTA Block
  donationCta: {
    enabled: boolean                // Default: true
    heading: string                 // Default: 'Offerings that Sustain Sacred Service'
    body: string                    // Caption text
    href: string | null             // Override global donation href (optional)
    label: string | null            // Override global donation label (optional)
  }

  // Layout Overrides
  overrides: {
    includeTempleDoor: boolean | null     // null = use global default
    includeFooter: boolean | null         // null = true
    includeFloatingDonation: boolean | null // null = use global setting
    footerText: string | null             // Override global footer text
  }
}
```

**Storage:** Row in `public_pages` table with `slug = 'home'` (JSON blob)

---

### 2.3 About Page Content

Simpler page with just manuscript content, no hero or donation.

```typescript
// [D3:pages.step-04:about-content]
interface AboutPageContent {
  slug: 'about'  // Fixed

  // Page Metadata
  pageTitle: string                 // Default: 'About — Maa Nanda Kansuwa Trust'
  metaDescription: string           // SEO description

  // Manuscript Content (same structure as home)
  manuscript: {
    id: string                      // Default: 'about-overview'
    introEyebrow: string | null
    introHeading: string
    introBody: string
    sections: Array<{
      id: string
      eyebrow: string | null
      heading: string
      body: string
      cards: Array<{
        title: string
        body: string
      }> | null
    }>
  }

  // Donation CTA Block (optional for About)
  donationCta: {
    enabled: boolean                // Default: false for About
    heading: string | null
    body: string | null
    href: string | null
    label: string | null
  }

  // Layout Overrides
  overrides: {
    includeTempleDoor: boolean | null     // null = use global (typically false for About)
    includeFooter: boolean | null         // null = true
    includeFloatingDonation: boolean | null // null = use global setting
    footerText: string | null
  }
}
```

**Storage:** Row in `public_pages` table with `slug = 'about'` (JSON blob)

---

## 3. Storage Architecture

### 3.1 Database Schema

```sql
-- [D3:pages.step-04:schema]

-- Global layout settings (singleton)
CREATE TABLE IF NOT EXISTS public_layout_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Enforce singleton
  settings_json TEXT NOT NULL,                      -- JSON blob of PublicLayoutSettings
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT                                   -- Auth user email/id
);

-- Per-page content
CREATE TABLE IF NOT EXISTS public_pages (
  slug TEXT PRIMARY KEY,                           -- 'home', 'about', etc.
  content_json TEXT NOT NULL,                      -- JSON blob of page content
  status TEXT NOT NULL DEFAULT 'draft',            -- 'draft', 'published'
  version INTEGER NOT NULL DEFAULT 1,              -- Increment on each save
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT,                                 -- Auth user email/id
  published_at TEXT,                               -- When last published
  published_by TEXT                                -- Who published
);

CREATE INDEX IF NOT EXISTS idx_public_pages_status ON public_pages(status);
```

### 3.2 Storage Rationale

**Why JSON blobs:**
- ✅ Flexible schema for iterative content structure
- ✅ Easy to add new fields without migrations
- ✅ Matches existing patterns in codebase (`page_metadata`, `content_json`)
- ✅ Simple to serialize/deserialize in TypeScript
- ✅ Can normalize later if query performance requires

**Version field:**
- Incremented on each save
- Enables future version history feature
- Helps debug "who changed what when"

**Status field:**
- `draft`: Work in progress, not visible to public
- `published`: Currently live on public site

---

## 4. Admin Routes & Endpoints

### 4.1 Route Structure

```
/admin/dashboard
  │
  ├─ /dashboard/settings              # Global layout settings
  │   ├─ GET  → Render settings form
  │   ├─ POST → Save settings
  │   └─ GET  /preview → Preview with current settings
  │
  ├─ /dashboard/home                  # Home page editor
  │   ├─ GET  → Render home editor form (draft)
  │   ├─ POST → Save home draft
  │   ├─ GET  /preview → SSR preview of draft
  │   └─ POST /publish → Publish draft to live
  │
  └─ /dashboard/about                 # About page editor
      ├─ GET  → Render about editor form (draft)
      ├─ POST → Save about draft
      ├─ GET  /preview → SSR preview of draft
      └─ POST /publish → Publish draft to live
```

### 4.2 Endpoint Details

```typescript
// [D3:pages.step-04:routes]

// Global Settings
GET  /admin/dashboard/settings
  → Fetch public_layout_settings
  → Render form with current values
  → Include help text and validation hints

POST /admin/dashboard/settings
  → Validate input
  → Update public_layout_settings
  → Return success + redirect to settings page

GET  /admin/dashboard/settings/preview
  → Fetch global settings
  → Render dummy page with applied settings
  → Show in modal or new tab

// Home Page
GET  /admin/dashboard/home
  → Fetch public_pages WHERE slug='home' AND status='draft'
  → If no draft exists, copy from published or create default
  → Render editor form with sections, repeaters

POST /admin/dashboard/home
  → Validate input
  → Update draft row (increment version, set updated_at/by)
  → Return success + stay on form

GET  /admin/dashboard/home/preview
  → Fetch draft row
  → Merge with global settings
  → Render PublicLayout(<LandingPage {...data} />)
  → Show in preview frame or new tab

POST /admin/dashboard/home/publish
  → Validate draft
  → Copy draft content_json to published status
  → Set published_at, published_by
  → Invalidate cache (if any)
  → Return success + redirect

// About Page (same pattern)
GET  /admin/dashboard/about
POST /admin/dashboard/about
GET  /admin/dashboard/about/preview
POST /admin/dashboard/about/publish
```

### 4.3 Integration with Existing Publish Workflow

- Use existing `adminPublish` route pattern
- Leverage existing auth middleware
- Follow existing CSRF protection pattern
- Reuse existing form validation utilities

---

## 5. Form Structure & UX

### 5.1 Global Settings Form

**URL:** `/admin/dashboard/settings`

**Layout:** Tabbed interface

#### Tab 1: Appearance
```
┌─────────────────────────────────────────┐
│ Appearance Settings                     │
├─────────────────────────────────────────┤
│                                         │
│ Theme Color                             │
│ ├─ [#2f1b10] (color picker)           │
│ └─ Used for browser address bar color  │
│                                         │
│ Google Fonts URL (optional)             │
│ ├─ [https://fonts.googleapis.com/...]  │
│ └─ Leave empty to disable custom fonts │
│                                         │
│ Skip Link Text                          │
│ ├─ [Skip to content]                   │
│ └─ Accessibility text for keyboard nav │
│                                         │
│ Footer Text                             │
│ ├─ [Crafted for iterative...]          │
│ └─ Displayed at bottom of all pages    │
│                                         │
│ [Save Appearance]  [Preview]            │
└─────────────────────────────────────────┘
```

#### Tab 2: Navigation
```
┌─────────────────────────────────────────┐
│ Navigation Links                        │
├─────────────────────────────────────────┤
│                                         │
│ Link 1                                  │
│ ├─ Label: [Darśan]                     │
│ ├─ Link: [#darshan]                    │
│ └─ ☐ Highlight (gold button)           │
│                                         │
│ Link 2                                  │
│ ├─ Label: [Sevā]                       │
│ ├─ Link: [#seva]                       │
│ └─ ☐ Highlight                         │
│                                         │
│ ...                                     │
│                                         │
│ [+ Add Link]  [Remove Last]             │
│                                         │
│ ℹ️ Use #anchor for same-page links     │
│    Use /path for different pages       │
│                                         │
│ [Save Navigation]  [Preview]            │
└─────────────────────────────────────────┘
```

#### Tab 3: Donation
```
┌─────────────────────────────────────────┐
│ Floating Donation Button                │
├─────────────────────────────────────────┤
│                                         │
│ ☑ Show floating donation button        │
│                                         │
│ Button Label                            │
│ ├─ [Donate]                            │
│                                         │
│ Donation Link                           │
│ ├─ [/donate]                           │
│ └─ Where the button links to           │
│                                         │
│ Coin Sound File (R2 key)               │
│ ├─ [/assets/audio/coin-drop.mp3]      │
│ └─ Audio file path in R2 storage       │
│                                         │
│ [Save Donation]  [Preview]              │
└─────────────────────────────────────────┘
```

#### Tab 4: Temple Door
```
┌─────────────────────────────────────────┐
│ Temple Door Effect                      │
├─────────────────────────────────────────┤
│                                         │
│ ☑ Show temple door by default          │
│                                         │
│ Auto-open Delay (milliseconds)          │
│ ├─ [600]                               │
│ └─ How long before door opens          │
│                                         │
│ Left Door Panel (R2 key, optional)      │
│ ├─ [/assets/temple-door-left.png]     │
│                                         │
│ Right Door Panel (R2 key, optional)     │
│ ├─ [/assets/temple-door-right.png]    │
│                                         │
│ ℹ️ Leave image fields empty for         │
│    default CSS gradient                 │
│                                         │
│ [Save Door Settings]  [Preview]         │
└─────────────────────────────────────────┘
```

---

### 5.2 Home Page Form

**URL:** `/admin/dashboard/home`

**Layout:** Multi-section form with collapsible panels

```
┌─────────────────────────────────────────┐
│ Edit Home Page                          │
├─────────────────────────────────────────┤
│                                         │
│ ▼ Page Metadata                         │
│   ├─ Page Title                        │
│   │   [Maa Nanda Kansuwa Trust]        │
│   └─ Meta Description (SEO)            │
│       [Guided by centuries...]          │
│                                         │
│ ▼ Hero Section                          │
│   ├─ Eyebrow Text (optional)           │
│   │   [Maa Nanda Kansuwa Trust]        │
│   ├─ Title (required)                  │
│   │   [Enter the Divine Resonance]     │
│   ├─ Description                       │
│   │   [Guided by centuries...]         │
│   ├─ Scroll Hint                       │
│   │   [Scroll to Explore]              │
│   └─ Hero Image (R2 key, optional)     │
│       []                               │
│                                         │
│ ▼ Manuscript Content                    │
│   ├─ Section ID                        │
│   │   [seva]                           │
│   ├─ Intro Eyebrow                     │
│   │   [Our Invocation]                 │
│   ├─ Intro Heading (required)          │
│   │   [In Service of Maa Nanda Devi]  │
│   ├─ Intro Body (required)             │
│   │   [Rich text editor...]            │
│   │                                    │
│   ├─ ▼ Section 1: Festivals            │
│   │   ├─ Section ID: [festivals]      │
│   │   ├─ Eyebrow: [Seasonal Rhythm]   │
│   │   ├─ Heading: [Festivals that...] │
│   │   ├─ Body: []                     │
│   │   └─ Cards (3):                   │
│   │       ├─ Card 1: Shardiya Navaratri│
│   │       ├─ Card 2: Jan Bhawani Mela  │
│   │       └─ Card 3: Deepdaan Mahotsav │
│   │                                    │
│   ├─ ▼ Section 2: Community            │
│   │   └─ ...                           │
│   │                                    │
│   └─ [+ Add Section]                   │
│                                         │
│ ▼ Donation Section                      │
│   ├─ ☑ Show donation section          │
│   ├─ Heading                           │
│   │   [Offerings that Sustain...]     │
│   ├─ Body                              │
│   │   [Each contribution nurtures...] │
│   ├─ Link (override global, optional)  │
│   │   []                               │
│   └─ Label (override global, optional) │
│       []                               │
│                                         │
│ ▼ Advanced Settings                     │
│   ├─ ☑ Show temple door effect        │
│   ├─ ☑ Show footer                    │
│   ├─ ☑ Show floating donation         │
│   └─ Footer text (override)            │
│       []                               │
│                                         │
│ [Save Draft]  [Preview]  [Publish]     │
└─────────────────────────────────────────┘
```

**Repeater Pattern:**
- Sections can be added/removed/reordered
- Each section can have optional cards
- Cards within sections can be added/removed
- Drag-to-reorder for better UX (future enhancement)

---

### 5.3 About Page Form

**URL:** `/admin/dashboard/about`

**Similar to Home, but simpler:**
- No Hero section
- Manuscript content with sections
- Donation section (optional, default off)
- Advanced settings (default: no door)

---

### 5.4 UX Guardrails

**Plain Language:**
- ❌ "themeColor" → ✅ "Website Theme Color"
- ❌ "includeTempleDoor" → ✅ "Show temple door effect"
- ❌ "navLinks" → ✅ "Navigation Links"

**Help Text:**
- Every field has explanatory text below it
- Examples shown in placeholders
- Links to documentation where helpful

**Validation:**
- Required fields marked with *
- Inline validation errors (red text)
- Format validation (URLs, colors, numbers)
- Character limits shown (e.g., "50/160 characters")

**Sensible Defaults:**
- All fields pre-filled with current values or defaults
- No empty required fields on first load
- Copy from published version when creating draft

**Limited Overrides:**
- Advanced settings collapsed by default
- Most pages use global settings
- Only override when necessary
- Clear labels: "Leave empty to use global setting"

**Preview-First:**
- Preview button always visible
- Opens in new tab or modal
- Shows exactly what visitors will see
- No publish without preview

**Confirmation:**
- Publish action requires confirmation
- "Are you sure? This will update the live site."
- No accidental publishes

---

## 6. SSR Integration

### 6.1 Data Flow

```
User Request (GET /)
  ↓
Route Handler: /
  ↓
fetchPublicPageData('home', env)
  ├─ Fetch global_layout_settings (singleton)
  ├─ Fetch public_pages WHERE slug='home' AND status='published'
  └─ Merge data (page overrides take precedence)
  ↓
Render PublicLayout with merged props
  ├─ Apply global settings
  ├─ Apply page content
  └─ Apply page overrides
  ↓
Return HTML response
```

### 6.2 Data Merge Logic

```typescript
// [D3:pages.step-04:data-merge]

function mergePublicPageData(
  globalSettings: PublicLayoutSettings,
  pageContent: HomePageContent | AboutPageContent
): PublicLayoutProps & PageProps {
  return {
    // From global settings (with page overrides)
    title: pageContent.pageTitle,
    themeColor: globalSettings.themeColor,
    navLinks: globalSettings.navLinks,
    googleFontsHref: globalSettings.googleFontsHref,
    skipLinkText: globalSettings.skipLinkText,
    footerText: pageContent.overrides.footerText ?? globalSettings.footerText,

    // Temple door (page override or global default)
    includeTempleDoor:
      pageContent.overrides.includeTempleDoor ??
      globalSettings.includeTempleDoorByDefault,

    // Footer (page override or default true)
    includeFooter: pageContent.overrides.includeFooter ?? true,

    // Floating donation (page override or global setting)
    includeFloatingDonation:
      pageContent.overrides.includeFloatingDonation ??
      globalSettings.includeFloatingDonation,
    donationHref: globalSettings.donationHref,
    donationLabel: globalSettings.donationLabel,

    // Page-specific content
    ...pageContent
  }
}
```

### 6.3 Route Handler Pseudocode

```typescript
// [D3:pages.step-04:route-handler]

import { fetchPublicPageData } from '../services/publicPages'
import LandingPage from '../templates/public/pages/landing'

app.get('/', async (c) => {
  try {
    // Fetch merged data
    const data = await fetchPublicPageData('home', c.env)

    // Render SSR
    return c.html(<LandingPage {...data} />)
  } catch (error) {
    console.error('Failed to render home page:', error)
    return c.html(<ErrorPage status={500} />, 500)
  }
})

app.get('/about', async (c) => {
  const data = await fetchPublicPageData('about', c.env)
  return c.html(<AboutPage {...data} />)
})
```

### 6.4 Service Layer

```typescript
// [D3:pages.step-04:service]
// src/services/publicPages.ts

export async function fetchGlobalSettings(
  db: D1Database
): Promise<PublicLayoutSettings> {
  const result = await db
    .prepare('SELECT settings_json FROM public_layout_settings WHERE id = 1')
    .first()

  if (!result) {
    return getDefaultGlobalSettings()
  }

  return JSON.parse(result.settings_json as string)
}

export async function fetchPageContent(
  db: D1Database,
  slug: string,
  status: 'draft' | 'published' = 'published'
): Promise<HomePageContent | AboutPageContent> {
  const result = await db
    .prepare('SELECT content_json FROM public_pages WHERE slug = ? AND status = ?')
    .bind(slug, status)
    .first()

  if (!result) {
    throw new Error(`Page not found: ${slug}`)
  }

  return JSON.parse(result.content_json as string)
}

export async function fetchPublicPageData(
  slug: string,
  env: Bindings
): Promise<any> {
  const [globalSettings, pageContent] = await Promise.all([
    fetchGlobalSettings(env.DB),
    fetchPageContent(env.DB, slug, 'published')
  ])

  return mergePublicPageData(globalSettings, pageContent)
}
```

---

## 7. Validation Rules

### 7.1 Global Settings Validation

```typescript
// [D3:pages.step-04:validation]

const globalSettingsSchema = {
  themeColor: {
    required: true,
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Must be a valid hex color (e.g., #2f1b10)'
  },
  googleFontsHref: {
    required: false,
    pattern: /^https:\/\/fonts\.googleapis\.com\/.+$/,
    message: 'Must be a valid Google Fonts URL'
  },
  skipLinkText: {
    required: true,
    minLength: 3,
    maxLength: 50,
    message: 'Must be between 3 and 50 characters'
  },
  footerText: {
    required: true,
    maxLength: 200,
    message: 'Must be less than 200 characters'
  },
  navLinks: {
    required: true,
    minItems: 1,
    maxItems: 10,
    itemSchema: {
      label: { required: true, maxLength: 30 },
      href: { required: true, maxLength: 100 },
      highlighted: { type: 'boolean' }
    }
  },
  doorAutoOpenDelayMs: {
    required: true,
    type: 'number',
    min: 0,
    max: 5000,
    message: 'Must be between 0 and 5000 milliseconds'
  }
}
```

### 7.2 Page Content Validation

```typescript
const homePageSchema = {
  pageTitle: {
    required: true,
    maxLength: 60,
    message: 'Page title should be under 60 characters for SEO'
  },
  metaDescription: {
    required: true,
    maxLength: 160,
    message: 'Meta description should be under 160 characters'
  },
  hero: {
    title: { required: true, maxLength: 100 },
    description: { required: false, maxLength: 300 }
  },
  manuscript: {
    introHeading: { required: true, maxLength: 100 },
    introBody: { required: true, maxLength: 2000 },
    sections: {
      minItems: 0,
      maxItems: 10,
      itemSchema: {
        heading: { required: true, maxLength: 100 },
        body: { required: false, maxLength: 2000 },
        cards: {
          minItems: 0,
          maxItems: 6,
          itemSchema: {
            title: { required: true, maxLength: 100 },
            body: { required: true, maxLength: 500 }
          }
        }
      }
    }
  }
}
```

### 7.3 Validation Triggers

- **On blur:** Validate individual field when user leaves it
- **On save:** Validate entire form before saving draft
- **On publish:** Additional validation + confirmation
- **Server-side:** Always validate on POST (never trust client)

---

## 8. Preview & Publish Workflow

### 8.1 Draft → Preview → Publish Flow

```
Edit Form
  ↓
[Save Draft] ← User can save without publishing
  ↓
Draft saved (status='draft', version++)
  ↓
[Preview] ← Opens preview in new tab
  ↓
Preview renders with draft data
  ↓
User reviews ← Can go back and edit more
  ↓
[Publish] ← Requires confirmation
  ↓
"Are you sure? This will update the live site."
  ↓
[Yes] → Publish draft
  ├─ Copy draft to published status
  ├─ Set published_at, published_by
  └─ Invalidate cache
  ↓
Success message + redirect
```

### 8.2 Preview Implementation

**Endpoint:** `/admin/dashboard/home/preview`

```typescript
app.get('/admin/dashboard/home/preview', async (c) => {
  // Fetch DRAFT content (not published)
  const draft = await fetchPageContent(c.env.DB, 'home', 'draft')
  const globalSettings = await fetchGlobalSettings(c.env.DB)

  // Merge and render
  const data = mergePublicPageData(globalSettings, draft)

  // Add preview banner
  return c.html(
    <>
      <div class="preview-banner">
        ⚠️ Preview Mode - This is not the live site
      </div>
      <LandingPage {...data} />
    </>
  )
})
```

### 8.3 Publish Implementation

**Endpoint:** `/admin/dashboard/home/publish`

```typescript
app.post('/admin/dashboard/home/publish', async (c) => {
  // Validate auth
  const user = c.get('authContext')
  if (!user) return c.redirect('/login')

  // Fetch draft
  const draft = await fetchPageContent(c.env.DB, 'home', 'draft')

  // Validate
  const errors = validatePageContent(draft)
  if (errors.length > 0) {
    return c.html(<ErrorPage errors={errors} />, 400)
  }

  // Publish
  await c.env.DB
    .prepare(`
      UPDATE public_pages
      SET status = 'published',
          published_at = datetime('now'),
          published_by = ?
      WHERE slug = 'home' AND status = 'draft'
    `)
    .bind(user.email)
    .run()

  // Invalidate cache (if using)
  await invalidatePageCache(c.env, 'home')

  return c.redirect('/admin/dashboard/home?published=true')
})
```

---

## 9. Non-Goals (Out of Scope)

### ❌ Not Implementing Now

**Media Library UI:**
- Reason: R2 key text input is sufficient for now
- Can add: Image upload UI with preview in future phase
- Workaround: Upload to R2 via other tools, paste key

**Advanced Animation Configuration:**
- Reason: Adds complexity for little gain
- Can add: Timing, easing, duration controls later
- Current: Fixed values in CSS work well

**Multi-language Support:**
- Reason: Not required by spec
- Can add: i18n system in future
- Current: English only

**User Roles/Permissions:**
- Reason: Existing auth is sufficient
- Can add: Editor vs Admin roles later
- Current: All authenticated users can edit

**Content Scheduling:**
- Reason: Simple publish workflow is adequate
- Can add: Schedule publish for future date
- Current: Publish immediately

**Version History UI:**
- Reason: Version field exists but no UI yet
- Can add: View/restore previous versions
- Current: Only current draft + published

**A/B Testing:**
- Reason: Out of scope for MVP
- Can add: Multiple variants, analytics
- Current: Single version per page

**Analytics Dashboard:**
- Reason: Use external tools (Google Analytics)
- Can add: Simple page view counts
- Current: No built-in analytics

**Rich Media Embeds:**
- Reason: Static content focus
- Can add: YouTube, maps, social embeds
- Current: Text and images only

**Custom Fonts Upload:**
- Reason: Google Fonts sufficient
- Can add: R2-hosted font files
- Current: Google Fonts URL only

**Mobile App:**
- Reason: Web-only for now
- Future: PWA or native app

### ✅ Can Add Later (Phased Approach)

**Phase 2:**
- Image upload UI with preview
- Drag-to-reorder sections/cards
- Rich text formatting toolbar

**Phase 3:**
- Version history with restore
- Content scheduling
- More page types (events, blog)

**Phase 4:**
- Multi-language support
- Advanced animation controls
- Custom CSS per page

---

## 10. Implementation Phases

### Phase 1: Foundation (Next Steps)
1. Create database tables and migrations
2. Build service layer (fetch/save functions)
3. Create TypeScript interfaces
4. Add validation utilities

### Phase 2: Admin UI
1. Global settings form (all tabs)
2. Home page editor form
3. About page editor form
4. Preview endpoints

### Phase 3: Publish Workflow
1. Draft/publish status management
2. Publish confirmation
3. Cache invalidation
4. Success/error messaging

### Phase 4: SSR Integration
1. Update public routes to fetch from DB
2. Implement data merge logic
3. Remove hardcoded content from components
4. Test with real data

### Phase 5: Polish
1. Form validation refinements
2. Better error messages
3. Loading states
4. Accessibility audit

---

## 11. Open Questions for Review

1. **Should we support reordering nav links via drag-and-drop, or just add/remove?**
   - Simple: Text inputs, manual ordering
   - Advanced: Drag-to-reorder UI

2. **Should manuscript sections support rich text (bold, italic, links) or plain text only?**
   - Simple: Plain text with line breaks
   - Advanced: Tiptap editor for each text field

3. **How should we handle R2 image uploads?**
   - Simple: Manual upload + paste key
   - Better: Upload form with preview
   - Best: Full media library

4. **Should we support multiple donation CTAs per page, or just one?**
   - Current: One donation section per page
   - Alternative: Multiple CTAs at different positions

5. **Do we need a "Discard Draft" button to revert to published?**
   - Current: Manual re-edit
   - Better: One-click revert

6. **Should preview open in new tab, modal, or iframe?**
   - New tab: Simpler, full-featured
   - Modal: Stays in admin context
   - Iframe: Side-by-side editing (complex)

---

## 12. Success Criteria

### Admin Experience
- ✅ Non-technical user can update page content without code
- ✅ All fields have clear labels and help text
- ✅ Preview shows exactly what will be published
- ✅ No accidental publishes (confirmation required)
- ✅ Changes are saved as drafts first
- ✅ Global settings apply consistently

### Technical
- ✅ Type-safe interfaces for all data models
- ✅ Validation on client and server
- ✅ Clean separation of global vs page-specific data
- ✅ Minimal database queries per request
- ✅ Cache invalidation on publish
- ✅ Follows existing auth/CSRF patterns

### User Experience (Public Site)
- ✅ No difference between hardcoded and DB-driven pages
- ✅ Fast page loads (SSR, minimal JS)
- ✅ Content reflects admin changes immediately after publish
- ✅ Graceful fallbacks if DB unavailable

---

## 13. References

- Existing admin routes: `src/routes/admin/`
- Existing page handling: `src/routes/public/pages.ts`
- Existing auth: `src/middleware/auth.ts`
- Existing publish: `src/routes/admin/publish.ts`
- Component architecture: `src/templates/public/`

---

**Next Steps:**
1. Review this plan with stakeholders
2. Iterate based on feedback
3. Finalize open questions
4. Begin Phase 1 implementation

---

*This is a living document. Update as requirements evolve.*

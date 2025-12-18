# Codebase Review Findings

**Date:** 2025-12-18
**Scope:** Implementation and UX review of Maa Nanda Kansuwa Trust website
**Focus:** Bug fixes, consistency, UX issues (not scope expansion)

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 2 |
| High | 8 |
| Medium | 12 |
| Low | 6 |

---

## Critical Issues

### 1. [CRITICAL] Nested `<main>` Elements in Pages

**Files:**
- `src/templates/public/pages/landing.tsx:56`
- `src/templates/public/layout/PublicLayout.tsx:122`

**Issue:** Pages wrap content in `<main>` tag while `PublicLayout` already provides a `<main id="main-content">` wrapper. This creates invalid HTML with nested `<main>` elements.

**Impact:** Accessibility issues (screen readers), invalid HTML.

**Fix:** Remove inner `<main>` tags from individual pages. Use `<div>` or semantic sections instead.

```tsx
// landing.tsx - Change from:
<main class="py-12 md:py-20 px-4">

// To:
<div class="py-12 md:py-20 px-4">
```

**Affected Pages:** landing.tsx, ProjectsPage.tsx, EventsPage.tsx, ProjectDetailPage.tsx, EventDetailPage.tsx, about.tsx, DonatePage.tsx, TransparencyPage.tsx

---

### 2. [CRITICAL] Login Link Always Shows in Navigation (Auth Logic)

**File:** `src/config/navigation.ts:44-47`

**Issue:** The `authLink` always points to `/admin/dashboard` regardless of login state, but the label changes. If a user is not logged in and clicks "Login", they go to `/admin/dashboard` which then redirects to `/login`. This works but is inconsistent.

**Current Code:**
```typescript
const authLink: Link = {
  href: '/admin/dashboard',  // Always same href
  label: isLoggedIn ? (isHi ? 'डैशबोर्ड' : 'Dashboard') : (isHi ? 'लॉग इन' : 'Login')
};
```

**Fix:** Point directly to `/login` when not logged in:
```typescript
const authLink: Link = {
  href: isLoggedIn ? '/admin/dashboard' : '/login',
  label: isLoggedIn ? (isHi ? 'डैशबोर्ड' : 'Dashboard') : (isHi ? 'लॉग इन' : 'Login')
};
```

---

## High Priority Issues

### 3. [HIGH] Page Titles Not Localized

**Files:** All public page templates

**Issue:** HTML `<title>` tags are hardcoded in English even when viewing Hindi pages.

**Examples:**
- `landing.tsx:44` - `title="Maa Nanda Kansuwa Trust"`
- `ProjectsPage.tsx:37` - `title="Projects — Maa Nanda Kansuwa Trust"`
- `EventsPage.tsx:39` - `title="Events — Maa Nanda Kansuwa Trust"`

**Fix:** Add localized titles:
```tsx
const TITLES = {
  en: "Projects — Maa Nanda Kansuwa Trust",
  hi: "परियोजनाएं — माँ नंदा कंसुवा ट्रस्ट"
};
// ...
<PublicLayout title={TITLES[lang]} ...>
```

---

### 4. [HIGH] Inconsistent Link Generation in ProjectsPage

**File:** `src/templates/public/pages/ProjectsPage.tsx:50`

**Issue:** Uses inline ternary for link generation instead of the available `getLocalizedHref()` helper.

**Current:**
```tsx
<a href={lang === 'hi' ? `/hi/projects/${project.id}` : `/projects/${project.id}`}>
```

**Should be:**
```tsx
<a href={getLocalizedHref(`/projects/${project.id}`, lang)}>
```

**Also affects:** `EventsPage.tsx:50`, `about.tsx:137`

---

### 5. [HIGH] Missing `key` Props in JSX Lists

**Files:** Multiple components

**Issue:** React/Hono requires `key` props for efficient list rendering. Several maps are missing keys.

**Locations:**
- `landing.tsx:76-78` - projects map
- `landing.tsx:87-95` - events map
- `about.tsx:111-113` - values map
- `about.tsx:121-123` - trustees map
- `TransparencyPage.tsx:85-90` - propertyDetails map
- `TransparencyPage.tsx:100-121` - documents map
- `ProjectsPage.tsx:49-53` - projects map
- `EventsPage.tsx:49-54` - events map

**Fix:** Add unique `key` prop to mapped elements:
```tsx
{projects.map((project) => (
  <ProjectCard key={project.id} project={project} lang={lang} />
))}
```

---

### 6. [HIGH] EventCard Has Duplicate `mt-auto` Classes

**File:** `src/templates/public/components/EventCard.tsx:62`

**Issue:** The contact person section has conflicting margin classes: `mt-auto pt-4 flex ... mt-6`

**Current:**
```tsx
<div class="border-t border-white/10 mt-auto pt-4 flex items-center gap-3 mt-6">
```

**Fix:** Remove duplicate, use one consistent margin:
```tsx
<div class="border-t border-white/10 mt-auto pt-4 flex items-center gap-3">
```

---

### 7. [HIGH] Floating Donation Button Label Not Localized

**File:** `src/templates/public/layout/PublicLayout.tsx:132`

**Issue:** The floating donation button uses a hardcoded English label.

**Current:**
```tsx
<FloatingDonationButton href={localizedDonationHref} label={donationLabel} />
// donationLabel defaults to 'Donate'
```

**Fix:** Use localized label:
```tsx
const localizedDonationLabel = lang === 'hi' ? 'दान करें' : 'Donate';
<FloatingDonationButton href={localizedDonationHref} label={localizedDonationLabel} />
```

---

### 8. [HIGH] Hero Scroll Hint Not Localized

**File:** `src/templates/public/blocks/Hero.tsx:22`

**Issue:** Scroll hint is hardcoded in English.

**Current:**
```tsx
scrollHint = 'Scroll to Explore',
```

**Fix:** Accept lang prop and localize:
```tsx
const LABELS = {
  en: { scrollHint: 'Scroll to Explore' },
  hi: { scrollHint: 'स्क्रॉल करें' }
};
```

---

### 9. [HIGH] Currency Display Hardcoded to USD

**File:** `src/templates/public/pages/ProjectDetailPage.tsx:104`

**Issue:** Financial display uses `$` symbol, but this is an Indian trust that should display INR (₹).

**Current:**
```tsx
<p class="text-xs text-white/70 mt-1">{`$${project.spent.toLocaleString()} / $${project.budget.toLocaleString()}`}</p>
```

**Fix:**
```tsx
<p class="text-xs text-white/70 mt-1">{`₹${project.spent.toLocaleString('en-IN')} / ₹${project.budget.toLocaleString('en-IN')}`}</p>
```

---

### 10. [HIGH] "Donation details coming soon" Not Localized

**File:** `src/templates/public/pages/DonatePage.tsx:68`

**Issue:** Empty state message is hardcoded in English.

**Fix:** Add to LABELS object and use:
```tsx
const LABELS = {
  en: {
    // ...existing
    comingSoon: "Donation details coming soon."
  },
  hi: {
    // ...existing
    comingSoon: "दान विवरण जल्द आ रहे हैं।"
  }
};
```

---

## Medium Priority Issues

### 11. [MEDIUM] Deprecated `navLinks` Prop Still Passed

**Files:** All pages passing `navLinks` prop to `PublicLayout`

**Issue:** `PublicLayout` accepts a deprecated `navLinks` prop that is no longer used (the config is generated internally). Pages still pass it unnecessarily.

**Examples:**
- `landing.tsx:45` - `navLinks={navLinks}`
- `ProjectsPage.tsx:38` - `navLinks={navLinks}`

**Fix:** Remove the unused prop from all pages and clean up the import of `getNavLinks`.

---

### 12. [MEDIUM] Date Formatting Not Localized in ProjectDetailPage

**File:** `src/templates/public/pages/ProjectDetailPage.tsx:89`

**Issue:** Uses `toLocaleDateString()` without locale parameter.

**Current:**
```tsx
<p class="text-white/90 font-semibold">{new Date(project.startDate).toLocaleDateString()}</p>
```

**Fix:**
```tsx
<p class="text-white/90 font-semibold">
  {new Date(project.startDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
</p>
```

---

### 13. [MEDIUM] Status Labels Not Localized in ProjectDetailPage

**File:** `src/templates/public/pages/ProjectDetailPage.tsx:93`

**Issue:** Project status (Planned, Ongoing, Completed) displays in English only.

**Current:**
```tsx
<p class="text-white/90 font-semibold">{project.status}</p>
```

**Fix:** Add status labels to LABELS and use:
```tsx
const LABELS = {
  en: {
    // ...existing
    status: { Planned: 'Planned', Ongoing: 'Ongoing', Completed: 'Completed' }
  },
  hi: {
    // ...existing
    status: { Planned: 'नियोजित', Ongoing: 'जारी', Completed: 'पूर्ण' }
  }
};
// ...
<p class="text-white/90 font-semibold">{labels.status[project.status]}</p>
```

---

### 14. [MEDIUM] Mobile Menu Missing Active State Indicator

**File:** `src/templates/public/layout/PublicMobileMenu.tsx:30`

**Issue:** Mobile menu links don't show active state like desktop nav does.

**Current:**
```tsx
<a key={link.href} href={link.href}>
  {link.label}
</a>
```

**Fix:**
```tsx
<a
  key={link.href}
  href={link.href}
  aria-current={link.isActive ? 'page' : undefined}
>
  {link.label}
</a>
```

---

### 15. [MEDIUM] Select Options Missing `value` Attributes

**Files:**
- `src/templates/admin/dashboard/ProjectsForm.tsx:271-275`
- `src/templates/admin/dashboard/EventsForm.tsx:265-269`

**Issue:** Select options rely on `selected` attribute but don't have explicit `value` attributes, which can cause issues with form submission.

**Current:**
```tsx
<option selected={project?.status === 'Planned'}>Planned</option>
```

**Fix:**
```tsx
<option value="Planned" selected={project?.status === 'Planned'}>Planned</option>
```

---

### 16. [MEDIUM] Empty Events Array Not Handled Gracefully

**File:** `src/templates/public/pages/landing.tsx:87`

**Issue:** If no upcoming events exist, the events section shows empty space with just the header.

**Current:**
```tsx
{events.filter(e => e.status === 'Upcoming').slice(0, 2).map(...)}
```

**Fix:** Add empty state:
```tsx
{(() => {
  const upcomingEvents = events.filter(e => e.status === 'Upcoming').slice(0, 2);
  if (upcomingEvents.length === 0) {
    return <p class="text-center text-white/60 italic">No upcoming events at this time.</p>;
  }
  return upcomingEvents.map((event) => (
    <EventsEnvelopeCard ... />
  ));
})()}
```

---

### 17. [MEDIUM] CSS Duplicate Rules Between Files

**Files:**
- `src/styles/public-pages.css` (main file)
- `src/styles/public-pages/base.css`
- `src/styles/public-pages/nav.css`

**Issue:** The main `public-pages.css` contains duplicate CSS that also exists in the individual CSS files. The individual files appear to be unused imports or leftover from refactoring.

**Fix:** Verify which files are actually imported and remove duplicates. The main `public-pages.css` appears to be self-contained.

---

### 18. [MEDIUM] Admin Dashboard HTMX Navigation May Cause Layout Issues

**File:** `src/templates/admin/layout.tsx:49-59`

**Issue:** HTMX replaces `#admin-content` innerHTML, but sidebar navigation state (`activePanel`) is determined at initial render. After HTMX navigation, the sidebar won't update its active state.

**Fix:** Either:
1. Use full page navigation instead of HTMX partial updates, OR
2. Include sidebar in HTMX swap target, OR
3. Use `hx-trigger="htmx:afterSwap from:body"` with Alpine.js/JS to update active state

---

### 19. [MEDIUM] Missing Alt Text for QR Code

**File:** `src/templates/public/pages/DonatePage.tsx:60`

**Issue:** QR code image has generic alt text that doesn't describe its purpose.

**Current:**
```tsx
<img src={qrCodeUrl} alt="Donate QR Code" ...>
```

**Fix:** More descriptive alt:
```tsx
<img src={qrCodeUrl} alt={lang === 'hi' ? 'दान के लिए UPI QR कोड स्कैन करें' : 'Scan UPI QR code to donate'} ...>
```

---

### 20. [MEDIUM] Transparency Page Document Type Hardcoded as PDF

**File:** `src/templates/public/pages/TransparencyPage.tsx:111`

**Issue:** All documents show "PDF" badge regardless of actual file type.

**Fix:** Either remove the badge or detect type from URL extension.

---

### 21. [MEDIUM] ProjectCard Fixed Heights May Cause Content Overflow

**File:** `src/templates/public/components/ProjectCard.tsx:25-26`

**Issue:** Title and description have fixed heights (`h-16`, `h-24`) that may cause text overflow with longer content.

**Current:**
```tsx
<h3 class="... h-16">{project.title}</h3>
<p class="... h-24 overflow-hidden">{project.description}</p>
```

**Fix:** Use `min-h-` instead of `h-` or add proper truncation with ellipsis:
```tsx
<h3 class="... min-h-16 line-clamp-2">{project.title}</h3>
<p class="... min-h-24 line-clamp-4">{project.description}</p>
```

---

### 22. [MEDIUM] Image Lazy Loading Not Implemented

**Files:** All components with images

**Issue:** Images load eagerly, impacting initial page load performance.

**Fix:** Add `loading="lazy"` to images below the fold:
```tsx
<img loading="lazy" src={...} alt={...} />
```

---

## Low Priority Issues

### 23. [LOW] Console Import in UI Bundle

**File:** `src/frontend/ui.ts`

**Issue:** Error handling uses `console.error` which is fine for development but should be more graceful in production.

**Line 166:**
```typescript
console.error('[media-picker] upload failed', error)
```

**Recommendation:** Consider a proper error logging/reporting mechanism for production.

---

### 24. [LOW] Deprecated Props Not Cleaned Up

**File:** `src/templates/public/layout/PublicLayout.tsx:15`

**Issue:** `navLinks` prop marked as deprecated but still in interface.

```tsx
navLinks?: Link[] // Deprecated but kept for compatibility if needed
```

**Fix:** Remove after updating all consuming pages.

---

### 25. [LOW] Inconsistent Comment Style

**Files:** Various

**Issue:** Mix of JSDoc-style and inline comments. Not a bug but affects code consistency.

---

### 26. [LOW] Missing TypeScript Strict Null Checks in Some Areas

**File:** `src/templates/admin/dashboard/ProjectsForm.tsx:78-81`

**Issue:** Team member access doesn't handle undefined gracefully.

```tsx
const getTeamMember = (index: number) => {
  if (!project?.team || !project.team[index]) return { role: { en: '', hi: '' }, name: '' };
  return project.team[index];
};
```

The return type is implicitly different between branches.

---

### 27. [LOW] Door Animation Skip Button UX

**File:** `src/templates/public/effects/TempleDoor.tsx`

**Issue:** The door animation has an "Enter the Sanctum" button, but there's no obvious way to skip the animation for returning visitors. The door toggle exists but is only visible after animation completes.

**Recommendation:** Consider storing animation-seen state in localStorage and auto-opening for returning visitors.

---

### 28. [LOW] Envelope Card Animation Requires Click to Open

**File:** `src/templates/public/blocks/EventsEnvelopeCard.tsx`

**Issue:** The envelope animation is clever but requires user interaction to see event details. Users may not realize they need to click.

**Recommendation:** Consider adding a visual hint or opening on hover for desktop.

---

## Admin Dashboard Specific Issues

### 29. [MEDIUM] Admin Forms Lack Client-Side Validation

**Files:** `ProjectsForm.tsx`, `EventsForm.tsx`, `LandingPageForm.tsx`

**Issue:** Forms rely entirely on server-side validation. No client-side feedback for required fields.

**Fix:** Add HTML5 validation attributes and/or JavaScript validation.

---

### 30. [MEDIUM] No Success/Error Toast After Form Submission

**Files:** Admin form pages

**Issue:** After saving content, there's no clear visual feedback of success or failure.

**Recommendation:** Add toast notifications for form submission results.

---

### 31. [LOW] Admin Sidebar Doesn't Highlight Current Section

**Observation:** The sidebar correctly highlights based on `activePanel` prop, but after HTMX navigation, this may become stale (see issue #18).

---

## Security Observations (No Issues Found)

The security implementation appears solid:
- CSRF protection properly implemented
- JWT validation with refresh token flow
- Rate limiting on auth endpoints
- Role-based access control (admin, trustee)
- Secure cookie settings
- Input is properly bound in SQL queries (parameterized)

---

## Implementation Priority Order

### Phase 1 - Critical (Do First)
1. Fix nested `<main>` elements (#1)
2. Fix login link href logic (#2)

### Phase 2 - High (Do Soon)
3. Localize page titles (#3)
4. Use consistent `getLocalizedHref()` (#4)
5. Add missing `key` props (#5)
6. Fix EventCard duplicate classes (#6)
7. Localize floating donation button (#7)
8. Localize hero scroll hint (#8)
9. Fix currency to INR (#9)
10. Localize empty states (#10)

### Phase 3 - Medium (Polish)
11-22. Address remaining medium issues

### Phase 4 - Low (Cleanup)
23-31. Address low priority and admin improvements

---

## Files Modified Summary

| File | Issues |
|------|--------|
| `src/config/navigation.ts` | #2 |
| `src/templates/public/layout/PublicLayout.tsx` | #1, #7, #24 |
| `src/templates/public/pages/landing.tsx` | #1, #3, #5, #11, #16 |
| `src/templates/public/pages/ProjectsPage.tsx` | #1, #3, #4, #5, #11 |
| `src/templates/public/pages/EventsPage.tsx` | #1, #3, #4, #5, #11 |
| `src/templates/public/pages/ProjectDetailPage.tsx` | #1, #3, #9, #12, #13 |
| `src/templates/public/pages/EventDetailPage.tsx` | #1, #3 |
| `src/templates/public/pages/about.tsx` | #1, #3, #4, #5, #11 |
| `src/templates/public/pages/DonatePage.tsx` | #1, #3, #10, #19 |
| `src/templates/public/pages/TransparencyPage.tsx` | #1, #3, #5, #20 |
| `src/templates/public/components/EventCard.tsx` | #6 |
| `src/templates/public/components/ProjectCard.tsx` | #21 |
| `src/templates/public/blocks/Hero.tsx` | #8 |
| `src/templates/public/layout/PublicMobileMenu.tsx` | #14 |
| `src/templates/admin/dashboard/ProjectsForm.tsx` | #15, #26 |
| `src/templates/admin/dashboard/EventsForm.tsx` | #15 |

---

*End of Review*

# Codebase Review Plan: Maa Nanda Kansuwa Trust Website

## Overview
A systematic implementation and UX review of the existing codebase. Focus is on correctness, consistency, and user experience - not scope expansion.

---

## 1. Public Pages Implementation Review

### 1.1 Landing Page (`/src/templates/public/pages/landing.tsx`)
- [ ] Hero section rendering and content display
- [ ] Projects section card layout and data binding
- [ ] Events section display and card interactions
- [ ] Door animation implementation and timing
- [ ] CTA buttons and links functionality

### 1.2 Projects Page (`/src/templates/public/pages/ProjectsPage.tsx`)
- [ ] Project list rendering and layout
- [ ] Project card implementation consistency
- [ ] Empty state handling
- [ ] Detail page navigation (`ProjectDetailPage.tsx`)
- [ ] Content rendering (TipTap HTML output)

### 1.3 Events Page (`/src/templates/public/pages/EventsPage.tsx`)
- [ ] Event list rendering and layout
- [ ] Event card envelope animation
- [ ] Date formatting and localization
- [ ] Empty state handling
- [ ] Detail page navigation (`EventDetailPage.tsx`)

### 1.4 About Page (`/src/templates/public/pages/about.tsx`)
- [ ] Content sections rendering
- [ ] Trustee information display
- [ ] Image handling and fallbacks
- [ ] Layout consistency

### 1.5 Donate Page (`/src/templates/public/pages/DonatePage.tsx`)
- [ ] Donation information display
- [ ] CTA buttons and payment links
- [ ] Bank details / QR code display
- [ ] Contact information

### 1.6 Transparency Page (`/src/templates/public/pages/TransparencyPage.tsx`)
- [ ] Financial records display
- [ ] Document links and downloads
- [ ] Data formatting

---

## 2. Navigation & Routing Review

### 2.1 Top Navigation (`/src/templates/public/PublicTopNav.tsx`)
- [ ] Desktop menu implementation
- [ ] Active link highlighting
- [ ] Language toggle functionality
- [ ] Auth state display (Login/Dashboard)
- [ ] Scroll behavior and collapse animation

### 2.2 Mobile Menu (`/src/templates/public/PublicMobileMenu.tsx`)
- [ ] Menu toggle implementation
- [ ] Menu items and links
- [ ] Overlay behavior
- [ ] Close on navigation
- [ ] Touch interactions

### 2.3 Footer (`/src/templates/public/PublicFooter.tsx`)
- [ ] Link consistency with nav
- [ ] Social links
- [ ] Copyright and legal links

### 2.4 Language Switching
- [ ] URL routing (`/` vs `/hi/`)
- [ ] State preservation during switch
- [ ] Toggle button UX
- [ ] Content fallback when translation missing

### 2.5 Route Configuration (`/src/routes/public/pages.ts`)
- [ ] All routes properly defined
- [ ] 404 handling
- [ ] Redirect behavior

---

## 3. Component Implementation Review

### 3.1 Card Components
- [ ] `EventCard.tsx` - rendering, localization, links
- [ ] `ProjectCard.tsx` - rendering, image handling, links
- [ ] `EventsEnvelopeCard.tsx` - animation, content display

### 3.2 Layout Components
- [ ] `PublicLayout.tsx` - wrapper consistency, head tags
- [ ] Asset inclusion (CSS, JS bundles)
- [ ] Meta tags and SEO elements

### 3.3 UI Effects
- [ ] `TempleDoor.tsx` - animation timing, skip behavior
- [ ] `FloatingDonationButton.tsx` - position, visibility
- [ ] `ScrollManuscript.tsx` - scroll behavior

### 3.4 Blocks
- [ ] `Hero.tsx` - content display, responsiveness
- [ ] `DonationCta.tsx` - button behavior, styling

---

## 4. Internationalization (i18n) Review

### 4.1 Core i18n Implementation (`/src/utils/i18n.ts`)
- [ ] `parseLocalized()` correctness
- [ ] `parseLocalizedRaw()` edge cases
- [ ] `serializeLocalized()` consistency
- [ ] `getLocalizedHref()` URL generation
- [ ] `getLanguageToggle()` implementation

### 4.2 Content Localization
- [ ] Navigation labels in both languages
- [ ] Page titles and descriptions
- [ ] Button labels and CTAs
- [ ] Error messages
- [ ] Date/time formatting

### 4.3 Data Layer Localization
- [ ] Landing content (`/src/data/landing.data.ts`)
- [ ] Projects content (`/src/data/projects.data.ts`)
- [ ] Events content (`/src/data/events.data.ts`)
- [ ] About content (`/src/data/about.data.ts`)
- [ ] Donate content (`/src/data/donate.data.ts`)
- [ ] Transparency content (`/src/data/transparency.data.ts`)

---

## 5. Responsive Design & Accessibility Review

### 5.1 Responsive Breakpoints
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Fluid typography and spacing

### 5.2 Touch Interactions
- [ ] Button tap targets (minimum 44x44px)
- [ ] Swipe gestures (if any)
- [ ] Touch feedback states

### 5.3 Accessibility
- [ ] Keyboard navigation
- [ ] Focus states visibility
- [ ] Skip links
- [ ] ARIA labels where needed
- [ ] Color contrast
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] Screen reader compatibility

### 5.4 CSS Implementation (`/src/styles/`)
- [ ] `base.css` - reset and foundation
- [ ] `tokens.css` - design token consistency
- [ ] `nav.css` - navigation styles
- [ ] `door.css` - animation styles
- [ ] `envelope.css` - card animation styles

---

## 6. Client-Side JavaScript Review

### 6.1 UI Bundle (`/src/frontend/ui.ts`)
- [ ] Theme toggle implementation
- [ ] Media picker functionality
- [ ] HTMX initialization
- [ ] Event listener cleanup

### 6.2 Public Pages Bundle (`/src/frontend/public-pages/`)
- [ ] Door animation controller
- [ ] Scroll menu behavior
- [ ] Navigation interactions

### 6.3 Error Handling
- [ ] JavaScript error boundaries
- [ ] Graceful degradation
- [ ] Console error cleanup

---

## 7. Data Layer Review

### 7.1 Data Access Functions
- [ ] `getLandingContent()` implementation
- [ ] `getProjects()` / `getProjectById()`
- [ ] `getEvents()` / `getEventById()`
- [ ] `getAboutContent()`
- [ ] `getDonateContent()`
- [ ] `getTransparencyContent()`

### 7.2 Repository Layer
- [ ] `publishRepo.ts` - publish workflow
- [ ] `previewRepo.ts` - preview functionality
- [ ] Error handling in queries

### 7.3 Database Queries
- [ ] SQL injection prevention
- [ ] Query efficiency
- [ ] NULL handling

---

## 8. Admin/Editor Review (Functional Check)

### 8.1 Editor Implementation
- [ ] TipTap editor initialization
- [ ] Save functionality
- [ ] Image upload in editor
- [ ] Preview capability

### 8.2 Admin Forms
- [ ] Form validation
- [ ] Error display
- [ ] Success feedback
- [ ] CSRF token handling

### 8.3 Content Management
- [ ] Create/Edit/Delete workflows
- [ ] Publish workflow
- [ ] Draft management

---

## 9. Error Handling & Edge Cases

### 9.1 HTTP Error Responses
- [ ] 404 page implementation
- [ ] 500 error handling
- [ ] Error page styling

### 9.2 Data Edge Cases
- [ ] Empty content handling
- [ ] Missing translations
- [ ] Invalid IDs in URLs
- [ ] Missing images

### 9.3 Network Error Handling
- [ ] Failed API calls
- [ ] Timeout handling
- [ ] Retry logic

---

## 10. Security Implementation Review

### 10.1 Middleware (`/src/middleware/`)
- [ ] Security headers correctness
- [ ] CSP policy review
- [ ] CSRF protection implementation
- [ ] Rate limiting effectiveness

### 10.2 Authentication (`/src/auth/`)
- [ ] Cookie security settings
- [ ] JWT validation
- [ ] Token refresh flow
- [ ] Logout cleanup

### 10.3 Input Sanitization
- [ ] User input handling
- [ ] HTML content sanitization
- [ ] File upload validation

---

## 11. Performance Review

### 11.1 Asset Loading
- [ ] CSS/JS bundle sizes
- [ ] Asset caching headers
- [ ] Critical CSS inlining (if any)

### 11.2 Page Caching
- [ ] KV cache implementation
- [ ] Cache invalidation
- [ ] ETag handling

### 11.3 Image Optimization
- [ ] Image sizing
- [ ] Lazy loading implementation
- [ ] Format optimization

---

## Review Execution Order

**Phase 1: Core User Journey**
1. Navigation & Routing (Section 2)
2. Landing Page (Section 1.1)
3. Projects Pages (Section 1.2)
4. Events Pages (Section 1.3)

**Phase 2: Supporting Pages**
5. About Page (Section 1.4)
6. Donate Page (Section 1.5)
7. Transparency Page (Section 1.6)

**Phase 3: Cross-Cutting Concerns**
8. Internationalization (Section 4)
9. Responsive & Accessibility (Section 5)
10. Client-Side JavaScript (Section 6)

**Phase 4: Infrastructure**
11. Data Layer (Section 7)
12. Error Handling (Section 9)
13. Security (Section 10)
14. Performance (Section 11)

**Phase 5: Admin (Functional)**
15. Admin/Editor (Section 8)

---

## Deliverables

For each section, document:
1. **Issues Found** - Bugs, inconsistencies, UX problems
2. **Priority** - Critical / High / Medium / Low
3. **Fix Recommendations** - Specific code changes needed

Final output: Consolidated list of issues with fixes, ready for implementation.

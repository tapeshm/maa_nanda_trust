# UI/UX Refactoring Plan - Maa Nanda Kansuwa Trust Website

## Overview

This plan outlines 12 UI/UX improvements for the temple website, organized by priority and implementation complexity. The changes maintain the sacred temple aesthetic while improving usability, readability, and engagement.

---

## Phase 1: High Impact, Quick Wins (1-2 hours)

### 1.1 Door Animation Speed (Priority: HIGH)
**File:** `src/styles/public-pages.css` (line 16)

**Current State:**
```css
--door-open-duration: 4500ms;
```

**Change To:**
```css
--door-open-duration: 2800ms;  /* Faster but still ceremonial */
```

**Rationale:** 4.5 seconds feels sluggish for returning users. 2.8 seconds maintains the ceremonial feel while respecting user time.

---

### 1.2 Remember Returning Users (Priority: HIGH)
**File:** `src/client/public-pages.ts` (lines 57, 208-209)

**Current State:** Uses `sessionStorage` which resets on tab close. Returning users see the door animation every session.

**Changes:**

1. **Line 57** - Update check:
```typescript
// FROM:
const hasSeenDoor = sessionStorage.getItem("doorOpened") === "1"

// TO:
const hasSeenDoor = localStorage.getItem("doorOpened") === "1" || sessionStorage.getItem("doorOpened") === "1"
```

2. **Line 208-209** - Update storage (inside `playState` OPENING handler):
```typescript
// FROM:
if (remember) {
  sessionStorage.setItem("doorOpened", "1")
}

// TO:
if (remember) {
  localStorage.setItem("doorOpened", "1")
  sessionStorage.setItem("doorOpened", "1")
}
```

**Rationale:** Returning users within 24h+ shouldn't see the door animation repeatedly. localStorage persists across sessions.

---

### 1.3 Section Spacing - Add Breathing Room (Priority: HIGH)
**File:** `src/styles/public-pages.css` (line 511)

**Current State:**
```css
.scroll-section + .scroll-section { margin-top: clamp(28px, 3vw, 48px); }
```

**Change To:**
```css
.scroll-section + .scroll-section { margin-top: clamp(48px, 6vw, 80px); }
```

**Additional:** Add decorative divider after the rule:
```css
.scroll-section + .scroll-section::before {
  content: "॥";
  display: block;
  text-align: center;
  color: var(--gold);
  opacity: 0.5;
  margin-bottom: clamp(32px, 4vw, 56px);
  font-size: 1.2rem;
  letter-spacing: 0.5em;
}
```

**Rationale:** Current spacing feels cramped. The decorative Sanskrit divider (॥) adds visual hierarchy while maintaining the temple aesthetic.

---

## Phase 2: Typography & Readability (1 hour)

### 2.1 Hindi Typography Optimization (Priority: MEDIUM)
**File:** `src/styles/public-pages.css`

**Add after line ~123 (after :root closing brace):**
```css
/* Hindi typography optimization */
:root {
  --line-height-body: 1.75;
  --line-height-heading: 1.3;
  --letter-spacing-hindi: 0.03em;
}

:lang(hi) {
  line-height: var(--line-height-body, 1.75);
  letter-spacing: var(--letter-spacing-hindi, 0.03em);
}

:lang(hi) h1, :lang(hi) h2, :lang(hi) h3 {
  line-height: var(--line-height-heading, 1.3);
}
```

**Rationale:** Devanagari script requires more vertical space and slightly increased letter-spacing for optimal readability.

---

### 2.2 Event Date Format Consistency (Priority: MEDIUM)
**File:** `src/templates/public/components/EventCard.tsx`

**Add date formatting helper before the component (around line 25):**
```typescript
function formatEventDate(startDate: string, displayDate: string | undefined, lang: Language): string {
  if (displayDate) return displayDate;

  try {
    const date = new Date(startDate);
    return date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return startDate;
  }
}
```

**Update line 42:**
```tsx
// FROM:
<p class="text-sm text-white/70 mb-1">{event.displayDate || event.startDate}</p>

// TO:
<p class="text-sm text-white/70 mb-1">{formatEventDate(event.startDate, event.displayDate, lang)}</p>
```

**Rationale:** Consistent, localized date formatting improves UX, especially for Hindi users who expect dates in their locale format.

---

## Phase 3: Interactive Polish (1.5 hours)

### 3.1 Navigation Hover States - Golden Glow (Priority: MEDIUM)
**File:** `src/styles/public-pages.css` (lines 284-287)

**Replace current hover styles:**
```css
/* FROM: */
.top-nav a:hover, .top-nav a:focus-visible {
  color: var(--nav-link-hover-color);
  background: rgba(255, 241, 210, 0.95);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 14px 28px rgba(0, 0, 0, 0.28);
}

/* TO: */
.top-nav a:hover, .top-nav a:focus-visible {
  color: var(--nav-link-hover-color);
  background: rgba(255, 241, 210, 0.95);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.35),
    0 14px 28px rgba(0, 0, 0, 0.28),
    0 0 20px rgba(212, 165, 95, 0.3);  /* Golden glow */
}

/* Add active state after hover styles: */
.top-nav a[aria-current="page"],
.top-nav a.is-active {
  background: rgba(255, 241, 210, 0.85);
  color: var(--nav-link-hover-color);
}
```

**Rationale:** Golden glow reinforces the temple theme on interaction. Active state provides wayfinding.

---

### 3.2 Project/Event Cards - Hover Lift Effect (Priority: MEDIUM)
**File:** `src/styles/public-pages.css` (lines 546-550)

**Replace `.project-card` definition:**
```css
/* FROM: */
.project-card {
  position: relative;
  background: linear-gradient(145deg, rgba(255, 248, 226, 0.96), rgba(243, 229, 194, 0.9));
  border-radius: 16px;
  border: 1px solid rgba(107, 74, 41, 0.25);
  box-shadow: 0 12px 28px rgba(20, 10, 5, 0.35);
  color: var(--text-color);
  overflow: hidden;
}

/* TO: */
.project-card {
  position: relative;
  background: linear-gradient(145deg, rgba(255, 248, 226, 0.96), rgba(243, 229, 194, 0.9));
  border-radius: 16px;
  border: 1px solid rgba(107, 74, 41, 0.25);
  box-shadow: 0 12px 28px rgba(20, 10, 5, 0.35);
  color: var(--text-color);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.project-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(20, 10, 5, 0.45), 0 0 30px rgba(212, 165, 95, 0.15);
}
```

**Rationale:** Subtle lift effect provides tactile feedback and indicates interactivity.

---

### 3.3 Door Animation Hint & Pulse (Priority: MEDIUM)
**File:** `src/templates/public/effects/TempleDoor.tsx` (lines 16-18)

**Update the enter button:**
```tsx
// FROM:
<button class="door-enter" type="button" data-door-enter>
  Enter the Sanctum
</button>

// TO:
<button class="door-enter" type="button" data-door-enter>
  <span class="door-enter-icon" aria-hidden="true">🙏</span>
  <span>Enter the Sanctum</span>
  <span class="door-enter-hint">Touch to open</span>
</button>
```

**File:** `src/styles/public-pages.css` (add after line 235)
```css
.door-enter {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: door-pulse 2s ease-in-out infinite;
}

.door-enter-icon {
  font-size: 1.2em;
  margin-bottom: 0.25rem;
}

.door-enter-hint {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 0.25rem;
  letter-spacing: 0.1em;
}

@keyframes door-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 218, 150, 0.4); }
  50% { box-shadow: 0 0 20px 5px rgba(255, 218, 150, 0.2); }
}
```

**Rationale:** First-time visitors may not realize the door is interactive. The hint and pulse animation draw attention.

---

## Phase 4: Donation & Footer Enhancement (1 hour)

### 4.1 Floating Donation Button - Diya Animation (Priority: MEDIUM)
**File:** `src/templates/public/effects/FloatingDonationButton.tsx`

**Update component:**
```tsx
const FloatingDonationButton: FC<FloatingDonationButtonProps> = ({
  href = '/donate',
  label = 'Donate',
  icon = '🪔',
}) => (
  <a
    href={href}
    class="donation-fab"
  >
    <span class="donation-fab-flame" aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </a>
)
```

**File:** `src/styles/public-pages.css` (add after line ~610)
```css
/* Floating Donation Button with Diya Animation */
.donation-fab {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--gold) 0%, #c3a45f 40%, #9c7534 100%);
  color: #1d1209;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.donation-fab:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.donation-fab-flame {
  font-size: 1.3em;
  animation: flame-flicker 1.5s ease-in-out infinite;
}

@keyframes flame-flicker {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    filter: brightness(1);
  }
  25% {
    transform: scale(1.05) rotate(-2deg);
    filter: brightness(1.1);
  }
  50% {
    transform: scale(1.02) rotate(1deg);
    filter: brightness(1.05);
  }
  75% {
    transform: scale(1.08) rotate(-1deg);
    filter: brightness(1.15);
  }
}
```

**Rationale:** The diya (lamp) icon with flickering animation creates a warm, inviting CTA that fits the temple theme.

---

### 4.2 Footer Enhancement (Priority: LOW)
**File:** `src/templates/public/layout/PublicFooter.tsx`

**Expand the footer:**
```tsx
const PublicFooter: FC<PublicFooterProps> = ({
  text = 'Crafted for iterative exploration — feedback guides the next darśan of design.',
}) => (
  <footer class="mt-16 pb-16 px-4">
    <div class="max-w-4xl mx-auto text-center space-y-6">

      {/* Contact */}
      <div class="text-sm text-white/60 space-y-1">
        <p>Maa Nanda Kansuwa Trust</p>
        <p>Kansuwa Village, Karnaprayag, Uttarakhand</p>
      </div>

      {/* Divider */}
      <div class="text-gold/40 text-xs tracking-[0.5em]">॥ ॥ ॥</div>

      {/* Tagline */}
      <p class="text-xs uppercase tracking-widest opacity-50">{text}</p>

      {/* Built with Shraddha */}
      <p class="text-xs text-amber-500/40 italic">Built with श्रद्धा</p>
    </div>
  </footer>
)
```

**Rationale:** Footer provides essential trust information and location. "Built with श्रद्धा (devotion)" adds a culturally appropriate touch.

---

## Phase 5: Contrast & Mobile UX (1 hour)

### 5.1 Glass Panel Contrast Fix (Priority: MEDIUM)
**File:** `src/styles/public-pages.css` (lines 138-142)

**Update `.glass-panel`:**
```css
/* FROM: */
.glass-panel {
  background: rgba(14, 8, 4, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* TO: */
.glass-panel {
  background: rgba(14, 8, 4, 0.82);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 218, 150, 0.12);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

**Rationale:** Improved contrast ensures text readability on glass panels, especially on lighter backgrounds.

---

### 5.2 Mobile Menu Touch Targets (Priority: MEDIUM)
**File:** `src/styles/public-pages.css` (around line 368-376)

**Update `.scroll-menu-links a`:**
```css
/* FROM: */
.scroll-menu-links a {
  text-decoration: none; color: var(--text-color);
  font-family: var(--font-heading); font-weight: 700; font-size: 16px;
  padding-bottom: 5px; border-bottom: 2px solid transparent; transition: 0.3s;
}

/* TO: */
.scroll-menu-links a {
  display: block;
  padding: 12px 20px;
  min-height: 44px;  /* iOS touch target minimum */
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-color);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.scroll-menu-links a:hover,
.scroll-menu-links a:active {
  color: var(--sindoor);
  border-bottom-color: var(--sindoor);
}

.scroll-menu-links a[aria-current="page"] {
  color: var(--gold-dark);
  border-bottom-color: var(--gold);
}
```

**Rationale:** 44px minimum touch target is Apple's HIG recommendation. Improves mobile usability significantly.

---

## Phase 6: Navigation Active State (30 min)

### 6.1 Add isActive to Navigation Config (Priority: LOW)
**File:** `src/config/navigation.ts`

**Update Link interface:**
```typescript
export interface Link {
  href: string
  label: string
  highlighted?: boolean
  isActive?: boolean  // NEW
}
```

**Update mainLinks generation to include isActive:**
```typescript
const mainLinks: Link[] = [
  { href: getLocalizedHref('/', lang), label: isHi ? 'मुखपृष्ठ' : 'Home', isActive: activePath === '/' || activePath === `/${lang}` },
  { href: getLocalizedHref('/about', lang), label: isHi ? 'हमारे बारे में' : 'About Us', isActive: activePath.includes('/about') },
  { href: getLocalizedHref('/projects', lang), label: isHi ? 'परियोजनाएं' : 'Projects', isActive: activePath.includes('/projects') },
  { href: getLocalizedHref('/events', lang), label: isHi ? 'कार्यक्रम' : 'Events', isActive: activePath.includes('/events') },
  { href: getLocalizedHref('/transparency', lang), label: isHi ? 'पारदर्शिता' : 'Transparency', isActive: activePath.includes('/transparency') },
];
```

---

### 6.2 Update Navigation Component (Priority: LOW)
**File:** `src/templates/public/layout/PublicTopNav.tsx`

**Update link rendering:**
```tsx
{config.mainLinks.map((link) => (
  <a
    key={link.href}
    href={link.href}
    aria-current={link.isActive ? 'page' : undefined}
    class={
      link.highlighted
        ? 'bg-gradient-to-br from-amber-200 to-amber-600 text-amber-900 border-2 border-amber-300/60 hover:scale-105'
        : link.isActive
          ? 'is-active'
          : ''
    }
  >
    {link.label}
  </a>
))}
```

**Rationale:** Active navigation state provides wayfinding, helping users understand their current location on the site.

---

## Implementation Priority Summary

| Priority | Phase | Estimated Time | Impact |
|----------|-------|----------------|--------|
| HIGH | 1.1 Door Speed | 5 min | UX |
| HIGH | 1.2 Remember Users | 10 min | UX |
| HIGH | 1.3 Section Spacing | 15 min | Visual |
| MEDIUM | 2.1 Hindi Typography | 15 min | Readability |
| MEDIUM | 2.2 Date Formatting | 20 min | UX |
| MEDIUM | 3.1 Nav Hover/Active | 20 min | Interaction |
| MEDIUM | 3.2 Card Hover | 10 min | Interaction |
| MEDIUM | 3.3 Door Hint | 20 min | UX |
| MEDIUM | 4.1 Donation Animation | 25 min | Engagement |
| LOW | 4.2 Footer | 15 min | Information |
| MEDIUM | 5.1 Glass Contrast | 10 min | Accessibility |
| MEDIUM | 5.2 Mobile Touch | 15 min | Mobile UX |
| LOW | 6.1-6.2 Nav Active | 20 min | Wayfinding |

**Total Estimated Time:** ~3.5 hours

---

## Files to Modify

1. `src/styles/public-pages.css` - Main stylesheet (6 changes)
2. `src/client/public-pages.ts` - Client interactions (2 changes)
3. `src/templates/public/effects/TempleDoor.tsx` - Door component (1 change)
4. `src/templates/public/effects/FloatingDonationButton.tsx` - Donation button (1 change)
5. `src/templates/public/components/EventCard.tsx` - Event card (1 change)
6. `src/templates/public/layout/PublicFooter.tsx` - Footer (1 change)
7. `src/templates/public/layout/PublicTopNav.tsx` - Navigation (1 change)
8. `src/config/navigation.ts` - Nav config (1 change)

---

## Testing Checklist

- [ ] Door animation plays at new speed (2.8s)
- [ ] Returning users skip door animation (clear localStorage to reset)
- [ ] Hindi text has improved line-height
- [ ] Event dates display in localized format
- [ ] Navigation links show golden glow on hover
- [ ] Project cards lift on hover
- [ ] Door button shows hint text and pulses
- [ ] Donation button has flame animation
- [ ] Footer displays contact information
- [ ] Glass panels have improved contrast
- [ ] Mobile menu links have adequate touch targets (44px+)
- [ ] Active navigation state is visible
- [ ] All changes work in both English and Hindi
- [ ] Reduced motion preferences are respected

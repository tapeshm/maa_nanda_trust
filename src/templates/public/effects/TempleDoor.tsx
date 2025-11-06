/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'

// [D3:pages.step-03:door-overlay] Temple door entrance effect from reference
const TempleDoor: FC = () => (
  <>
    <div
      class="door-overlay"
      data-door-state="closed"
      id="doorOverlay"
      aria-hidden="false"
    >
      <div class="door-panel door-panel--left" aria-hidden="true"></div>
      <div class="door-panel door-panel--right" aria-hidden="true"></div>
      <button class="door-enter" type="button" data-door-enter>
        Enter the Sanctum
      </button>
    </div>
    <button
      type="button"
      class="door-toggle"
      data-door-toggle
      aria-pressed="false"
    >
      <span aria-hidden="true">🛕</span>
      <span data-door-toggle-label>Close Door</span>
    </button>
  </>
)

export default TempleDoor

import { initEditors } from './bootstrap'

// [D3:editor-tiptap.step-01:entry] Register editor bootstrapping on DOM ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initEditors(), { once: true })
} else {
  initEditors()
}

// Allow other scripts (e.g., HTMX swaps) to trigger initialization on demand.
const globalScope = window as typeof window & { initEditors?: typeof initEditors }
globalScope.initEditors = initEditors

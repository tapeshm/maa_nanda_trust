// Bundle UI-related browser modules here.
// Registers Tailwind Elements custom elements (e.g., <el-dialog>).
import '@tailwindplus/elements'
import htmx from 'htmx.org'

// Theme toggle (ported from public/js/theme-toggle.js)
if (typeof window !== 'undefined') {
  const THEME_KEY = 'theme'
  const THEME_ATTRIBUTE = 'data-theme'
  const THEMES = { LIGHT: 'light', DARK: 'dark' } as const

  function applyTheme(theme: string) {
    const html = document.documentElement
    html.setAttribute(THEME_ATTRIBUTE, theme)
    if (theme === THEMES.DARK) html.classList.add('dark')
    else html.classList.remove('dark')
  }

  function initializeTheme() {
    let theme: string = THEMES.LIGHT
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved && (saved === THEMES.LIGHT || saved === THEMES.DARK)) {
        theme = saved
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = THEMES.DARK
      }
    } catch {
      /* ignore */
    }
    applyTheme(theme)
    return theme
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTRIBUTE) || THEMES.LIGHT
    const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent('themeChanged', { detail: { theme: next, previousTheme: current } }),
    )
    return next
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute(THEME_ATTRIBUTE) || THEMES.LIGHT
  }

  function setupThemeListeners() {
    document.addEventListener('click', (event) => {
      const btn = (event.target as Element | null)?.closest('[data-theme-toggle]')
      if (btn) {
        event.preventDefault()
        toggleTheme()
      }
    })

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', (e) => {
        // Only auto-switch when no explicit preference saved
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT)
        }
      })
    }
  }

  // Initialize early to avoid FOUC, then attach listeners
  initializeTheme()
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', setupThemeListeners)
  else setupThemeListeners()

  // Expose helpers for debugging/testing
  const g = window as typeof window & { ThemeToggle?: any; htmx?: typeof htmx }
  g.ThemeToggle = { toggle: toggleTheme, get: getCurrentTheme, set: applyTheme, THEMES }
}

// [D3:editor-tiptap.step-01:htmx] Expose HTMX globally so server-rendered attributes stay functional.
if (typeof window !== 'undefined') {
  const globalScope = window as typeof window & { htmx?: typeof htmx }
  globalScope.htmx = htmx
}

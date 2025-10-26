// Bundle UI-related browser modules here.
// Registers Tailwind Elements custom elements (e.g., <el-dialog>).
import '@tailwindplus/elements'
import htmx from 'htmx.org'

if (typeof window !== 'undefined') {
  const THEME_KEY = 'theme'
  const THEME_ATTRIBUTE = 'data-theme'
  const THEMES = { LIGHT: 'light', DARK: 'dark' } as const

  const applyTheme = (theme: string) => {
    const html = document.documentElement
    html.setAttribute(THEME_ATTRIBUTE, theme)
    if (theme === THEMES.DARK) html.classList.add('dark')
    else html.classList.remove('dark')
  }

  const initializeTheme = () => {
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

  const toggleTheme = () => {
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

  const getCurrentTheme = () =>
    document.documentElement.getAttribute(THEME_ATTRIBUTE) || THEMES.LIGHT

  const setupThemeListeners = () => {
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
        if (!localStorage.getItem(THEME_KEY)) {
          applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT)
        }
      })
    }
  }

  const onDomReady = (fn: () => void) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
    else fn()
  }

  // Initialize early to avoid FOUC, then attach listeners
  initializeTheme()
  onDomReady(setupThemeListeners)
  onDomReady(setupMediaPickers)

  // Expose helpers for debugging/testing
  const g = window as typeof window & { ThemeToggle?: any; htmx?: typeof htmx }
  g.ThemeToggle = { toggle: toggleTheme, get: getCurrentTheme, set: applyTheme, THEMES }
  g.htmx = htmx
}

function setupMediaPickers(): void {
  const pickers = document.querySelectorAll<HTMLElement>('[data-media-picker]')
  pickers.forEach((picker) => {
    const fileInput = picker.querySelector<HTMLInputElement>('[data-media-file]')
    const manualInput = picker.querySelector<HTMLInputElement>('[data-media-manual]')
    const clearButton = picker.querySelector<HTMLButtonElement>('[data-media-clear]')
    const previewImage = picker.querySelector<HTMLImageElement>('[data-media-preview]')
    const placeholder = picker.querySelector<HTMLElement>('[data-media-placeholder]')
    const form = picker.closest('form')
    const uploadUrl = picker.dataset.mediaUpload ?? '/admin/upload-image'

    const updateState = (value: string) => {
      const key = value.trim()
      if (manualInput) {
        manualInput.value = key
      }

      const mediaUrl = toMediaUrl(key)
      if (previewImage) {
        if (key) {
          previewImage.src = mediaUrl
          previewImage.classList.remove('hidden')
        } else {
          previewImage.src = ''
          previewImage.classList.add('hidden')
        }
      }

      if (placeholder) {
        placeholder.classList.toggle('hidden', Boolean(key))
      }

      if (clearButton) {
        clearButton.classList.toggle('hidden', !key)
      }
    }

    updateState(manualInput?.value ?? '')

    manualInput?.addEventListener('input', () => {
      updateState(manualInput.value)
    })

    clearButton?.addEventListener('click', (event) => {
      event.preventDefault()
      updateState('')
    })

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('image', file)

        const headers = new Headers()
        headers.set('Accept', 'application/json')
        const csrf = readCsrfToken(form)
        if (csrf) {
          headers.set('X-CSRF-Token', csrf)
        }

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'same-origin',
        })

        if (!response.ok) {
          throw new Error(`Upload failed (${response.status})`)
        }

        const payload = (await response.json()) as { url?: string } | null
        const uploadedUrl = typeof payload?.url === 'string' ? payload.url : ''
        const key = normalizeMediaKey(uploadedUrl)
        updateState(key)
      } catch (error) {
        console.error('[media-picker] upload failed', error)
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('Image upload failed. Please try again or choose a smaller file.')
        }
      } finally {
        fileInput.value = ''
      }
    })
  })
}

function readCsrfToken(form: HTMLFormElement | null): string | null {
  if (!form) return null
  const field = form.querySelector<HTMLInputElement>('input[name="csrf_token"]')
  return field?.value?.trim() ?? null
}

function toMediaUrl(value: string): string {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return value
  return `/media/${encodeURI(value)}`
}

function normalizeMediaKey(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.pathname.startsWith('/media/')) {
      return decodeURIComponent(parsed.pathname.slice('/media/'.length))
    }
    return decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  } catch {
    if (url.startsWith('/media/')) {
      return decodeURIComponent(url.slice('/media/'.length))
    }
    return url.replace(/^\//, '')
  }
}

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
  onDomReady(setupDynamicFormButtons)

  // Re-initialize after HTMX swaps content
  document.addEventListener('htmx:afterSwap', () => {
    setupMediaPickers()
  })

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

// Row templates for dynamic form buttons
const valuesRowTemplate = `
  <div class="sm:col-span-4">
    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Title</label>
    <div class="grid grid-cols-2 gap-2">
      <input type="text" name="values_title_en[]" placeholder="English" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="text" name="values_title_hi[]" placeholder="Hindi" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi" />
    </div>
  </div>
  <div class="sm:col-span-7">
    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
    <div class="grid grid-cols-2 gap-2">
      <input type="text" name="values_description_en[]" placeholder="English" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      <input type="text" name="values_description_hi[]" placeholder="Hindi" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi" />
    </div>
  </div>
  <div class="sm:col-span-1 flex justify-end pt-6">
    <button type="button" class="text-red-500 hover:text-red-700 p-1" data-remove-row>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  </div>
`

const trusteesRowTemplate = `
  <div class="sm:col-span-4 space-y-4">
    <div>
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Name</label>
      <div class="grid grid-cols-2 gap-2">
        <input type="text" name="trustees_name_en[]" placeholder="English" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <input type="text" name="trustees_name_hi[]" placeholder="Hindi" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi" />
      </div>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Role</label>
      <div class="grid grid-cols-2 gap-2">
        <input type="text" name="trustees_role_en[]" placeholder="English" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <input type="text" name="trustees_role_hi[]" placeholder="Hindi" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi" />
      </div>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Bio</label>
      <div class="grid grid-cols-2 gap-2">
        <textarea name="trustees_bio_en[]" placeholder="English" rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"></textarea>
        <textarea name="trustees_bio_hi[]" placeholder="Hindi" rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-hindi"></textarea>
      </div>
    </div>
  </div>

  <div class="sm:col-span-7">
    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Image</label>
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start"
      data-media-picker
      data-media-upload="/admin/upload-image"
    >
      <figure class="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800 shrink-0">
        <img
          src=""
          alt="Preview"
          class="h-full w-full object-cover hidden"
          data-media-preview
        />
        <div
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[10px] text-gray-500 dark:text-gray-300"
          data-media-placeholder
        >
          <span>No image</span>
        </div>
      </figure>

      <div class="flex-1 space-y-2 text-xs">
        <label class="block">
          <span class="font-medium text-gray-700 dark:text-gray-200">Upload</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="mt-1 block w-full text-xs text-gray-900 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
            data-media-file
          />
        </label>

        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 hidden"
          data-media-clear
        >
          Remove
        </button>

        <div class="text-gray-600 dark:text-gray-300">
          <label class="block mb-1">Media key</label>
          <input
            type="text"
            name="trustees_image_url[]"
            data-media-manual
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs dark:border-gray-600 dark:bg-gray-900"
            placeholder="images/..."
          />
        </div>
      </div>
    </div>
  </div>

  <div class="sm:col-span-1 flex justify-end">
    <button type="button" class="text-red-500 hover:text-red-700 p-1" data-remove-row>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  </div>
`

function setupDynamicFormButtons(): void {
  // Use event delegation for dynamic form buttons
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null

    // Handle Add Value button
    const addValueBtn = target?.closest('#add-value-btn')
    if (addValueBtn) {
      event.preventDefault()
      const list = document.getElementById('values-list')
      if (list) {
        const newItem = document.createElement('div')
        newItem.className = 'grid grid-cols-1 gap-4 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg relative group animate-fade-in'
        newItem.innerHTML = valuesRowTemplate
        list.appendChild(newItem)
      }
      return
    }

    // Handle Add Trustee button
    const addTrusteeBtn = target?.closest('#add-trustee-btn')
    if (addTrusteeBtn) {
      event.preventDefault()
      const list = document.getElementById('trustees-list')
      if (list) {
        const newItem = document.createElement('div')
        newItem.className = 'grid grid-cols-1 gap-6 sm:grid-cols-12 items-start bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg relative group animate-fade-in'
        newItem.innerHTML = trusteesRowTemplate
        list.appendChild(newItem)
        // Initialize media pickers for the new row
        setupMediaPickers()
      }
      return
    }

    // Handle remove row buttons
    const removeBtn = target?.closest('[data-remove-row]')
    if (removeBtn) {
      event.preventDefault()
      const row = removeBtn.closest('.grid')
      if (row) {
        row.remove()
      }
      return
    }
  })
}

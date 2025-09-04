// Entry that wires EditorFactory and default auto-init + save/cancel handling
// Bundled by Vite to public/assets/editor.js. Only runs for admins.

import { initEditors, save as saveBlocks } from './editor/factory'

function init() {
  initEditors()

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null
    if (!t) return
    const action = t.getAttribute('data-action')
    if (!action) return
    if (action === 'save' && t.dataset.target) {
      e.preventDefault()
      const slug = t.dataset.target!
      const inputId = t.getAttribute('data-input-id') || ''
      const form = (t as HTMLElement).closest('form') as HTMLFormElement | null
      if (!form) { console.warn('[editor] no form found for save button'); return }
      const input = inputId ? (document.getElementById(inputId) as HTMLInputElement | null) : null
      console.debug('[editor] saving', slug)
      saveBlocks(slug)
        .then((output: any) => {
          const blocks = output?.blocks || []
          if (input) input.value = JSON.stringify(blocks)
          console.debug('[editor] set hidden input', { id: inputId, size: input?.value?.length || 0 })
          // Trigger form submit so HTMX sends the request
          if (typeof (form as any).requestSubmit === 'function') {
            (form as any).requestSubmit()
          } else {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
          }
          console.debug('[editor] form submitted via htmx')
        })
        .catch((err: any) => {
          alert(err?.message || String(err))
        })
      return
    }
    if (action === 'cancel') {
      e.preventDefault()
      location.reload()
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

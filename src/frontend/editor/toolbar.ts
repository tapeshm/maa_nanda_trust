import { MENUBAR_BUTTON_ACTIVE_CLASSNAME } from './styles'
import type { EditorInstance, EditorProfile } from './types'
import { attachImagePanelHandlers } from './ui/ImagePanel'

const ACTIVE_CLASSES = MENUBAR_BUTTON_ACTIVE_CLASSNAME.split(/\s+/).filter(Boolean)
const toolbarRegistry = new Map<HTMLElement, () => void>()
const imagePanelRegistry = new Map<HTMLElement, () => void>()

export type CommandName =
  | 'bold'
  | 'italic'
  | 'heading-2'
  | 'heading-3'
  | 'bullet-list'
  | 'ordered-list'
  | 'image'

type ButtonHandler = (event: Event) => void

function setActiveState(button: HTMLButtonElement, active: boolean) {
  button.setAttribute('aria-pressed', active ? 'true' : 'false')
  ACTIVE_CLASSES.forEach((className) => {
    if (!className) return
    if (active) {
      button.classList.add(className)
    } else {
      button.classList.remove(className)
    }
  })
}

function canRunCommand(editor: EditorInstance, command: CommandName): boolean {
  const chain = editor.can().chain().focus()
  switch (command) {
    case 'bold':
      return chain.toggleBold().run()
    case 'italic':
      return chain.toggleItalic().run()
    case 'heading-2':
      return chain.toggleHeading({ level: 2 }).run()
    case 'heading-3':
      return chain.toggleHeading({ level: 3 }).run()
    case 'bullet-list':
      return chain.toggleBulletList().run()
    case 'ordered-list':
      return chain.toggleOrderedList().run()
    case 'image':
      return true
    default:
      return false
  }
}

function runCommand(editor: EditorInstance, command: CommandName): boolean {
  const chain = editor.chain().focus()
  switch (command) {
    case 'bold':
      return chain.toggleBold().run()
    case 'italic':
      return chain.toggleItalic().run()
    case 'heading-2':
      return chain.toggleHeading({ level: 2 }).run()
    case 'heading-3':
      return chain.toggleHeading({ level: 3 }).run()
    case 'bullet-list':
      return chain.toggleBulletList().run()
    case 'ordered-list':
      return chain.toggleOrderedList().run()
    default:
      return false
  }
}

function resolveToolbar(root: HTMLElement): HTMLElement | null {
  const id = root.dataset.editorToolbarId
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id)
}

function resolveFileInput(root: HTMLElement): HTMLInputElement | null {
  const id = root.dataset.editorImageInputId
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id) as HTMLInputElement | null
}

function resolveAltInput(root: HTMLElement): HTMLInputElement | null {
  const id = root.dataset.editorImageAltId
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id) as HTMLInputElement | null
}

// [D3:editor-tiptap.step-14:resolve-image-panel] Resolve ImagePanel element by ID
function resolveImagePanel(root: HTMLElement): HTMLElement | null {
  const id = root.dataset.editorImagePanelId
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id)
}

function gatherButtons(toolbar: HTMLElement): HTMLButtonElement[] {
  return Array.from(toolbar.querySelectorAll<HTMLButtonElement>('[data-editor-command]'))
}

function gatherCommand(button: HTMLButtonElement): CommandName | null {
  const value = button.dataset.editorCommand
  if (!value) return null
  if (
    value === 'bold' ||
    value === 'italic' ||
    value === 'heading-2' ||
    value === 'heading-3' ||
    value === 'bullet-list' ||
    value === 'ordered-list' ||
    value === 'image'
  ) {
    return value
  }
  return null
}

function activeStateFor(editor: EditorInstance, command: CommandName): boolean {
  switch (command) {
    case 'bold':
      return editor.isActive('bold')
    case 'italic':
      return editor.isActive('italic')
    case 'heading-2':
      return editor.isActive('heading', { level: 2 })
    case 'heading-3':
      return editor.isActive('heading', { level: 3 })
    case 'bullet-list':
      return editor.isActive('bulletList')
    case 'ordered-list':
      return editor.isActive('orderedList')
    default:
      return false
  }
}

function findForm(root: HTMLElement): HTMLFormElement | null {
  const form = root.closest('form')
  return form instanceof HTMLFormElement ? form : null
}

function readCsrfToken(form: HTMLFormElement | null): string | null {
  if (!form) return null
  const input = form.querySelector<HTMLInputElement>(
    'input[name="csrf_token"], input[name="_csrf"], input[name="csrfToken"]',
  )
  if (input && typeof input.value === 'string' && input.value.length > 0) {
    return input.value
  }
  return null
}

async function uploadImage(
  editor: EditorInstance,
  form: HTMLFormElement | null,
  fileInput: HTMLInputElement,
  altInput: HTMLInputElement | null,
): Promise<void> {
  const file = fileInput.files?.[0]
  if (!file) {
    return
  }

  const alt = altInput?.value?.trim() ?? ''
  if (!alt) {
    const proceed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm('Insert image without alternative text?')
        : true
    if (!proceed) {
      fileInput.value = ''
      return
    }
  }

  const formData = new FormData()
  formData.append('image', file)

  const headers = new Headers()
  headers.set('Accept', 'application/json')
  const csrf = readCsrfToken(form)
  if (csrf) {
    headers.set('X-CSRF-Token', csrf)
  }

  const response = await fetch('/admin/upload-image', {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`)
  }

  const payload = (await response.json()) as { url?: string } | null
  const url = typeof payload?.url === 'string' ? payload.url : null
  if (!url) {
    throw new Error('Upload response missing url')
  }

  // [D3:editor-tiptap.step-12:use-set-image-figure] Use setImageFigure command from imageFigure extension
  const inserted = editor.chain().focus().setImageFigure({ src: url, alt }).run()
  if (!inserted) {
    throw new Error('Failed to insert image')
  }

  fileInput.value = ''
}

function attachButtonHandlers(
  toolbar: HTMLElement,
  editor: EditorInstance,
  profile: EditorProfile,
  fileInput: HTMLInputElement | null,
  altInput: HTMLInputElement | null,
  form: HTMLFormElement | null,
): () => void {
  const buttons = gatherButtons(toolbar)
  const handlers: Array<() => void> = []

  const updateStates = () => {
    buttons.forEach((button) => {
      const command = gatherCommand(button)
      if (!command) {
        button.setAttribute('aria-pressed', 'false')
        return
      }

      if (command === 'image') {
        const enabled = profile === 'full' && !!fileInput
        button.disabled = !enabled
        setActiveState(button, false)
        return
      }

      const canRun = canRunCommand(editor, command)
      button.disabled = !canRun
      setActiveState(button, canRun && activeStateFor(editor, command))
    })
  }

  const selectionHandler = () => updateStates()
  const updateHandler = () => updateStates()

  editor.on('selectionUpdate', selectionHandler)
  editor.on('transaction', updateHandler)
  editor.on('update', updateHandler)
  handlers.push(() => editor.off('selectionUpdate', selectionHandler))
  handlers.push(() => editor.off('transaction', updateHandler))
  handlers.push(() => editor.off('update', updateHandler))

  buttons.forEach((button) => {
    const command = gatherCommand(button)
    if (!command) {
      return
    }

    const handler: ButtonHandler = async (event) => {
      event.preventDefault()
      if (command === 'image') {
        if (profile !== 'full' || !fileInput) {
          return
        }
        fileInput.click()
        return
      }
      runCommand(editor, command)
      updateStates()
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  if (fileInput) {
    const changeHandler = async () => {
      try {
        await uploadImage(editor, form, fileInput, altInput)
      } catch (error) {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('Image upload failed. Please try again.')
        }
        console.error('[editor] image upload failed', error)
      } finally {
        updateStates()
      }
    }
    fileInput.addEventListener('change', changeHandler)
    handlers.push(() => fileInput.removeEventListener('change', changeHandler))
  }

  updateStates()
  return () => handlers.forEach((teardown) => teardown())
}

// [D3:editor-tiptap.step-14:register-toolbar-and-panel] Register both toolbar and image panel
export function registerToolbarForEditor(
  root: HTMLElement,
  editor: EditorInstance,
  profile: EditorProfile,
): void {
  unregisterToolbarForEditor(root)

  const toolbar = resolveToolbar(root)
  if (!toolbar) {
    return
  }

  const fileInput = profile === 'full' ? resolveFileInput(root) : null
  const altInput = profile === 'full' ? resolveAltInput(root) : null
  const imagePanel = profile === 'full' ? resolveImagePanel(root) : null
  const form = findForm(root)

  const cleanup = attachButtonHandlers(toolbar, editor, profile, fileInput, altInput, form)
  toolbarRegistry.set(root, cleanup)

  // [D3:editor-tiptap.step-14:attach-image-panel] Attach image panel handlers for full profile
  if (imagePanel && altInput) {
    const panelCleanup = attachImagePanelHandlers(imagePanel, editor, altInput)
    imagePanelRegistry.set(root, panelCleanup)
  }
}

// [D3:editor-tiptap.step-14:unregister-panel] Unregister both toolbar and image panel
export function unregisterToolbarForEditor(root: HTMLElement): void {
  const cleanup = toolbarRegistry.get(root)
  if (cleanup) {
    cleanup()
    toolbarRegistry.delete(root)
  }

  const panelCleanup = imagePanelRegistry.get(root)
  if (panelCleanup) {
    panelCleanup()
    imagePanelRegistry.delete(root)
  }
}

export function resetToolbarForTesting(): void {
  toolbarRegistry.forEach((cleanup) => cleanup())
  toolbarRegistry.clear()
  imagePanelRegistry.forEach((cleanup) => cleanup())
  imagePanelRegistry.clear()
}

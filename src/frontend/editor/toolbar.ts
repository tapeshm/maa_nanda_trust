import { MENUBAR_BUTTON_ACTIVE_TOKENS } from './styles'
import type { EditorInstance, EditorProfile } from './types'
import { attachImagePanelHandlers } from './ui/ImagePanel'
import { EDITOR_DATA_ATTRIBUTES, isFullEditorProfile } from '../../editor/constants'
import { normalizeLinkHref } from '../../utils/editor/linkValidation'

const ACTIVE_CLASSES = MENUBAR_BUTTON_ACTIVE_TOKENS
const toolbarRegistry = new Map<HTMLElement, () => void>()
const imagePanelRegistry = new Map<HTMLElement, () => void>()

const TOOLBAR_COMMANDS = {
  BOLD: 'bold',
  ITALIC: 'italic',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  BLOCKQUOTE: 'blockquote',
  BULLET_LIST: 'bullet-list',
  ORDERED_LIST: 'ordered-list',
  LINK: 'link',
  SECTION_BREAK: 'section-break',
  IMAGE: 'image',
} as const

const NON_IMAGE_COMMANDS = [
  TOOLBAR_COMMANDS.BOLD,
  TOOLBAR_COMMANDS.ITALIC,
  TOOLBAR_COMMANDS.HEADING_2,
  TOOLBAR_COMMANDS.HEADING_3,
  TOOLBAR_COMMANDS.BLOCKQUOTE,
  TOOLBAR_COMMANDS.BULLET_LIST,
  TOOLBAR_COMMANDS.ORDERED_LIST,
  TOOLBAR_COMMANDS.LINK,
  TOOLBAR_COMMANDS.SECTION_BREAK,
] as const

export type NonImageCommand = (typeof NON_IMAGE_COMMANDS)[number]
export type CommandName = NonImageCommand | typeof TOOLBAR_COMMANDS.IMAGE
const IMAGE_COMMAND = TOOLBAR_COMMANDS.IMAGE
const TOOLBAR_COMMAND_SET: ReadonlySet<CommandName> = new Set<CommandName>([
  ...NON_IMAGE_COMMANDS,
  IMAGE_COMMAND,
])

const {
  toolbarId: DATA_ATTR_TOOLBAR_ID,
  imageInputId: DATA_ATTR_IMAGE_INPUT_ID,
  imageAltId: DATA_ATTR_IMAGE_ALT_ID,
  imagePanelId: DATA_ATTR_IMAGE_PANEL_ID,
  command: DATA_ATTR_COMMAND,
} = EDITOR_DATA_ATTRIBUTES

type ButtonHandler = (event: Event) => void
type CommandHandler = (editor: EditorInstance) => boolean

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

function focusChain(editor: EditorInstance, forCanCheck: boolean) {
  const chain = forCanCheck ? editor.can().chain() : editor.chain()
  return chain.focus()
}

type CommandDescriptor = {
  can: CommandHandler
  run: CommandHandler
  active: (editor: EditorInstance) => boolean
}

function createToggleCommand(
  toggle: (chain: ReturnType<EditorInstance['chain']>) => ReturnType<EditorInstance['chain']>,
  isActive: (editor: EditorInstance) => boolean,
): CommandDescriptor {
  const buildHandler =
    (forCanCheck: boolean): CommandHandler =>
    (editor) =>
      toggle(focusChain(editor, forCanCheck)).run()

  return {
    can: buildHandler(true),
    run: buildHandler(false),
    active: isActive,
  }
}

const commandDescriptors: Record<NonImageCommand, CommandDescriptor> = {
  [TOOLBAR_COMMANDS.BOLD]: createToggleCommand(
    (chain) => chain.toggleBold(),
    (editor) => editor.isActive('bold'),
  ),
  [TOOLBAR_COMMANDS.ITALIC]: createToggleCommand(
    (chain) => chain.toggleItalic(),
    (editor) => editor.isActive('italic'),
  ),
  [TOOLBAR_COMMANDS.HEADING_2]: createToggleCommand(
    (chain) => chain.toggleHeading({ level: 2 }),
    (editor) => editor.isActive('heading', { level: 2 }),
  ),
  [TOOLBAR_COMMANDS.HEADING_3]: createToggleCommand(
    (chain) => chain.toggleHeading({ level: 3 }),
    (editor) => editor.isActive('heading', { level: 3 }),
  ),
  [TOOLBAR_COMMANDS.BULLET_LIST]: createToggleCommand(
    (chain) => chain.toggleBulletList(),
    (editor) => editor.isActive('bulletList'),
  ),
  [TOOLBAR_COMMANDS.ORDERED_LIST]: createToggleCommand(
    (chain) => chain.toggleOrderedList(),
    (editor) => editor.isActive('orderedList'),
  ),
  [TOOLBAR_COMMANDS.LINK]: {
    can: (editor) => {
      const selection = editor.state?.selection
      if (editor.isActive('link')) {
        return true
      }
      if (!selection) {
        return false
      }
      return selection.from !== selection.to
    },
    run: (editor) => {
      const selection = editor.state?.selection
      const active = editor.isActive('link')
      const alertFn =
        typeof window !== 'undefined' && typeof window.alert === 'function'
          ? window.alert.bind(window)
          : null
      const promptFn =
        typeof window !== 'undefined' && typeof window.prompt === 'function'
          ? window.prompt.bind(window)
          : null

      if (!promptFn && !active) {
        if (alertFn) {
          alertFn('Link insertion is unavailable in this environment.')
        }
        return false
      }

      const hasSelection = Boolean(selection && selection.from !== selection.to)
      if (!hasSelection && !active) {
        if (alertFn) {
          alertFn('Select the text you would like to turn into a link.')
        }
        return false
      }

      const currentHref =
        active && typeof editor.getAttributes === 'function'
          ? (editor.getAttributes('link')?.href ?? '')
          : ''
      const input = promptFn ? promptFn('Enter link URL', currentHref) : null
      if (input === null) {
        return false
      }
      const trimmed = input.trim()
      if (trimmed.length === 0) {
        return focusChain(editor, false).extendMarkRange('link').unsetLink().run()
      }
      const normalized = normalizeLinkHref(trimmed)
      if (!normalized) {
        if (alertFn) {
          alertFn(
            'Please enter a valid URL (https://example.com, /relative/path, mailto:, or tel:).',
          )
        }
        return false
      }
      return focusChain(editor, false)
        .extendMarkRange('link')
        .setLink({ href: normalized.href })
        .run()
    },
    active: (editor) => editor.isActive('link'),
  },
  [TOOLBAR_COMMANDS.BLOCKQUOTE]: createToggleCommand(
    (chain) => chain.toggleBlockquote(),
    (editor) => editor.isActive('blockquote'),
  ),
  [TOOLBAR_COMMANDS.SECTION_BREAK]: {
    can: (editor) => focusChain(editor, true).setHorizontalRule().run(),
    run: (editor) => focusChain(editor, false).setHorizontalRule().run(),
    active: () => false,
  },
}

function resolveToolbar(root: HTMLElement): HTMLElement | null {
  const id = root.dataset[DATA_ATTR_TOOLBAR_ID.dataset]
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id)
}

function resolveFileInput(root: HTMLElement): HTMLInputElement | null {
  const id = root.dataset[DATA_ATTR_IMAGE_INPUT_ID.dataset]
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id) as HTMLInputElement | null
}

function resolveAltInput(root: HTMLElement): HTMLInputElement | null {
  const id = root.dataset[DATA_ATTR_IMAGE_ALT_ID.dataset]
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id) as HTMLInputElement | null
}

// [D3:editor-tiptap.step-14:resolve-image-panel] Resolve ImagePanel element by ID
function resolveImagePanel(root: HTMLElement): HTMLElement | null {
  const id = root.dataset[DATA_ATTR_IMAGE_PANEL_ID.dataset]
  if (!id) return null
  const doc = root.ownerDocument || document
  return doc.getElementById(id)
}

function gatherButtons(toolbar: HTMLElement): HTMLButtonElement[] {
  return Array.from(toolbar.querySelectorAll<HTMLButtonElement>(DATA_ATTR_COMMAND.selector))
}

function isToolbarCommand(value: string): value is CommandName {
  return TOOLBAR_COMMAND_SET.has(value as CommandName)
}

function gatherCommand(button: HTMLButtonElement): CommandName | null {
  const value = button.dataset[DATA_ATTR_COMMAND.dataset]
  if (!value || !isToolbarCommand(value)) return null
  return value
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
    const confirmPrompt =
      typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm : null

    if (confirmPrompt && !confirmPrompt('Insert image without alternative text?')) {
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

      if (command === IMAGE_COMMAND) {
        const enabled = isFullEditorProfile(profile) && !!fileInput
        button.disabled = !enabled
        setActiveState(button, false)
        return
      }

      const descriptor = commandDescriptors[command]
      const canRun = descriptor.can(editor)
      button.disabled = !canRun
      setActiveState(button, canRun && descriptor.active(editor))
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
      if (command === IMAGE_COMMAND) {
        if (!isFullEditorProfile(profile) || !fileInput) {
          return
        }
        fileInput.click()
        return
      }
      const descriptor = commandDescriptors[command]
      descriptor.run(editor)
      updateStates()
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  if (fileInput) {
    const changeHandler = async () => {
      if (fileInput.dataset.uploading === 'true') {
        return
      }
      fileInput.dataset.uploading = 'true'

      try {
        await uploadImage(editor, form, fileInput, altInput)
      } catch (error) {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('Image upload failed. Please try again.')
        }
        console.error('[editor] image upload failed', error)
      } finally {
        fileInput.dataset.uploading = 'false'
        fileInput.value = '' // Ensure input is cleared so change event fires again for same file
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

  const fileInput = isFullEditorProfile(profile) ? resolveFileInput(root) : null
  const altInput = isFullEditorProfile(profile) ? resolveAltInput(root) : null
  const imagePanel = isFullEditorProfile(profile) ? resolveImagePanel(root) : null
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

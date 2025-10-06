// [D3:editor-tiptap.step-14:image-panel] Contextual controls for imageFigure node

import type { EditorInstance } from '../types'

export interface ImagePanelState {
  visible: boolean
  size: 's' | 'm' | 'l' | 'xl'
  align: 'left' | 'center' | 'right'
  alt: string
}

// [D3:editor-tiptap.step-14:panel-state] Read current imageFigure attrs from selection
export function getImagePanelState(editor: EditorInstance): ImagePanelState {
  const { selection } = editor.state
  const { $from } = selection

  // Check if the current selection is within or on an imageFigure node
  // Walk up the tree from the current position to find an imageFigure
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (node?.type.name === 'imageFigure') {
      const attrs = node.attrs as { src: string; alt: string; size: string; align: string }
      return {
        visible: true,
        size: (attrs.size || 'm') as 's' | 'm' | 'l' | 'xl',
        align: (attrs.align || 'center') as 'left' | 'center' | 'right',
        alt: attrs.alt || '',
      }
    }
  }

  // Also check if a node selection contains an imageFigure
  if (selection.node && selection.node.type.name === 'imageFigure') {
    const attrs = selection.node.attrs as { src: string; alt: string; size: string; align: string }
    return {
      visible: true,
      size: (attrs.size || 'm') as 's' | 'm' | 'l' | 'xl',
      align: (attrs.align || 'center') as 'left' | 'center' | 'right',
      alt: attrs.alt || '',
    }
  }

  return {
    visible: false,
    size: 'm',
    align: 'center',
    alt: '',
  }
}

// [D3:editor-tiptap.step-14:active-classes] Import active class styles
const ACTIVE_CLASSES = [
  'bg-blue-100',
  'dark:bg-blue-900',
  'border-blue-500',
  'dark:border-blue-400',
  'text-blue-700',
  'dark:text-blue-200',
]

// [D3:editor-tiptap.step-14:update-panel-ui] Update panel UI elements with current state
export function updateImagePanelUI(
  panel: HTMLElement,
  state: ImagePanelState,
  altInput: HTMLInputElement | null,
): void {
  if (state.visible) {
    panel.classList.remove('hidden')
    panel.removeAttribute('hidden')
  } else {
    panel.classList.add('hidden')
    panel.setAttribute('hidden', '')
  }

  // Update size buttons
  const sizeButtons = panel.querySelectorAll<HTMLButtonElement>('[data-size]')
  sizeButtons.forEach((button) => {
    const isActive = button.dataset.size === state.size
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    if (isActive) {
      ACTIVE_CLASSES.forEach((cls) => button.classList.add(cls))
    } else {
      ACTIVE_CLASSES.forEach((cls) => button.classList.remove(cls))
    }
  })

  // Update align buttons
  const alignButtons = panel.querySelectorAll<HTMLButtonElement>('[data-align]')
  alignButtons.forEach((button) => {
    const isActive = button.dataset.align === state.align
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    if (isActive) {
      ACTIVE_CLASSES.forEach((cls) => button.classList.add(cls))
    } else {
      ACTIVE_CLASSES.forEach((cls) => button.classList.remove(cls))
    }
  })

  // Update alt input
  if (altInput && altInput.value !== state.alt) {
    altInput.value = state.alt
  }
}

// [D3:editor-tiptap.step-14:attach-handlers] Attach event handlers for panel actions
export function attachImagePanelHandlers(
  panel: HTMLElement,
  editor: EditorInstance,
  altInput: HTMLInputElement | null,
): () => void {
  const handlers: Array<() => void> = []

  // Size button handlers
  const sizeButtons = panel.querySelectorAll<HTMLButtonElement>('[data-size]')
  sizeButtons.forEach((button) => {
    const size = button.dataset.size as 's' | 'm' | 'l' | 'xl' | undefined
    if (!size) return

    const handler = (event: Event) => {
      event.preventDefault()
      editor.chain().focus().setImageSize(size).run()
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  // Align button handlers
  const alignButtons = panel.querySelectorAll<HTMLButtonElement>('[data-align]')
  alignButtons.forEach((button) => {
    const align = button.dataset.align as 'left' | 'center' | 'right' | undefined
    if (!align) return

    const handler = (event: Event) => {
      event.preventDefault()
      editor.chain().focus().setImageAlign(align).run()
    }

    button.addEventListener('click', handler)
    handlers.push(() => button.removeEventListener('click', handler))
  })

  // Alt input handler
  if (altInput) {
    const altHandler = () => {
      const alt = altInput.value.trim()
      editor.chain().focus().updateImageAlt(alt).run()
    }

    altInput.addEventListener('blur', altHandler)
    handlers.push(() => altInput.removeEventListener('blur', altHandler))
  }

  // Update panel on selection changes
  const updatePanel = () => {
    const state = getImagePanelState(editor)
    updateImagePanelUI(panel, state, altInput)
  }

  editor.on('selectionUpdate', updatePanel)
  editor.on('transaction', updatePanel)
  handlers.push(() => editor.off('selectionUpdate', updatePanel))
  handlers.push(() => editor.off('transaction', updatePanel))

  // Dismiss on Esc
  const keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const state = getImagePanelState(editor)
      if (state.visible) {
        editor.commands.focus()
        event.preventDefault()
      }
    }
  }
  document.addEventListener('keydown', keydownHandler)
  handlers.push(() => document.removeEventListener('keydown', keydownHandler))

  // Initial update
  updatePanel()

  return () => handlers.forEach((cleanup) => cleanup())
}

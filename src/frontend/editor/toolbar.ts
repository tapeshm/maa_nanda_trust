import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'

import { MENUBAR_BUTTON_ACTIVE_CLASSNAME } from './styles'
import type { EditorInstance, EditorProfile } from './types'
import {
  IMAGE_FIGURE_ALIGNS,
  IMAGE_FIGURE_NODE_NAME,
  IMAGE_FIGURE_SIZES,
  type ImageFigureAlign,
  type ImageFigureSize,
  type ImageFigureAttrs,
} from '../../utils/editor/extensions/imageFigure'

// [D3:editor-tiptap.step-06:toolbar-registry] Track toolbar registrations per editor root for idempotency.
const toolbarCleanups = new Map<HTMLElement, () => void>()

const ACTIVE_CLASSES = MENUBAR_BUTTON_ACTIVE_CLASSNAME.split(/\s+/).filter(Boolean)

const dimensionCache = new WeakMap<Blob, { width: number; height: number }>()
const IMAGE_SIZE_VALUES = IMAGE_FIGURE_SIZES as readonly ImageFigureSize[]
const IMAGE_ALIGN_VALUES = IMAGE_FIGURE_ALIGNS as readonly ImageFigureAlign[]
const ALT_MAX_LENGTH = 250

let decodeTextarea: HTMLTextAreaElement | null = null

function ensureDecodeTextarea(): HTMLTextAreaElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  if (!decodeTextarea) {
    decodeTextarea = document.createElement('textarea')
  }
  return decodeTextarea
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

function decodeEntities(value: string): string {
  const textarea = ensureDecodeTextarea()
  if (!textarea) {
    return value
  }
  textarea.innerHTML = value
  return textarea.value
}

function sanitizeAltValue(raw: string): { value: string; truncated: boolean } {
  if (typeof raw !== 'string') {
    return { value: '', truncated: false }
  }
  const decoded = decodeEntities(stripHtmlTags(raw))
  const normalized = normalizeWhitespace(decoded)
  const glyphs = Array.from(normalized)
  if (glyphs.length <= ALT_MAX_LENGTH) {
    return { value: normalized, truncated: false }
  }
  return { value: glyphs.slice(0, ALT_MAX_LENGTH).join(''), truncated: true }
}

function glyphLength(value: string): number {
  return Array.from(value).length
}

type CommandName =
  | 'bold'
  | 'italic'
  | 'heading-2'
  | 'heading-3'
  | 'bullet-list'
  | 'ordered-list'
  | 'image'

type ChainLike = {
  focus: () => ChainLike
  toggleBold: () => ChainLike
  toggleItalic: () => ChainLike
  toggleHeading: (options: { level: number }) => ChainLike
  toggleBulletList: () => ChainLike
  toggleOrderedList: () => ChainLike
  setImageFigure: (attrs: {
    src: string
    alt: string
    width?: number | null
    height?: number | null
    size?: ImageFigureSize
    align?: ImageFigureAlign
    captionText?: string
  }) => ChainLike
  updateImageFigure: (attrs: { size?: ImageFigureSize; align?: ImageFigureAlign }) => ChainLike
  setTextSelection: (attrs: { from: number; to: number }) => ChainLike
  run: () => boolean
}

type UploadResult = { ok: true } | { ok: false; error: unknown }

function classesFor(button: HTMLButtonElement): DOMTokenList {
  return button.classList
}

function isHTMLElement(value: unknown): value is HTMLElement {
  if (!value) return false
  if (typeof HTMLElement === 'undefined') {
    return typeof (value as any)?.nodeType === 'number'
  }
  return value instanceof HTMLElement
}

function setActive(button: HTMLButtonElement, active: boolean) {
  if (!button || !button.classList) return
  for (const cls of ACTIVE_CLASSES) {
    if (active) classesFor(button).add(cls)
    else classesFor(button).remove(cls)
  }
  button.setAttribute('aria-pressed', active ? 'true' : 'false')
}

function resolveDoc(root: HTMLElement): Document | undefined {
  const maybeDoc = root.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined)
  if (maybeDoc && typeof maybeDoc.getElementById === 'function') {
    return maybeDoc as Document
  }
  return undefined
}

function resolveElementById<T extends HTMLElement>(root: HTMLElement, attr: string): T | null {
  const doc = resolveDoc(root)
  const id = (root.dataset as DOMStringMap)?.[attr as keyof DOMStringMap]
  if (!id || !doc) return null
  const el = doc.getElementById(id)
  return (el as T | null) ?? null
}

function findActiveFigure(editor: EditorInstance): { pos: number; node: PMNode } | null {
  const figureType = editor.state?.schema?.nodes?.[IMAGE_FIGURE_NODE_NAME]
  if (!figureType) return null
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.node?.type === figureType) {
    return { pos: selection.from, node: selection.node as PMNode }
  }
  const { $from } = selection
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type === figureType) {
      const pos = $from.before(depth + 1)
      return { pos, node: node as PMNode }
    }
  }
  return null
}

function shallowAttrEqual(
  current: PMNode['attrs'],
  update: Partial<Record<keyof PMNode['attrs'], unknown>>,
): boolean {
  return Object.keys(update).every((key) => current[key] === update[key])
}

function updateFigureAttrs(
  editor: EditorInstance,
  attrs: Partial<Record<keyof ImageFigureAttrs, unknown>>,
): boolean {
  const info = findActiveFigure(editor)
  if (!info) {
    return false
  }
  const { pos, node } = info
  if (shallowAttrEqual(node.attrs, attrs)) {
    return true
  }
  const nextAttrs = { ...node.attrs, ...attrs }
  const tr = editor.state.tr.setNodeMarkup(pos, node.type, nextAttrs, node.marks)
  editor.view.dispatch(tr)
  return true
}

function figureKeyFromAttrs(attrs: Partial<ImageFigureAttrs>): string {
  const captionId = typeof attrs.captionId === 'string' ? attrs.captionId : ''
  if (captionId) return captionId
  const src = typeof attrs.src === 'string' ? attrs.src : ''
  return src
}

async function measureImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (dimensionCache.has(file)) {
    return dimensionCache.get(file) ?? null
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const dimensions = { width: bitmap.width, height: bitmap.height }
      dimensionCache.set(file, dimensions)
      if (typeof (bitmap as any).close === 'function') {
        ;(bitmap as any).close()
      }
      return dimensions
    } catch {
      // Fallback below.
    }
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return null
  }

  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(url)
    }

    const resolveOnce = (result: { width: number; height: number } | null) => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      resolve(result)
    }

    const captureDimensions = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight }
      dimensionCache.set(file, dimensions)
      resolveOnce(dimensions)
    }

    const handleError = () => resolveOnce(null)

    try {
      if (typeof image.decode === 'function') {
        image.src = url
        image.decode().then(captureDimensions).catch(handleError)
      } else {
        image.onload = captureDimensions
        image.onerror = handleError
        image.src = url
      }
    } catch {
      handleError()
    }
  })
}

function focusImageFigureCaption(editor: EditorInstance): boolean {
  const info = findActiveFigure(editor)
  if (!info) {
    return false
  }

  const captionStart = info.pos + 1
  const tr = editor.state.tr.setSelection(
    TextSelection.create(editor.state.doc, captionStart, captionStart),
  )
  tr.setMeta('scrollIntoView', false)
  editor.view.dispatch(tr)
  editor.view.focus()
  return true
}

function parseHxHeaders(form: HTMLFormElement | null): Record<string, unknown> | null {
  const raw = form?.getAttribute?.('hx-headers') ?? null
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const source = document.cookie ?? ''
  if (!source) return null
  const prefix = `${name}=`
  const match = source
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : null
}

function resolveCsrfToken(form: HTMLFormElement | null): string | null {
  const hxHeaders = parseHxHeaders(form)
  const fromHeaders =
    hxHeaders && typeof (hxHeaders as any)['X-CSRF-Token'] === 'string'
      ? String((hxHeaders as any)['X-CSRF-Token'])
      : null
  if (fromHeaders) {
    return fromHeaders
  }

  const hiddenInput = form?.querySelector?.('input[name="csrf_token"]') as HTMLInputElement | null
  if (hiddenInput && typeof hiddenInput.value === 'string' && hiddenInput.value.length > 0) {
    return hiddenInput.value
  }

  return readCookie('__Host-csrf')
}

async function uploadImage(
  editor: EditorInstance,
  form: HTMLFormElement | null,
  fileInput: HTMLInputElement,
  altInput: HTMLInputElement | null,
): Promise<UploadResult> {
  const file = fileInput?.files?.[0]
  if (!file) return { ok: true }

  const dimensionsPromise = measureImageDimensions(file).catch(() => null)

  const headers = new Headers({ Accept: 'application/json' })
  const csrf = resolveCsrfToken(form)
  if (csrf) {
    headers.set('X-CSRF-Token', csrf)
    headers.set('HX-CSRF-Token', csrf)
  }

  const formData = new FormData()
  formData.append('image', file)

  const { value: sanitizedAlt } = sanitizeAltValue(altInput?.value ?? '')
  if (
    !sanitizedAlt.trim() &&
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function'
  ) {
    const confirmed = window.confirm('Insert image without alt text?')
    if (!confirmed) {
      return { ok: true }
    }
  }

  try {
    const res = await fetch('/admin/upload-image', {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'same-origin',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Upload failed')
      throw new Error(text || 'Upload failed')
    }

    const payload = (await res.json().catch(() => ({}))) as { url?: string }
    const url = typeof payload.url === 'string' ? payload.url : null
    if (!url) {
      throw new Error('Upload response missing url')
    }

    const chain = editor.chain() as unknown as ChainLike
    const dimensions = await dimensionsPromise
    chain
      .focus()
      .setImageFigure({
        src: url,
        alt: sanitizedAlt,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        size: 'medium',
        align: 'center',
      })
      .run()
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  } finally {
    if (fileInput) {
      fileInput.value = ''
    }
  }
}

function runCommand(editor: EditorInstance, command: CommandName, level?: number): boolean {
  if (command === 'image') return false
  const chain = editor.chain() as unknown as ChainLike
  chain.focus()
  switch (command) {
    case 'bold':
      chain.toggleBold()
      break
    case 'italic':
      chain.toggleItalic()
      break
    case 'heading-2':
      chain.toggleHeading({ level: level ?? 2 })
      break
    case 'heading-3':
      chain.toggleHeading({ level: level ?? 3 })
      break
    case 'bullet-list':
      chain.toggleBulletList()
      break
    case 'ordered-list':
      chain.toggleOrderedList()
      break
    default:
      return false
  }
  return chain.run()
}

function computeState(
  editor: EditorInstance,
  command: CommandName,
): { can: boolean; active: boolean } {
  const can = editor.can?.()
  switch (command) {
    case 'bold':
      return { can: !!can?.toggleBold?.(), active: !!editor.isActive?.('bold') }
    case 'italic':
      return { can: !!can?.toggleItalic?.(), active: !!editor.isActive?.('italic') }
    case 'heading-2':
      return {
        can: !!can?.toggleHeading?.({ level: 2 }),
        active: !!editor.isActive?.('heading', { level: 2 }),
      }
    case 'heading-3':
      return {
        can: !!can?.toggleHeading?.({ level: 3 }),
        active: !!editor.isActive?.('heading', { level: 3 }),
      }
    case 'bullet-list':
      return {
        can: !!can?.toggleBulletList?.(),
        active: !!editor.isActive?.('bulletList'),
      }
    case 'ordered-list':
      return {
        can: !!can?.toggleOrderedList?.(),
        active: !!editor.isActive?.('orderedList'),
      }
    case 'image':
      return { can: true, active: false }
  }
}

function eventTargets(toolbar: HTMLElement): HTMLButtonElement[] {
  if (typeof toolbar.querySelectorAll !== 'function') return []
  return Array.from(toolbar.querySelectorAll<HTMLButtonElement>('[data-editor-command]'))
}

function formFor(root: HTMLElement): HTMLFormElement | null {
  if (typeof root.closest === 'function') {
    const form = root.closest('form')
    if (form && isHTMLElement(form)) {
      return form as HTMLFormElement
    }
  }
  return null
}

export function registerToolbarForEditor(
  root: HTMLElement,
  editor: EditorInstance | void,
  profile: EditorProfile,
): void {
  if (!root || !editor) return
  const doc = resolveDoc(root)
  if (!doc) return

  const toolbar = resolveElementById<HTMLElement>(root, 'editorToolbarId') || null
  if (!toolbar) return

  const buttons = eventTargets(toolbar)
  const panel =
    profile === 'full' ? resolveElementById<HTMLElement>(root, 'editorImagePanelId') : null
  const fileInput =
    profile === 'full' ? resolveElementById<HTMLInputElement>(root, 'editorImageInputId') : null
  const altInput =
    profile === 'full' ? resolveElementById<HTMLInputElement>(root, 'editorAltId') : null
  const altCounter =
    profile === 'full' && panel
      ? (panel.querySelector<HTMLElement>('[data-editor-image-alt-counter]') ?? null)
      : null

  const sizeButtons =
    profile === 'full' && panel
      ? Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-editor-image-size]'))
      : []
  const alignButtons =
    profile === 'full' && panel
      ? Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-editor-image-align]'))
      : []
  const captionButton =
    profile === 'full' && panel
      ? (panel.querySelector<HTMLButtonElement>('[data-editor-image-caption]') ?? null)
      : null

  const actionableButtons = [
    ...buttons,
    ...sizeButtons,
    ...alignButtons,
    ...(captionButton ? [captionButton] : []),
  ]

  if (actionableButtons.length === 0 && !fileInput && !altInput && !panel) {
    return
  }

  const form = formFor(root)

  const cleanupFns: Array<() => void> = []

  let panelVisible = false
  let desiredPanelVisible = false
  let panelScheduled = false
  let panelRafId: number | null = null
  let panelTimeoutId: ReturnType<typeof setTimeout> | null = null

  const updateAltCounterElement = (value: string) => {
    if (!altCounter) return
    const length = glyphLength(value)
    altCounter.textContent = `${length} / ${ALT_MAX_LENGTH}`
    if (typeof (altCounter as HTMLElement).dataset === 'object') {
      altCounter.dataset.editorAltLimit = length >= ALT_MAX_LENGTH ? 'reached' : 'within'
    }
  }

  const applyAltInputValue = (value: string): string => {
    if (!altInput) return ''
    const { value: sanitized, truncated } = sanitizeAltValue(value)
    if (altInput.value !== sanitized) {
      altInput.value = sanitized
    }
    if (typeof altInput.dataset === 'object') {
      if (truncated) altInput.dataset.editorAltLimit = 'reached'
      else delete altInput.dataset.editorAltLimit
    }
    updateAltCounterElement(sanitized)
    return sanitized
  }

  const currentAltInputValue = (): string => {
    if (!altInput) return ''
    const { value: sanitized, truncated } = sanitizeAltValue(altInput.value)
    if (sanitized !== altInput.value) {
      altInput.value = sanitized
    }
    if (typeof altInput.dataset === 'object') {
      if (truncated) altInput.dataset.editorAltLimit = 'reached'
      else delete altInput.dataset.editorAltLimit
    }
    updateAltCounterElement(sanitized)
    return sanitized
  }

  const cancelScheduledPanel = () => {
    if (panelRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(panelRafId)
    }
    if (panelTimeoutId !== null) {
      clearTimeout(panelTimeoutId)
    }
    panelRafId = null
    panelTimeoutId = null
    panelScheduled = false
  }

  const applyPanelVisibility = () => {
    panelScheduled = false
    panelRafId = null
    panelTimeoutId = null
    if (!panel) return
    if (panelVisible === desiredPanelVisible) return
    panelVisible = desiredPanelVisible
    panel.hidden = !panelVisible
    panel.setAttribute('aria-hidden', panelVisible ? 'false' : 'true')
  }

  const schedulePanelVisibility = (visible: boolean) => {
    if (!panel) return
    desiredPanelVisible = visible
    if (!panelScheduled && panelVisible === visible) {
      return
    }
    if (panelScheduled) return
    panelScheduled = true
    const run = () => applyPanelVisibility()
    if (typeof requestAnimationFrame === 'function') {
      panelRafId = requestAnimationFrame(run)
    } else {
      panelTimeoutId = setTimeout(run, 0)
    }
  }

  let lastFigureKey: string | null = null
  let lastAltValueFromNode = ''

  const synchronizeAltInput = (
    attrs: ImageFigureAttrs | null,
    figureActive: boolean,
    activeElement: Element | null,
  ) => {
    if (!altInput) return
    const disabled = !figureActive || !attrs
    altInput.disabled = disabled
    if (disabled) {
      altInput.setAttribute('aria-disabled', 'true')
      lastFigureKey = null
      lastAltValueFromNode = ''
      applyAltInputValue('')
      return
    }

    altInput.removeAttribute('aria-disabled')

    const figureKey = figureKeyFromAttrs(attrs)
    const attrAlt = sanitizeAltValue(attrs.alt ?? '').value
    const shouldUpdateValue = figureKey !== lastFigureKey || activeElement !== altInput

    if (shouldUpdateValue && activeElement !== altInput) {
      lastAltValueFromNode = applyAltInputValue(attrAlt)
    } else {
      updateAltCounterElement(currentAltInputValue())
    }
    lastFigureKey = figureKey
  }

  const isWithinEditorChrome = (element: Element | null | undefined): boolean => {
    if (!element) return false
    if (panel && panel.contains(element)) {
      return true
    }
    if (toolbar.contains(element)) {
      return true
    }
    if (root.contains(element)) {
      return true
    }
    return false
  }

  const updateButtonStates = () => {
    const figureInfo = findActiveFigure(editor)
    const figureActive = !!figureInfo
    const attrs = figureActive ? (figureInfo.node.attrs as ImageFigureAttrs) : null

    schedulePanelVisibility(figureActive)
    const activeElement =
      (altInput?.ownerDocument?.activeElement as Element | null | undefined) ??
      (typeof document !== 'undefined' ? (document.activeElement as Element | null) : null)
    synchronizeAltInput(attrs, figureActive, activeElement)

    const rawSize = attrs?.size
    const normalizedSize: ImageFigureSize = IMAGE_SIZE_VALUES.includes(
      (rawSize as ImageFigureSize) ?? 'medium',
    )
      ? ((rawSize as ImageFigureSize) ?? 'medium')
      : 'medium'
    const rawAlign = attrs?.align
    const normalizedAlign: ImageFigureAlign = IMAGE_ALIGN_VALUES.includes(
      (rawAlign as ImageFigureAlign) ?? 'center',
    )
      ? ((rawAlign as ImageFigureAlign) ?? 'center')
      : 'center'

    buttons.forEach((button) => {
      const command = button.dataset?.editorCommand as CommandName | undefined
      if (!command) return
      if (command === 'image') {
        button.disabled = profile !== 'full'
        setActive(button, false)
        return
      }
      const state = computeState(editor, command)
      button.disabled = !state.can
      setActive(button, state.active)
    })

    sizeButtons.forEach((button) => {
      const value = button.dataset?.editorImageSize as ImageFigureSize | undefined
      const isValidValue = !!value && IMAGE_SIZE_VALUES.includes(value)
      button.disabled = !figureActive
      const isActive = figureActive && isValidValue && normalizedSize === value
      setActive(button, isActive)
    })

    alignButtons.forEach((button) => {
      const value = button.dataset?.editorImageAlign as ImageFigureAlign | undefined
      const isValidValue = !!value && IMAGE_ALIGN_VALUES.includes(value)
      button.disabled = !figureActive
      const isActive = figureActive && isValidValue && normalizedAlign === value
      setActive(button, isActive)
    })

    if (captionButton) {
      captionButton.disabled = !figureActive
      let captionActive = false
      if (figureActive) {
        const { $from } = editor.state.selection
        for (let depth = $from.depth; depth >= 0; depth -= 1) {
          if ($from.node(depth).type?.name === IMAGE_FIGURE_NODE_NAME) {
            captionActive = depth < $from.depth
            break
          }
        }
      }
      setActive(captionButton, captionActive)
    }
  }

  buttons.forEach((button) => {
    const command = button.dataset?.editorCommand as CommandName | undefined
    if (!command) return
    const handler: EventListener = (event) => {
      event.preventDefault()
      if (command === 'image') {
        if (profile === 'full' && fileInput) {
          fileInput.click?.()
        }
        return
      }
      runCommand(
        editor,
        command,
        command === 'heading-2' ? 2 : command === 'heading-3' ? 3 : undefined,
      )
      updateButtonStates()
    }
    button.addEventListener?.('click', handler)
    cleanupFns.push(() => button.removeEventListener?.('click', handler))
  })

  if (fileInput) {
    const changeHandler = async () => {
      const result = await uploadImage(editor, form, fileInput, altInput)
      if (!result.ok) {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('Image upload failed. Please try again.')
        }
        console.error('[editor] Image upload failed', result.error)
        if (typeof CustomEvent === 'function') {
          toolbar.dispatchEvent?.(
            new CustomEvent('editor:image-upload-error', { detail: result.error }),
          )
        }
      }
      updateButtonStates()
    }
    fileInput.addEventListener?.('change', changeHandler)
    cleanupFns.push(() => fileInput.removeEventListener?.('change', changeHandler as any))
  }

  sizeButtons.forEach((button) => {
    const handler: EventListener = (event) => {
      event.preventDefault()
      const value = button.dataset?.editorImageSize as ImageFigureSize | undefined
      if (!value || !IMAGE_SIZE_VALUES.includes(value)) {
        return
      }
      if (!editor.isActive?.(IMAGE_FIGURE_NODE_NAME)) {
        return
      }
      ;(editor.chain() as unknown as ChainLike).focus().updateImageFigure({ size: value }).run()
      updateButtonStates()
    }
    button.addEventListener('click', handler)
    cleanupFns.push(() => button.removeEventListener('click', handler))
  })

  alignButtons.forEach((button) => {
    const handler: EventListener = (event) => {
      event.preventDefault()
      const value = button.dataset?.editorImageAlign as ImageFigureAlign | undefined
      if (!value || !IMAGE_ALIGN_VALUES.includes(value)) {
        return
      }
      if (!editor.isActive?.(IMAGE_FIGURE_NODE_NAME)) {
        return
      }
      ;(editor.chain() as unknown as ChainLike).focus().updateImageFigure({ align: value }).run()
      updateButtonStates()
    }
    button.addEventListener('click', handler)
    cleanupFns.push(() => button.removeEventListener('click', handler))
  })

  if (captionButton) {
    const handler: EventListener = (event) => {
      event.preventDefault()
      if (focusImageFigureCaption(editor)) {
        updateButtonStates()
      }
    }
    captionButton.addEventListener('click', handler)
    cleanupFns.push(() => captionButton.removeEventListener('click', handler))
  }

  if (altInput) {
    const inputHandler = () => {
      const sanitized = currentAltInputValue()
      if (!editor.isActive?.(IMAGE_FIGURE_NODE_NAME)) {
        return
      }
      if (sanitized === lastAltValueFromNode) {
        return
      }
      if (updateFigureAttrs(editor, { alt: sanitized })) {
        lastAltValueFromNode = sanitized
      }
    }

    const pasteHandler = (event: ClipboardEvent) => {
      if (!event.clipboardData) {
        return
      }
      event.preventDefault()
      const text = event.clipboardData.getData('text/plain') ?? ''
      const sanitized = applyAltInputValue(text)
      if (!editor.isActive?.(IMAGE_FIGURE_NODE_NAME)) {
        return
      }
      if (sanitized === lastAltValueFromNode) {
        return
      }
      if (updateFigureAttrs(editor, { alt: sanitized })) {
        lastAltValueFromNode = sanitized
      }
    }

    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        applyAltInputValue(lastAltValueFromNode)
        altInput.blur()
        if (typeof editor.commands?.focus === 'function') {
          editor.commands.focus()
        } else {
          editor.view?.focus()
        }
      }
    }
    altInput.addEventListener('input', inputHandler)
    altInput.addEventListener('paste', pasteHandler)
    altInput.addEventListener('keydown', keydownHandler)
    cleanupFns.push(() => {
      altInput.removeEventListener('input', inputHandler)
      altInput.removeEventListener('paste', pasteHandler)
      altInput.removeEventListener('keydown', keydownHandler)
    })
  }

  const captionEscapeHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return
    }
    if (editor.state.selection instanceof NodeSelection) {
      return
    }
    const { $from } = editor.state.selection
    let insideCaption = false
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const nodeAtDepth = $from.node(depth)
      if (nodeAtDepth.type?.name === IMAGE_FIGURE_NODE_NAME) {
        insideCaption = depth < $from.depth
        break
      }
    }
    if (!insideCaption) {
      return
    }
    const info = findActiveFigure(editor)
    if (!info) {
      return
    }
    event.preventDefault()
    const afterPos = info.pos + info.node.nodeSize
    const tr = editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, afterPos, afterPos),
    )
    tr.setMeta('scrollIntoView', false)
    editor.view.dispatch(tr)
    editor.view.focus()
  }
  editor.view?.dom.addEventListener('keydown', captionEscapeHandler)
  cleanupFns.push(() => editor.view?.dom.removeEventListener('keydown', captionEscapeHandler))

  const transactionHandler = () => updateButtonStates()
  const selectionHandler = () => updateButtonStates()
  const updateHandler = () => updateButtonStates()
  const focusHandler = () => updateButtonStates()
  const blurHandler = ({ event }: { event?: FocusEvent }) => {
    const nextFocus =
      (event?.relatedTarget as Element | null | undefined) ??
      (doc?.activeElement as Element | null | undefined) ??
      null
    if (isWithinEditorChrome(nextFocus)) {
      return
    }
    schedulePanelVisibility(false)
  }
  editor.on?.('transaction' as any, transactionHandler)
  editor.on?.('selectionUpdate' as any, selectionHandler)
  editor.on?.('update' as any, updateHandler)
  editor.on?.('focus' as any, focusHandler)
  editor.on?.('blur' as any, blurHandler)
  cleanupFns.push(() => editor.off?.('transaction' as any, transactionHandler))
  cleanupFns.push(() => editor.off?.('selectionUpdate' as any, selectionHandler))
  cleanupFns.push(() => editor.off?.('update' as any, updateHandler))
  cleanupFns.push(() => editor.off?.('focus' as any, focusHandler))
  cleanupFns.push(() => editor.off?.('blur' as any, blurHandler))

  const cleanup = () => {
    cancelScheduledPanel()
    cleanupFns.forEach((fn) => fn())
    toolbarCleanups.delete(root)
  }

  const previous = toolbarCleanups.get(root)
  if (previous) previous()
  toolbarCleanups.set(root, cleanup)

  updateButtonStates()
}

export function unregisterToolbarForEditor(root: HTMLElement): void {
  const cleanup = toolbarCleanups.get(root)
  if (cleanup) {
    cleanup()
  }
}

export function resetToolbarForTesting(): void {
  for (const cleanup of Array.from(toolbarCleanups.values())) {
    cleanup()
  }
  toolbarCleanups.clear()
}

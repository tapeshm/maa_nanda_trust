import { EMPTY_DOC, readInitialContent } from './content'
import type { EditorInstance, JSONContent } from './types'

const FORM_SELECTOR = 'form[data-editor-form]'
const EDITOR_SELECTOR = '[data-editor]'

function isFormElement(value: unknown): value is HTMLFormElement {
  if (!value) {
    return false
  }

  const candidate = value as HTMLFormElement
  return (
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.querySelectorAll === 'function' &&
    typeof candidate.querySelector === 'function' &&
    typeof candidate.appendChild === 'function' &&
    typeof candidate.contains === 'function'
  )
}

function isFunction<T extends (...args: any[]) => any>(maybeFn: unknown): maybeFn is T {
  return typeof maybeFn === 'function'
}

export function hasEditorHiddenFields(form: HTMLFormElement): boolean {
  return Boolean(form.querySelector('input[type="hidden"][data-editor-field]'))
}

function safeJsonStringify(payload: JSONContent): string {
  try {
    return JSON.stringify(payload)
  } catch (error) {
    console.error('[editor] Failed to serialize content_json payload', error)
    return JSON.stringify(EMPTY_DOC)
  }
}

function coerceParameters(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== 'object') {
    return null
  }

  const parameters = (detail as { parameters?: unknown }).parameters
  if (!parameters || typeof parameters !== 'object') {
    return null
  }

  return parameters as Record<string, unknown>
}

function isCustomEvent(event: Event): event is CustomEvent {
  return 'detail' in event
}

type EditorSources = {
  getJSON?: () => JSONContent
  getHTML?: () => string
}

export class FormSync {
  private editorSources = new WeakMap<HTMLElement, EditorSources>()
  private registeredForms = new WeakSet<HTMLFormElement>()
  private formList = new Set<HTMLFormElement>()
  private missingIdWarnings = new WeakSet<HTMLElement>()

  init(doc?: Pick<Document, 'querySelectorAll'>): void {
    this.scanForms(doc)
  }

  registerEditor(root: HTMLElement, instance: EditorInstance | void): void {
    if (!instance || !isFunction(instance.getJSON)) {
      this.editorSources.delete(root)
      return
    }

    const sources: EditorSources = {
      getJSON: () => instance.getJSON(),
    }

    if (isFunction(instance.getHTML)) {
      sources.getHTML = () => instance.getHTML()
    }

    this.editorSources.set(root, sources)
    this.refreshFormsForEditor(root)
  }

  unregisterEditor(root: HTMLElement): void {
    this.editorSources.delete(root)
  }

  registerFormElement(form: HTMLFormElement): void {
    this.registerForm(form)
  }

  resetForTesting(): void {
    this.editorSources = new WeakMap()
    this.registeredForms = new WeakSet()
    this.formList = new Set()
    this.missingIdWarnings = new WeakSet()
  }

  private scanForms(doc?: Pick<Document, 'querySelectorAll'>): void {
    const context = doc ?? (typeof document !== 'undefined' ? document : undefined)
    if (!context || typeof context.querySelectorAll !== 'function') {
      return
    }

    const forms = context.querySelectorAll(FORM_SELECTOR)
    forms.forEach((candidate) => {
      if (isFormElement(candidate)) {
        this.registerForm(candidate)
      }
    })
  }

  private registerForm(form: HTMLFormElement): void {
    if (this.registeredForms.has(form)) {
      return
    }

    const submitListener: EventListener = (event) => this.handleSubmit(event, form)
    const htmxConfigListener: EventListener = (event) => this.handleHtmxConfigRequest(event, form)

    form.addEventListener('submit', submitListener, { capture: true })
    form.addEventListener('htmx:configRequest' as any, htmxConfigListener)

    this.registeredForms.add(form)
    this.formList.add(form)

    // Populate hidden inputs immediately so progressive enhancement works on first submit.
    this.serializeForm(form)
  }

  private handleSubmit(event: Event, fallback: HTMLFormElement): void {
    const form = this.resolveFormFromEvent(event, fallback)
    if (!form) {
      return
    }

    this.serializeForm(form)
  }

  private handleHtmxConfigRequest(event: Event, fallback: HTMLFormElement): void {
    const form = this.resolveFormFromEvent(event, fallback)
    if (!form) {
      return
    }

    this.serializeForm(form)

    if (!isCustomEvent(event)) {
      return
    }

    const parameters = coerceParameters(event.detail)
    if (!parameters) {
      return
    }

    this.populateParametersFromEditors(form, parameters)
  }

  private resolveFormFromEvent(event: Event, fallback: HTMLFormElement): HTMLFormElement | null {
    const { currentTarget, target } = event

    if (isFormElement(currentTarget)) {
      return currentTarget
    }

    if (isFormElement(fallback)) {
      return fallback
    }

    if (isFormElement(target)) {
      return target
    }

    return null
  }

  private serializeForm(form: HTMLFormElement): void {
    this.editorsWithin(form).forEach((root) => this.updateHiddenFields(form, root))
  }

  private editorsWithin(form: HTMLFormElement): HTMLElement[] {
    const nodes = form.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)
    return Array.from(nodes)
  }

  private updateHiddenFields(form: HTMLFormElement, root: HTMLElement): void {
    const editorId = root.id?.trim()
    if (!editorId) {
      this.warnMissingIdOnce(root)
      return
    }

    const jsonField = this.ensureJsonField(form, editorId)
    const htmlField = this.ensureHtmlField(form, editorId)
    const content = this.resolveContent(root)
    jsonField.value = safeJsonStringify(content)
    htmlField.value = this.resolveHtml(root)
  }

  private ensureJsonField(form: HTMLFormElement, editorId: string): HTMLInputElement {
    const existing = this.getHiddenJsonField(form, editorId)
    return existing ?? this.createJsonField(form, editorId)
  }

  private ensureHtmlField(form: HTMLFormElement, editorId: string): HTMLInputElement {
    const existing = this.getHiddenHtmlField(form, editorId)
    return existing ?? this.createHtmlField(form, editorId)
  }

  private getHiddenJsonField(form: HTMLFormElement, editorId: string): HTMLInputElement | null {
    return form.querySelector(`input[type="hidden"][data-editor-field="${editorId}"]`)
  }

  private getHiddenHtmlField(form: HTMLFormElement, editorId: string): HTMLInputElement | null {
    return form.querySelector(`input[type="hidden"][data-editor-html-field="${editorId}"]`)
  }

  private createJsonField(form: HTMLFormElement, editorId: string): HTMLInputElement {
    const node = form.ownerDocument?.createElement
      ? form.ownerDocument.createElement('input')
      : document.createElement('input')

    node.type = 'hidden'
    node.name = `content_json[${editorId}]`
    node.setAttribute('data-editor-field', editorId)
    form.appendChild(node)
    return node as HTMLInputElement
  }

  private createHtmlField(form: HTMLFormElement, editorId: string): HTMLInputElement {
    const node = form.ownerDocument?.createElement
      ? form.ownerDocument.createElement('input')
      : document.createElement('input')

    node.type = 'hidden'
    node.name = `content_html[${editorId}]`
    node.setAttribute('data-editor-html-field', editorId)
    form.appendChild(node)
    return node as HTMLInputElement
  }

  private resolveContent(root: HTMLElement): JSONContent {
    const sources = this.editorSources.get(root)
    if (sources?.getJSON) {
      try {
        const value = sources.getJSON()
        if (value && typeof value === 'object') {
          return value
        }
      } catch (error) {
        console.error('[editor] Failed to read editor state for serialization', error)
      }
    }
    return readInitialContent(root)
  }

  private resolveHtml(root: HTMLElement): string {
    const sources = this.editorSources.get(root)
    if (sources?.getHTML) {
      try {
        const value = sources.getHTML()
        if (typeof value === 'string') {
          return value
        }
      } catch (error) {
        console.error('[editor] Failed to read editor HTML for serialization', error)
      }
    }
    return ''
  }

  private warnMissingIdOnce(root: HTMLElement): void {
    if (this.missingIdWarnings.has(root)) {
      return
    }
    this.missingIdWarnings.add(root)
    console.warn('[editor] Editor root is missing an id; serialization skipped.', root)
  }

  private refreshFormsForEditor(root: HTMLElement): void {
    this.formList.forEach((form) => {
      if (!form.isConnected) {
        this.formList.delete(form)
        return
      }
      if (form.contains(root)) {
        this.updateHiddenFields(form, root)
      }
    })
  }

  private populateParametersFromEditors(
    form: HTMLFormElement,
    parameters: Record<string, unknown>,
  ): void {
    this.editorsWithin(form).forEach((root) => {
      const editorId = root.id?.trim()
      if (!editorId) {
        this.warnMissingIdOnce(root)
        return
      }

      const content = this.resolveContent(root)
      parameters[`content_json[${editorId}]`] = safeJsonStringify(content)
      const html = this.resolveHtml(root)
      parameters[`content_html[${editorId}]`] = html
    })
  }
}

// EditorFactory: create Editor.js instances with lazy-loaded tool presets

type EditorModule = any

type PresetLoader = () => Promise<Record<string, any>>

const editors = new Map<string, any>()

async function loadCore() {
  const EditorJS = await import('@editorjs/editorjs').then((m) => m.default || (m as unknown as EditorModule))
  return EditorJS
}

// Built-in presets. Keep only tools already in dependencies.
const presets: Record<string, PresetLoader> = {
  // A small set of common tools suitable for most text sections
  simple: async () => {
    const [Header, Paragraph, Marker, InlineCode] = await Promise.all([
      import('@editorjs/header').then((m) => m.default || (m as unknown as EditorModule)),
      import('@editorjs/paragraph').then((m) => m.default || (m as unknown as EditorModule)),
      import('@editorjs/marker').then((m) => m.default || (m as unknown as EditorModule)),
    ])
    return {
      header: { class: Header, inlineToolbar: ['marker', 'inlineCode'] },
      paragraph: { class: Paragraph, inlineToolbar: ['marker', 'inlineCode'] },
      marker: Marker,
      inlineCode: InlineCode,
    }
  },
  // Alias to simple; can diverge later as needs grow
  default: async () => presets.simple(),
  // Title-focused preset (headers only)
  title: async () => {
    const Header = await import('@editorjs/header').then((m) => m.default || (m as unknown as EditorModule))
    return {
      header: { class: Header, inlineToolbar: [] },
    }
  },
}

export function registerPreset(name: string, loader: PresetLoader) {
  presets[name] = loader
}

export function parseInitialFromScript(scriptId: string): any {
  try {
    const el = document.getElementById(scriptId)
    if (!el) return { blocks: [] }
    const jsonText = el.textContent || '[]'
    const parsed = JSON.parse(jsonText)
    if (Array.isArray(parsed)) return { blocks: parsed }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).blocks)) return parsed
    return { blocks: [] }
  } catch {
    return { blocks: [] }
  }
}

export async function createEditor(holder: HTMLElement, opts: { slug: string; type?: string; data?: any }) {
  const EditorJS = await loadCore()
  const type = opts.type || 'simple'
  const loadTools = presets[type] || presets.simple
  const tools = await loadTools()
  const editor = new EditorJS({
    holder,
    tools,
    data: opts.data || { blocks: [] },
    minHeight: 0,
  })
  editors.set(opts.slug, editor)
  return editor
}

export async function initEditors() {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-editor="true"]'))
  if (containers.length === 0) return
  for (const el of containers) {
    const slug = el.dataset.slug || ''
    const type = el.dataset.editorType || 'simple'
    const scriptId = el.dataset.scriptId || ''
    const data = parseInitialFromScript(scriptId)
    await createEditor(el, { slug, type, data })
  }
}

export async function save(slug: string) {
  const editor = editors.get(slug)
  if (!editor) return
  const output = await editor.save()
  return output
}

// Expose on window for ad-hoc usage
declare global {
  interface Window {
    EditorFactory?: {
      createEditor: typeof createEditor
      initEditors: typeof initEditors
      registerPreset: typeof registerPreset
      save: typeof save
    }
  }
}

// Attach immediately so pages can hook in custom presets before DOM ready
if (typeof window !== 'undefined') {
  window.EditorFactory = { createEditor, initEditors, registerPreset, save }
}


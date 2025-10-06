import type { EditorFactory, EditorInstance, EditorProfile } from './types'
import { readInitialContent } from './content'
import { registerDefaultEditorProfiles } from './factory'
import {
  initEditorForms,
  registerEditorContentSource,
  resetEditorFormSyncForTesting,
  unregisterEditorContentSource,
} from './form'
import {
  registerToolbarForEditor,
  resetToolbarForTesting,
  unregisterToolbarForEditor,
} from './toolbar'

const DEFAULT_PROFILE: EditorProfile = 'basic'

// [D3:editor-tiptap.step-01:registry] Track registered profile factories and mount states.
const profileFactories = new Map<EditorProfile, EditorFactory>()
let mountedEditors = new WeakMap<HTMLElement, MountEntry>()
let domReadyListenerAttached = false
const EDITOR_SELECTOR = '[data-editor]'
const FORM_SELECTOR = 'form[data-editor-form]'
let lifecycleListenersAttached = false
let mutationObserver: MutationObserver | null = null
let scheduledInitializer = false
let htmxAfterSwapListener: EventListener | null = null
let htmxBeforeCleanupListener: EventListener | null = null

interface MountEntry {
  profile: EditorProfile
  mountPromise: Promise<void>
  instance?: EditorInstance | void
}

function isHTMLElement(value: unknown): value is HTMLElement {
  if (!value) return false
  if (typeof HTMLElement === 'undefined') {
    return (
      typeof (value as any)?.nodeType === 'number' &&
      typeof (value as any)?.querySelectorAll === 'function'
    )
  }
  return value instanceof HTMLElement
}

function hasDatasetFlag(node: unknown, key: 'editor' | 'editorForm'): boolean {
  const dataset = (node as any)?.dataset
  if (!dataset || typeof dataset !== 'object') {
    return false
  }
  return key in dataset
}

function asEventTargetElement(value: unknown): HTMLElement | null {
  if (!value) return null
  if (isHTMLElement(value)) {
    return value
  }
  if (typeof (value as any)?.addEventListener === 'function') {
    return value as HTMLElement
  }
  return null
}

function nodeHasEditorOrForm(candidate: HTMLElement): boolean {
  if (typeof candidate.matches === 'function') {
    if (candidate.matches(EDITOR_SELECTOR) || candidate.matches(FORM_SELECTOR)) {
      return true
    }
  }

  if (hasDatasetFlag(candidate, 'editor') || hasDatasetFlag(candidate, 'editorForm')) {
    return true
  }

  if (typeof candidate.querySelector === 'function') {
    if (candidate.querySelector(EDITOR_SELECTOR) || candidate.querySelector(FORM_SELECTOR)) {
      return true
    }
  }

  return false
}

function collectEditorRoots(node: Node | null | undefined, bucket: Set<HTMLElement>): void {
  if (!node) {
    return
  }

  if (isHTMLElement(node)) {
    const isEditorNode =
      (typeof node.matches === 'function' && node.matches(EDITOR_SELECTOR)) ||
      hasDatasetFlag(node, 'editor')
    if (isEditorNode) {
      bucket.add(node)
    }
  }

  const parent = node as ParentNode
  if (parent && typeof parent.querySelectorAll === 'function') {
    parent.querySelectorAll<HTMLElement>(EDITOR_SELECTOR).forEach((child) => {
      bucket.add(child)
    })
  }
}

function scheduleInitializers(): void {
  if (scheduledInitializer) {
    return
  }
  scheduledInitializer = true
  queueMicrotask(() => {
    scheduledInitializer = false
    runInitializers()
  })
}

function teardownEditor(root: HTMLElement): void {
  const entry = mountedEditors.get(root)
  mountedEditors.delete(root)
  unregisterEditorContentSource(root)
  unregisterToolbarForEditor(root)

  if (!entry) {
    return
  }

  const destroyInstance = () => {
    const instance = entry.instance
    if (instance && typeof instance.destroy === 'function') {
      try {
        instance.destroy()
      } catch (error) {
        console.error(`[editor] Failed to destroy profile "${entry.profile}"`, error)
      }
    }
  }

  if (entry.instance) {
    destroyInstance()
    return
  }

  entry.mountPromise
    .then(() => {
      destroyInstance()
    })
    .catch(() => {
      // Ignore mount errors; they are already logged during mount.
    })
}

function handleBeforeCleanup(event: Event): void {
  const targets = new Set<HTMLElement>()

  if (isHTMLElement(event?.target)) {
    collectEditorRoots(event.target as HTMLElement, targets)
  }

  const fragment = (event as CustomEvent).detail?.fragment as Node | undefined
  collectEditorRoots(fragment, targets)

  targets.forEach((root) => teardownEditor(root))
}

function setupLifecycleListeners(): void {
  if (lifecycleListenersAttached) {
    return
  }

  lifecycleListenersAttached = true

  if (typeof document !== 'undefined') {
    const body = asEventTargetElement((document as any)?.body)

    if (body && typeof body.addEventListener === 'function') {
      if (!htmxAfterSwapListener) {
        htmxAfterSwapListener = () => {
          scheduleInitializers()
        }
      }
      if (!htmxBeforeCleanupListener) {
        htmxBeforeCleanupListener = (event) => {
          handleBeforeCleanup(event)
        }
      }
      body.addEventListener('htmx:afterSwap', htmxAfterSwapListener)
      body.addEventListener('htmx:beforeCleanup', htmxBeforeCleanupListener)
    }

    if (typeof MutationObserver === 'function') {
      const target = body ?? asEventTargetElement((document as any)?.documentElement)

      if (target) {
        mutationObserver = new MutationObserver((mutations) => {
          const removed = new Set<HTMLElement>()
          let addedRelevant = false

          mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => collectEditorRoots(node, removed))

            if (!addedRelevant) {
              mutation.addedNodes.forEach((node) => {
                if (addedRelevant) return
                if (isHTMLElement(node)) {
                  if (nodeHasEditorOrForm(node)) {
                    addedRelevant = true
                  }
                  return
                }
                const parent = node as ParentNode
                if (parent && typeof parent.querySelector === 'function') {
                  if (
                    parent.querySelector(EDITOR_SELECTOR) ||
                    parent.querySelector(FORM_SELECTOR)
                  ) {
                    addedRelevant = true
                  }
                }
              })
            }
          })

          removed.forEach((root) => teardownEditor(root))

          if (addedRelevant) {
            scheduleInitializers()
          }
        })

        mutationObserver.observe(target, { childList: true, subtree: true })
      }
    }
  }
}
function readProfile(root: HTMLElement): EditorProfile {
  const value = root.dataset.editorProfile
  return (value as EditorProfile) || DEFAULT_PROFILE
}

function mountEditor(root: HTMLElement): Promise<void> {
  const existing = mountedEditors.get(root)
  if (existing) {
    return existing.mountPromise
  }

  const profile = readProfile(root)
  const factory = profileFactories.get(profile)

  if (!factory) {
    console.warn(`[editor] Missing factory for profile "${profile}"`)
    return Promise.resolve()
  }

  const entry: MountEntry = {
    profile,
    mountPromise: Promise.resolve(),
  }

  entry.mountPromise = (async () => {
    try {
      // [D3:editor-tiptap.step-03:hydrate] Pass SSR-provided initial content to the factory.
      const initialContent = readInitialContent(root)
      const instance = await factory(root, { profile, root, initialContent })
      entry.instance = instance
      registerEditorContentSource(root, instance)
      registerToolbarForEditor(root, instance, profile)
    } catch (error) {
      mountedEditors.delete(root)
      unregisterEditorContentSource(root)
      console.error(`[editor] Failed to mount profile "${profile}"`, error)
      throw error
    }
  })()

  mountedEditors.set(root, entry)
  return entry.mountPromise
}

function scanForEditors(): void {
  const candidates = document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)

  candidates.forEach((root) => {
    if (mountedEditors.has(root)) {
      return
    }

    queueMicrotask(() => {
      void mountEditor(root)
    })
  })
}

function runInitializers(): void {
  scanForEditors()
  initEditorForms()
}

// [D3:editor-tiptap.step-01:register] Allow profiles to register their factory implementation.
export function registerEditorProfile(profile: EditorProfile, factory: EditorFactory): void {
  profileFactories.set(profile, factory)
}

// [D3:editor-tiptap.step-02:defaults] Ensure default profile factories are registered immediately.
registerDefaultEditorProfiles(registerEditorProfile)

// [D3:editor-tiptap.step-01:init] Initialize any unmounted editors on the page.
export function initEditors(): void {
  if (typeof document === 'undefined') {
    return
  }

  if (document.readyState === 'loading') {
    if (!domReadyListenerAttached) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          domReadyListenerAttached = false
          setupLifecycleListeners()
          runInitializers()
        },
        { once: true },
      )
      domReadyListenerAttached = true
    }
    return
  }

  setupLifecycleListeners()
  runInitializers()
}

// [D3:editor-tiptap.step-01:testing-reset] Test helper to reset bootstrap state between runs.
export function resetEditorBootstrapForTesting(): void {
  profileFactories.clear()
  mountedEditors = new WeakMap()
  domReadyListenerAttached = false
  scheduledInitializer = false

  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }

  if (lifecycleListenersAttached && typeof document !== 'undefined') {
    const body = asEventTargetElement((document as any)?.body)
    if (body && typeof body.removeEventListener === 'function') {
      if (htmxAfterSwapListener) {
        body.removeEventListener('htmx:afterSwap', htmxAfterSwapListener)
      }
      if (htmxBeforeCleanupListener) {
        body.removeEventListener('htmx:beforeCleanup', htmxBeforeCleanupListener)
      }
    }
  }

  lifecycleListenersAttached = false
  htmxAfterSwapListener = null
  htmxBeforeCleanupListener = null

  // [D3:editor-tiptap.step-02:test-defaults] Restore default factories for subsequent tests.
  registerDefaultEditorProfiles(registerEditorProfile)
  resetEditorFormSyncForTesting()
  resetToolbarForTesting()
}

// [D3:editor-tiptap.step-01:testing-mounts] Expose mount map for white-box tests.
export function getMountedEditorsForTesting(): WeakMap<HTMLElement, MountEntry> {
  return mountedEditors
}

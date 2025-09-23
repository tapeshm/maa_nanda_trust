import type { EditorFactory, EditorInstance, EditorProfile } from './types'
import { readInitialContent } from './content'
import { registerDefaultEditorProfiles } from './factory'

const DEFAULT_PROFILE: EditorProfile = 'basic'

// [D3:editor-tiptap.step-01:registry] Track registered profile factories and mount states.
const profileFactories = new Map<EditorProfile, EditorFactory>()
let mountedEditors = new WeakMap<HTMLElement, MountEntry>()
let domReadyListenerAttached = false

interface MountEntry {
  profile: EditorProfile
  mountPromise: Promise<void>
  instance?: EditorInstance | void
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
    } catch (error) {
      mountedEditors.delete(root)
      console.error(`[editor] Failed to mount profile "${profile}"`, error)
      throw error
    }
  })()

  mountedEditors.set(root, entry)
  return entry.mountPromise
}

function scanForEditors(): void {
  const candidates = document.querySelectorAll<HTMLElement>('[data-editor]')

  candidates.forEach((root) => {
    if (mountedEditors.has(root)) {
      return
    }

    queueMicrotask(() => {
      void mountEditor(root)
    })
  })
}

// [D3:editor-tiptap.step-01:register] Allow profiles to register their factory implementation.
export function registerEditorProfile(profile: EditorProfile, factory: EditorFactory): void {
  profileFactories.set(profile, factory)
}

// [D3:editor-tiptap.step-02:defaults] Ensure default profile factories are registered immediately.
registerDefaultEditorProfiles(registerEditorProfile)

// [D3:editor-tiptap.step-01:init] Initialize any unmounted editors on the page.
export function initEditors(): void {
  if (document.readyState === 'loading') {
    if (!domReadyListenerAttached) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          domReadyListenerAttached = false
          scanForEditors()
        },
        { once: true },
      )
      domReadyListenerAttached = true
    }
    return
  }

  scanForEditors()
}

// [D3:editor-tiptap.step-01:testing-reset] Test helper to reset bootstrap state between runs.
export function resetEditorBootstrapForTesting(): void {
  profileFactories.clear()
  mountedEditors = new WeakMap()
  domReadyListenerAttached = false
  // [D3:editor-tiptap.step-02:test-defaults] Restore default factories for subsequent tests.
  registerDefaultEditorProfiles(registerEditorProfile)
}

// [D3:editor-tiptap.step-01:testing-mounts] Expose mount map for white-box tests.
export function getMountedEditorsForTesting(): WeakMap<HTMLElement, MountEntry> {
  return mountedEditors
}

import type { EditorInstance } from './types'
import { FormSync, hasEditorHiddenFields } from './formSync'

const formSync = new FormSync()

export { hasEditorHiddenFields }

export function initEditorForms(): void {
  formSync.init()
}

export function registerEditorContentSource(
  root: HTMLElement,
  instance: EditorInstance | void,
): void {
  formSync.registerEditor(root, instance)
}

export function unregisterEditorContentSource(root: HTMLElement): void {
  formSync.unregisterEditor(root)
}

export function resetEditorFormSyncForTesting(): void {
  formSync.resetForTesting()
}

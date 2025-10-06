// [D3:editor-tiptap.step-11:content-class-helper] Single source of truth for content wrapper classes

/**
 * Returns the className string for content wrappers.
 * Used by both editor instances and SSR-rendered content to ensure visual parity.
 */
export function contentClass(): string {
  return 'content-prose prose'
}

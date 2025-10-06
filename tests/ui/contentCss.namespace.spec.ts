// [D3:editor-tiptap.step-11:css-namespace-test] Verify content class namespace is consistent

import { describe, expect, it } from 'vitest'
import { contentClass } from '../../src/frontend/editor/ui/content'
import { PROSE_BASE, PUBLIC_CONTENT_WRAPPER_CLASSNAME } from '../../src/frontend/editor/styles'

describe('[D3:editor-tiptap.step-11] content.css namespace', () => {
  it('content.css namespaces prose classes under .content-prose.prose', () => {
    // Verify that contentClass() returns the expected namespaced class
    const className = contentClass()

    // Must use the .content-prose.prose namespace
    expect(className).toBe('content-prose prose')
    expect(className).toContain('content-prose')
    expect(className).toContain('prose')

    // Verify all usages are consistent with the namespace
    expect(PROSE_BASE).toBe(className)
    expect(PUBLIC_CONTENT_WRAPPER_CLASSNAME).toBe(className)

    // The namespace ensures prose styles are scoped and won't leak globally
    // CSS rules will be defined as .content-prose.prose { ... } preventing
    // accidental application of prose styles to non-content elements
  })
})

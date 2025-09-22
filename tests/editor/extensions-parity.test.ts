import { describe, it, expect } from 'vitest'

import Image from '@tiptap/extension-image'

import { extensionsList } from '../../src/utils/editor/extensions'

describe('extensionsList profile parity', () => {
  it('returns identical base extensions for basic profile across imports', async () => {
    const clientExtensions = extensionsList('basic')
    const serverExtensions = extensionsList('basic')

    expect(clientExtensions).toHaveLength(serverExtensions.length)
    serverExtensions.forEach((extension, index) => {
      expect(clientExtensions[index]).toBe(extension)
    })
  })

  it('includes Image extension only for the full profile', () => {
    const basicExtensions = extensionsList('basic')
    const fullExtensions = extensionsList('full')

    expect(basicExtensions).not.toContain(Image)
    expect(fullExtensions).toContain(Image)
    expect(fullExtensions.slice(0, basicExtensions.length)).toEqual(basicExtensions)
  })
})

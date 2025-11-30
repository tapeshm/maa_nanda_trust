import { describe, it, expect } from 'vitest'
import { getLocalizedHref, getLanguageToggle } from '../../../src/utils/i18n'

describe('i18n utils', () => {
  describe('getLocalizedHref', () => {
    it('returns original path for English', () => {
      expect(getLocalizedHref('/about', 'en')).toBe('/about')
      expect(getLocalizedHref('/', 'en')).toBe('/')
    })

    it('prefixes /hi for Hindi', () => {
      expect(getLocalizedHref('/about', 'hi')).toBe('/hi/about')
      expect(getLocalizedHref('/projects/123', 'hi')).toBe('/hi/projects/123')
    })

    it('handles root path for Hindi', () => {
      expect(getLocalizedHref('/', 'hi')).toBe('/hi')
    })

    it('ensures leading slash handling', () => {
      expect(getLocalizedHref('about', 'hi')).toBe('/hi/about')
    })
  })

  describe('getLanguageToggle', () => {
    it('toggles from English to Hindi', () => {
      expect(getLanguageToggle('en', '/about')).toEqual({ label: 'हिंदी', href: '/hi/about' })
      expect(getLanguageToggle('en', '/')).toEqual({ label: 'हिंदी', href: '/hi' })
    })

    it('toggles from Hindi to English', () => {
      expect(getLanguageToggle('hi', '/hi/about')).toEqual({ label: 'English', href: '/about' })
    })

    it('handles Hindi root correctly', () => {
      expect(getLanguageToggle('hi', '/hi')).toEqual({ label: 'English', href: '/' })
    })
    
    it('handles Hindi root with trailing slash correctly', () => {
       // If the path comes in as /hi/, it should go to /
       expect(getLanguageToggle('hi', '/hi/')).toEqual({ label: 'English', href: '/' })
    })

    it('handles edge case paths starting with hi but not /hi/', () => {
        // /history is an english page. if we are on /hi/history, toggle should go to /history
        expect(getLanguageToggle('hi', '/hi/history')).toEqual({ label: 'English', href: '/history' })
    })
  })
})

import { describe, it, expect } from 'vitest'
import { getNavigationConfig } from '../../../src/config/navigation'

describe('Navigation Config', () => {
  it('generates correct English config for guest', () => {
    const config = getNavigationConfig('en', false, '/about')
    
    expect(config.mainLinks).toHaveLength(4)
    expect(config.mainLinks[0].href).toBe('/about')
    expect(config.mainLinks[0].label).toBe('About Us')
    
    expect(config.donateLink.href).toBe('/donate')
    expect(config.donateLink.label).toBe('Donate')
    
    expect(config.authLink.href).toBe('/admin/dashboard')
    expect(config.authLink.label).toBe('Login')
    
    expect(config.langToggle.href).toBe('/hi/about')
    expect(config.langToggle.label).toBe('हिंदी')
  })

  it('generates correct Hindi config for guest', () => {
    const config = getNavigationConfig('hi', false, '/hi/about')
    
    expect(config.mainLinks).toHaveLength(4)
    // In Hindi, internal links are prefixed with /hi
    expect(config.mainLinks[0].href).toBe('/hi/about')
    expect(config.mainLinks[0].label).toBe('हमारे बारे में')
    
    expect(config.donateLink.href).toBe('/hi/donate')
    expect(config.donateLink.label).toBe('दान करें')
    
    expect(config.authLink.href).toBe('/admin/dashboard')
    expect(config.authLink.label).toBe('लॉग इन')
    
    expect(config.langToggle.href).toBe('/about')
    expect(config.langToggle.label).toBe('English')
  })

  it('generates correct English config for logged in user', () => {
    const config = getNavigationConfig('en', true, '/')
    
    expect(config.authLink.label).toBe('Dashboard')
  })
})

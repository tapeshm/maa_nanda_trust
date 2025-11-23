/** @jsxImportSource hono/jsx */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'hono/jsx/dom/server'
import DonatePage from '../../src/templates/public/pages/DonatePage'
import { DEFAULT_DONATE_CONTENT } from '../../src/data/donate'

describe('DonatePage', () => {
  it('renders appeal content', () => {
    const markup = renderToString(<DonatePage donateContent={DEFAULT_DONATE_CONTENT} />)
    
    // The default content contains paragraphs, check for a unique substring
    expect(markup).toContain('Every contribution')
    expect(markup).toContain('Support Our Mission')
  })

  it('renders QR code container even if empty (or placeholder logic)', () => {
     // Test with empty QR code
     const markup = renderToString(<DonatePage donateContent={DEFAULT_DONATE_CONTENT} />)
     // Default has empty string for QR code, so image shouldn't render
     expect(markup).not.toContain('alt="Donation QR Code"')

     // Test with QR code
     const contentWithQr = { ...DEFAULT_DONATE_CONTENT, qrCodeUrl: 'test-qr.png' }
     const markupWithQr = renderToString(<DonatePage donateContent={contentWithQr} />)
     expect(markupWithQr).toContain('alt="Donation QR Code"')
     expect(markupWithQr).toContain('src="/media/test-qr.png"') // Assuming resolveMediaUrl behavior for 'test-qr.png' -> '/media/test-qr.png' or similar base path
  })
})

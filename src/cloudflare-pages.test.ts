import { describe, expect, it } from 'vitest'
import redirects from '../public/_redirects?raw'

describe('Cloudflare Pages static routing', () => {
  it('serves nested topic routes through the Vite SPA entry', () => {
    expect(redirects.trim()).toBe('/* /index.html 200')
  })
})

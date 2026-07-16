import { describe, expect, it } from 'vitest'
import { galleryPresets } from './galleryPresets'

describe('galleryPresets', () => {
  it('ships four original local single-pass presets', () => {
    expect(galleryPresets.map((preset) => preset.id)).toEqual([
      'aurora-orbit',
      'liquid-grid',
      'pulse-rings',
      'neon-threads',
    ])
    for (const preset of galleryPresets) {
      expect(preset.source).toContain('void mainImage')
      expect(preset.source).not.toMatch(/iChannel|https?:\/\//)
      expect(preset.poster).toMatch(/^\/images\/shadertoy-studio\/.+\.webp$/)
    }
  })
})

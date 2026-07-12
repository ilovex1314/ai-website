import { describe, expect, it } from 'vitest'
import { isSupportedArrowFile, readArrowAsset, sanitizeArrowSvg } from './arrowAssetModel'

describe('arrowAssetModel', () => {
  it('accepts PNG, WebP and SVG arrow assets', () => {
    expect(isSupportedArrowFile({ name: 'arrow.png', type: 'image/png' })).toBe(true)
    expect(isSupportedArrowFile({ name: 'arrow.webp', type: 'image/webp' })).toBe(true)
    expect(isSupportedArrowFile({ name: 'arrow.svg', type: 'image/svg+xml' })).toBe(true)
    expect(isSupportedArrowFile({ name: 'arrow.jpg', type: 'image/jpeg' })).toBe(false)
  })

  it('removes executable and remote content from uploaded SVGs', () => {
    const safe = sanitizeArrowSvg(`
      <svg viewBox="0 0 100 40" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><div>bad</div></foreignObject>
        <path onclick="alert(2)" d="M0 20L100 20" />
        <image href="https://example.com/tracker.png" />
      </svg>
    `)

    expect(safe).toContain('<svg')
    expect(safe).toContain('<path')
    expect(safe).not.toMatch(/script|foreignObject|onload|onclick|https:/u)
  })

  it('turns a sanitized SVG upload into an embeddable calibrated asset', async () => {
    const file = new File(
      ['<svg viewBox="0 0 200 50"><path d="M0 25L200 25" /></svg>'],
      'custom-arrow.svg',
      { type: 'image/svg+xml' },
    )

    const asset = await readArrowAsset(file)

    expect(asset.dataUrl).toMatch(/^data:image\/svg\+xml/u)
    expect(asset.aspectRatio).toBe(4)
  })
})

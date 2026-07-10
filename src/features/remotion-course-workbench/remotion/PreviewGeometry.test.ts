import { describe, expect, it } from 'vitest'
import { calculateContainTransform, mapCompositionRectToPreview } from './PreviewGeometry'

describe('Player preview geometry', () => {
  it.each([
    ['16:9', { width: 1920, height: 1080 }, { scale: 1000 / 1920, offsetX: 0, offsetY: 218.75 }],
    ['4:3', { width: 1440, height: 1080 }, { scale: 1000 / 1440, offsetX: 0, offsetY: 125 }],
    ['9:16', { width: 1080, height: 1920 }, { scale: 1000 / 1920, offsetX: 218.75, offsetY: 0 }],
  ])('contains a %s composition in a square preview', (_aspect, composition, expected) => {
    expect(calculateContainTransform(composition, { width: 1000, height: 1000 })).toEqual(expected)
  })

  it('maps composition-pixel selection geometry through scale and letterbox offsets', () => {
    const transform = calculateContainTransform(
      { width: 1920, height: 1080 },
      { width: 1000, height: 1000 },
    )

    expect(mapCompositionRectToPreview({ x: 192, y: 108, width: 960, height: 540 }, transform)).toEqual({
      x: 100,
      y: 275,
      width: 500,
      height: 281.25,
    })
  })
})

import { describe, expect, it } from 'vitest'
import { resolvePointingArrowGeometry } from './pointingArrowGeometry'

describe('resolvePointingArrowGeometry', () => {
  it('anchors the arrow tip to the nearest target edge and keeps the tail outside', () => {
    const geometry = resolvePointingArrowGeometry(
      { x: 400, y: 300, width: 200, height: 100 },
      { offsetX: -260, offsetY: 160 },
    )

    expect(geometry.tipAbsolute.x).toBeCloseTo(418.75, 1)
    expect(geometry.tipAbsolute.y).toBeCloseTo(400, 1)
    expect(geometry.tailAbsolute).toEqual({ x: 240, y: 510 })
    expect(geometry.width).toBeGreaterThan(178)
    expect(geometry.height).toBeGreaterThan(145)
  })

  it('uses resize deltas to move the editable tail while keeping the tip on the target edge', () => {
    const base = resolvePointingArrowGeometry(
      { x: 100, y: 100, width: 120, height: 60 },
      { offsetX: -100, offsetY: 80 },
    )
    const resized = resolvePointingArrowGeometry(
      { x: 100, y: 100, width: 120, height: 60 },
      { offsetX: -100, offsetY: 80, widthDelta: -40, heightDelta: 20 },
    )

    expect(base.tipAbsolute.y).toBe(160)
    expect(resized.tipAbsolute.y).toBe(160)
    expect(resized.tipAbsolute.x).toBeGreaterThanOrEqual(100)
    expect(resized.tipAbsolute.x).toBeLessThanOrEqual(220)
    expect(resized.tailAbsolute.x).toBe(base.tailAbsolute.x - 40)
    expect(resized.tailAbsolute.y).toBe(base.tailAbsolute.y + 20)
  })
})

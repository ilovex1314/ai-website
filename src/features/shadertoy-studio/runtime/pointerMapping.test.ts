import { describe, expect, it } from 'vitest'
import { mapPointerToShader } from './pointerMapping'

describe('mapPointerToShader', () => {
  it('scales CSS coordinates and flips Y', () => {
    const value = mapPointerToShader(
      { left: 10, top: 20, width: 200, height: 100 },
      { width: 400, height: 200 },
      { clientX: 60, clientY: 45 },
      'down',
      [0, 0, 0, 0],
    )
    expect(value).toEqual([100, 150, 100, 150])
    expect(mapPointerToShader(
      { left: 10, top: 20, width: 200, height: 100 },
      { width: 400, height: 200 },
      { clientX: 110, clientY: 70 },
      'up',
      value,
    )).toEqual([200, 100, -100, -150])
  })
})

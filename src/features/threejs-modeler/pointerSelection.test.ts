import { describe, expect, it } from 'vitest'
import { isSelectionClick } from './pointerSelection'

describe('isSelectionClick', () => {
  it('treats short pointer movement as a selection click', () => {
    expect(isSelectionClick({ x: 120, y: 80 }, { x: 122, y: 83 })).toBe(true)
  })

  it('treats dragged pointer movement as camera orbit intent', () => {
    expect(isSelectionClick({ x: 120, y: 80 }, { x: 170, y: 105 })).toBe(false)
  })
})

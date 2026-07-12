import { describe, expect, it } from 'vitest'
import type { AnimationActionRef, TimelineSegment } from '../workbenchTypes.js'
import {
  absoluteActionRange,
  animationOpacity,
  isAnimationActive,
  relativeFrameForSegment,
} from './animationTiming.js'

const segment: TimelineSegment = {
  id: 'segment-02',
  title: 'Scene 2',
  from: 210,
  duration: 390,
  slide: 2,
  speaker: 'right-bottom',
  caption: '',
  actionRefs: [],
}

const ref: AnimationActionRef = {
  id: 'circle-title',
  actionId: 'circle-mark',
  from: 18,
  duration: 280,
  fadeInFrames: 100,
  fadeOutFrames: 50,
}

describe('animation timing', () => {
  it('converts segment-relative storage to one absolute half-open frame range', () => {
    expect(absoluteActionRange(segment, ref)).toEqual({
      fromFrame: 228,
      toFrame: 508,
      durationFrames: 280,
    })
    expect(relativeFrameForSegment(segment, 228)).toBe(18)
    expect(isAnimationActive(227, 228, 280)).toBe(false)
    expect(isAnimationActive(228, 228, 280)).toBe(true)
    expect(isAnimationActive(507, 228, 280)).toBe(true)
    expect(isAnimationActive(508, 228, 280)).toBe(false)
    expect(isAnimationActive(689, 228, 280)).toBe(false)
  })

  it('calculates deterministic frame-based fade opacity', () => {
    expect(animationOpacity(227, 228, 280, 100, 50)).toBe(0)
    expect(animationOpacity(228, 228, 280, 100, 50)).toBe(0)
    expect(animationOpacity(278, 228, 280, 100, 50)).toBeCloseTo(0.5)
    expect(animationOpacity(328, 228, 280, 100, 50)).toBe(1)
    expect(animationOpacity(458, 228, 280, 100, 50)).toBe(1)
    expect(animationOpacity(483, 228, 280, 100, 50)).toBeCloseTo(0.5)
    expect(animationOpacity(507, 228, 280, 100, 50)).toBeCloseTo(0.02)
    expect(animationOpacity(508, 228, 280, 100, 50)).toBe(0)
  })
})

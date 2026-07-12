import { describe, expect, it } from 'vitest'
import { findAnimationConflicts } from './animationConflicts.js'

describe('animation transform conflicts', () => {
  it('allows sequential transforms and overlapping overlays', () => {
    const existing = [{
      id: 'move-a',
      elementId: 'title',
      fromFrame: 100,
      durationFrames: 100,
      channels: ['translate'] as const,
    }]

    expect(findAnimationConflicts({
      id: 'move-b',
      elementId: 'title',
      fromFrame: 200,
      durationFrames: 80,
      channels: ['translate'],
    }, existing)).toEqual([])

    expect(findAnimationConflicts({
      id: 'circle',
      elementId: 'title',
      fromFrame: 120,
      durationFrames: 50,
      channels: ['overlay'],
    }, existing)).toEqual([])
  })

  it('rejects overlapping transforms on the same exclusive channel and element', () => {
    const conflict = findAnimationConflicts({
      id: 'move-b',
      elementId: 'title',
      fromFrame: 150,
      durationFrames: 80,
      channels: ['translate'],
    }, [{
      id: 'move-a',
      elementId: 'title',
      fromFrame: 100,
      durationFrames: 100,
      channels: ['translate'],
    }, {
      id: 'move-other-element',
      elementId: 'subtitle',
      fromFrame: 150,
      durationFrames: 80,
      channels: ['translate'],
    }])

    expect(conflict).toEqual([expect.objectContaining({
      conflictingId: 'move-a',
      channel: 'translate',
      fromFrame: 150,
      toFrame: 200,
    })])
  })
})

import { describe, expect, it } from 'vitest'
import { topics } from './topics'

describe('topics plan data', () => {
  it('captures the eight researched vibe-coding demo tracks', () => {
    expect(topics.map((topic) => topic.slug)).toEqual([
      'echarts',
      'spline',
      'threejs',
      'shadertoy',
      'unicorn',
      'matterjs',
      'rive',
      'mapbox',
    ])
  })

  it('keeps every track actionable with tools, demo goals, and acceptance criteria', () => {
    for (const topic of topics) {
      expect(topic.tool).not.toHaveLength(0)
      expect(topic.summary.length).toBeGreaterThan(40)
      expect(topic.demoGoal.length).toBeGreaterThan(40)
      expect(topic.acceptanceCriteria).toHaveLength(3)
    }
  })
})

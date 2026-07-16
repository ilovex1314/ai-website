import { describe, expect, it } from 'vitest'
import { createLabState, shaderLessons, updateLessonDraft } from './shaderLessons'

describe('shaderLessons', () => {
  it('moves through the five approved concepts', () => {
    expect(shaderLessons.map((lesson) => lesson.id)).toEqual([
      'pixel-color',
      'normalized-circle',
      'breathing-shape',
      'mouse-input',
      'aurora-breakdown',
    ])
    expect(shaderLessons.map((lesson) => lesson.concept)).toEqual([
      'fragCoord',
      'iResolution',
      'shape-math',
      'iTime',
      'iMouse-uniforms',
    ])
  })

  it('keeps per-lesson drafts isolated', () => {
    const state = createLabState()
    const changed = updateLessonDraft(state, 'pixel-color', { source: 'changed' })
    expect(changed.drafts['pixel-color'].source).toBe('changed')
    expect(changed.drafts['normalized-circle'].source).toContain('mainImage')
  })
})

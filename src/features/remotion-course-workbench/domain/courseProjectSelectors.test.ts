import { describe, expect, it } from 'vitest'
import { parseCourseProject } from './courseProjectSchema.js'
import {
  selectBackgroundMediaUrl,
  selectCourseDurationFrames,
  selectForegroundMedia,
} from './courseProjectSelectors.js'

const project = parseCourseProject({
  version: 2,
  id: 'selector-fixture',
  title: 'Selector Fixture',
  fps: 30,
  durationFrames: 600,
  activeAspectRatio: '9:16',
  source: {
    background: {
      id: 'background',
      projectPath: '/projects/selector-fixture',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
      mediaUrl: '/media/background.mp4',
    },
    foreground: {
      id: 'speaker',
      mediaUrl: '/media/foreground.mp4',
      durationFrames: 300,
      audioPolicy: 'primary',
      window: { x: 60, y: 55, width: 24, height: 28, shape: 'rounded', opacity: 1 },
    },
    bakedAnimations: [],
  },
  actionTemplates: [],
  actionInstances: [],
})

describe('course project render selectors', () => {
  it('reads duration and media directly from canonical V2 fields', () => {
    expect(selectCourseDurationFrames(project)).toBe(600)
    expect(selectBackgroundMediaUrl(project)).toBe('/media/background.mp4')
    expect(selectForegroundMedia(project)).toEqual({
      mediaUrl: '/media/foreground.mp4',
      durationFrames: 300,
      window: { x: 60, y: 55, width: 24, height: 28, shape: 'rounded', opacity: 1 },
    })
  })

  it('returns no foreground layer when the canonical source is absent', () => {
    const withoutForeground = parseCourseProject({
      ...project,
      source: { ...project.source, foreground: undefined },
    })

    expect(selectForegroundMedia(withoutForeground)).toBeUndefined()
  })
})

import type { CourseProjectV2 } from './courseProjectSchema.js'

export type SelectedForegroundMedia = {
  mediaUrl: string
  durationFrames: number
  window: NonNullable<CourseProjectV2['source']['foreground']>['window']
}

export function selectCourseDurationFrames(project: CourseProjectV2): number {
  return project.durationFrames
}

export function selectBackgroundMediaUrl(project: CourseProjectV2): string | undefined {
  return project.source.background.mediaUrl
}

export function selectForegroundMedia(project: CourseProjectV2): SelectedForegroundMedia | undefined {
  const foreground = project.source.foreground

  if (!foreground) {
    return undefined
  }

  return {
    mediaUrl: foreground.mediaUrl,
    durationFrames: foreground.durationFrames,
    window: foreground.window,
  }
}

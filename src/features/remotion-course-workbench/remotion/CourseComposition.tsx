import { AbsoluteFill, OffthreadVideo, Sequence } from 'remotion'
import type { CourseProjectV2 } from '../domain/courseProjectSchema'
import type { CanvasAspectRatio } from '../workbenchTypes'
import { ActionOverlayLayer } from './ActionOverlayLayer'
import { ForegroundLayer, type ForegroundMedia, type ForegroundWindow } from './ForegroundLayer'

type BackgroundRenderSource = CourseProjectV2['source']['background'] & {
  mediaUrl?: string
  src?: string
  durationFrames?: number
}

type ForegroundRenderSource = {
  mediaUrl?: string
  src?: string
  durationFrames: number
  window?: ForegroundWindow
}

type RenderProject = CourseProjectV2 & {
  durationFrames?: number
  source: CourseProjectV2['source'] & {
    background: BackgroundRenderSource
    foreground?: ForegroundRenderSource
  }
}

export type CourseCompositionProps = {
  project: CourseProjectV2
  aspectRatio: CanvasAspectRatio
}

export const compositionDimensions: Record<CanvasAspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}

const defaultForegroundWindow: ForegroundWindow = {
  x: 65,
  y: 55,
  width: 20,
  height: 18,
  shape: 'rounded',
  opacity: 1,
}

export function selectCourseDurationFrames(project: CourseProjectV2): number {
  const renderProject = project as RenderProject

  if (typeof renderProject.durationFrames === 'number' && renderProject.durationFrames > 0) {
    return Math.floor(renderProject.durationFrames)
  }

  if (
    typeof renderProject.source.background.durationFrames === 'number' &&
    renderProject.source.background.durationFrames > 0
  ) {
    return Math.floor(renderProject.source.background.durationFrames)
  }

  const timedEntries = [...project.source.bakedAnimations, ...project.actionInstances]
  return Math.max(1, ...timedEntries.map((entry) => entry.fromFrame + entry.durationFrames))
}

export function selectBackgroundMediaUrl(project: CourseProjectV2): string | undefined {
  const background = (project as RenderProject).source.background
  return background.mediaUrl ?? background.src
}

export function selectForegroundMedia(project: CourseProjectV2): ForegroundMedia | undefined {
  const foreground = (project as RenderProject).source.foreground
  const mediaUrl = foreground?.mediaUrl ?? foreground?.src

  if (!foreground || !mediaUrl || foreground.durationFrames <= 0) {
    return undefined
  }

  return {
    mediaUrl,
    durationFrames: Math.floor(foreground.durationFrames),
    window: foreground.window ?? defaultForegroundWindow,
  }
}

export function CourseComposition({ project, aspectRatio }: CourseCompositionProps) {
  const durationInFrames = selectCourseDurationFrames(project)
  const backgroundMediaUrl = selectBackgroundMediaUrl(project)
  const foreground = selectForegroundMedia(project)

  return (
    <AbsoluteFill
      className="course-composition"
      data-aspect-ratio={aspectRatio}
      data-testid="course-composition"
    >
      <Sequence durationInFrames={durationInFrames} premountFor={project.fps}>
        {backgroundMediaUrl ? (
          <OffthreadVideo
            className="course-composition__background preview-background-video"
            data-testid="background-video"
            muted
            src={backgroundMediaUrl}
            volume={0}
          />
        ) : (
          <AbsoluteFill className="course-composition__media-missing" data-testid="background-unavailable">
            <strong>{project.title}</strong>
          </AbsoluteFill>
        )}
      </Sequence>
      <ForegroundLayer foreground={foreground} projectDurationFrames={durationInFrames} />
      <ActionOverlayLayer aspectRatio={aspectRatio} project={project} />
    </AbsoluteFill>
  )
}

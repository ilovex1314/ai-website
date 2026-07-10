import type { CSSProperties } from 'react'
import { OffthreadVideo, Sequence, useCurrentFrame, Video } from 'remotion'

export type ForegroundWindow = {
  x: number
  y: number
  width: number
  height: number
  shape: 'rounded' | 'circle' | 'portrait' | 'rect'
  opacity: number
}

export type ForegroundMedia = {
  mediaUrl: string
  durationFrames: number
  window: ForegroundWindow
}

type ForegroundLayerProps = {
  foreground?: ForegroundMedia
  interactive?: boolean
  projectDurationFrames: number
}

export function resolveForegroundWindowStyle(window: ForegroundWindow): CSSProperties {
  return {
    left: `${window.x}%`,
    top: `${window.y}%`,
    width: `${window.width}%`,
    height: `${window.height}%`,
    opacity: window.opacity,
  }
}

export function ForegroundLayer({ foreground, interactive = false, projectDurationFrames }: ForegroundLayerProps) {
  const frame = useCurrentFrame()

  if (!foreground) {
    return null
  }

  const durationInFrames = Math.min(foreground.durationFrames, projectDurationFrames)

  if (frame >= durationInFrames) {
    return null
  }

  return (
    <Sequence durationInFrames={durationInFrames} premountFor={30}>
      <div
        className="course-composition__foreground preview-speaker"
        data-shape={foreground.window.shape}
        data-testid="foreground-window"
        style={resolveForegroundWindowStyle(foreground.window)}
      >
        {interactive ? (
          <Video
            className="preview-speaker__video"
            data-testid="foreground-video"
            muted={false}
            src={foreground.mediaUrl}
            volume={1}
          />
        ) : (
          <OffthreadVideo
            className="preview-speaker__video"
            data-testid="foreground-video"
            muted={false}
            src={foreground.mediaUrl}
            volume={1}
          />
        )}
      </div>
    </Sequence>
  )
}

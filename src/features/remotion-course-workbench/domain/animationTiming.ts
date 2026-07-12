import type { AnimationActionRef, TimelineSegment } from '../workbenchTypes.js'

export type AbsoluteAnimationRange = {
  fromFrame: number
  toFrame: number
  durationFrames: number
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function absoluteActionRange(
  segment: Pick<TimelineSegment, 'from'>,
  ref: Pick<AnimationActionRef, 'from' | 'duration'>,
): AbsoluteAnimationRange {
  const fromFrame = segment.from + ref.from
  const durationFrames = Math.max(1, ref.duration)

  return {
    fromFrame,
    toFrame: fromFrame + durationFrames,
    durationFrames,
  }
}

export function relativeFrameForSegment(
  segment: Pick<TimelineSegment, 'from'>,
  absoluteFrame: number,
) {
  return absoluteFrame - segment.from
}

export function isAnimationActive(frame: number, fromFrame: number, durationFrames: number) {
  return frame >= fromFrame && frame < fromFrame + durationFrames
}

export function animationOpacity(
  frame: number,
  fromFrame: number,
  durationFrames: number,
  fadeInFrames = 0,
  fadeOutFrames = 0,
) {
  if (!isAnimationActive(frame, fromFrame, durationFrames)) {
    return 0
  }

  const localFrame = frame - fromFrame
  const fadeIn = fadeInFrames > 0 ? clampUnit(localFrame / fadeInFrames) : 1
  const fadeOut = fadeOutFrames > 0
    ? clampUnit((durationFrames - localFrame) / fadeOutFrames)
    : 1

  return Math.min(fadeIn, fadeOut)
}

import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type {
  AnimationAction,
  AnimationActionRef,
  CourseStage,
  CourseWorkbenchAction,
  PlaybackState,
  StageElement,
  TimelineSegment,
} from './workbenchTypes'

type CoursePreviewStageProps = {
  action: AnimationAction
  segment: TimelineSegment
  stage: CourseStage
  playback: PlaybackState
  timeline: TimelineSegment[]
  actions: AnimationAction[]
  selectedElementId?: string
  fps: number
  mode?: 'editing' | 'export'
  dispatch: React.Dispatch<CourseWorkbenchAction>
}

type DragState =
  | { kind: 'canvas-action' }
  | {
      kind: 'foreground-move'
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | {
      kind: 'foreground-resize'
      startX: number
      startY: number
      originWidth: number
      originHeight: number
    }
  | {
      kind: 'action-move'
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | {
      kind: 'action-resize'
      startX: number
      startY: number
      originWidth: number
      originHeight: number
      originRadius: number
    }

type ActiveActionEntry = {
  ref: AnimationActionRef
  action: AnimationAction
  segment: TimelineSegment
  absoluteFrom: number
  absoluteTo: number
  phase: 'enter' | 'emphasis' | 'exit'
}

function pct(value: number | undefined, fallback: number) {
  return `${value ?? fallback}%`
}

function previewText(action: AnimationAction) {
  return action.params.label ?? action.params.text ?? action.params.title ?? action.name
}

function renderActionPreview(action: AnimationAction, text: string): ReactNode {
  switch (action.category) {
    case 'progress':
      return (
        <>
          <span>{text}</span>
          <i aria-hidden="true" />
        </>
      )
    case 'step-reveal':
      return (
        <>
          <span>{text}</span>
          <small>
            {action.params.step ?? 1}/{action.params.totalSteps ?? 4}
          </small>
        </>
      )
    case 'cursor':
      return (
        <>
          <span aria-hidden="true" />
          <strong>{text}</strong>
        </>
      )
    case 'code':
      return (
        <>
          <span>line {action.params.line ?? 1}</span>
          <strong>{text}</strong>
        </>
      )
    case 'comparison':
      return (
        <>
          <span>Before</span>
          <strong>{text}</strong>
          <span>After</span>
        </>
      )
    case 'transition':
      return (
        <>
          <strong>{action.params.title ?? text}</strong>
          <span>{action.params.subtitle ?? 'Next section'}</span>
        </>
      )
    default:
      return text
  }
}

function elementIsVisible(element: StageElement, currentFrame: number) {
  return currentFrame >= element.frameRange[0] && currentFrame <= element.frameRange[1]
}

function clampPercent(value: number, min = 0, max = 100) {
  return Math.min(Math.max(Math.round(value), min), max)
}

function actionPhase(ref: AnimationActionRef, absoluteFrame: number, segmentFrom: number) {
  const relativeFrame = absoluteFrame - segmentFrom - ref.from
  const fadeInFrames = ref.fadeInFrames ?? 0
  const fadeOutFrames = ref.fadeOutFrames ?? 0

  if (fadeInFrames > 0 && relativeFrame < fadeInFrames) {
    return 'enter'
  }

  if (fadeOutFrames > 0 && relativeFrame >= ref.duration - fadeOutFrames) {
    return 'exit'
  }

  return 'emphasis'
}

function hexToRgba(hex: string | undefined, opacity: number | undefined) {
  const normalized = (hex ?? '#ffffff').replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${opacity ?? 0})`
}

const dragHandleStyle = {
  width: 24,
  height: 24,
  pointerEvents: 'auto',
  zIndex: 12,
} satisfies CSSProperties

export function CoursePreviewStage({
  action,
  segment,
  stage,
  playback,
  timeline,
  actions,
  selectedElementId,
  fps,
  mode = 'editing',
  dispatch,
}: CoursePreviewStageProps) {
  const [dragState, setDragState] = useState<DragState | undefined>()
  const [previewRun, setPreviewRun] = useState(0)
  const [backgroundPreviewFailed, setBackgroundPreviewFailed] = useState(false)
  const [foregroundPreviewFailed, setForegroundPreviewFailed] = useState(false)
  const backgroundVideoRef = useRef<HTMLVideoElement>(null)
  const foregroundVideoRef = useRef<HTMLVideoElement>(null)
  const lastDispatchedFrameRef = useRef(playback.currentFrame)
  const selectedElement = stage.elements.find((element) => element.id === selectedElementId)
  const activeActionEntries = timeline.flatMap((timelineSegment): ActiveActionEntry[] =>
    timelineSegment.actionRefs.flatMap((ref) => {
      const absoluteFrom = timelineSegment.from + ref.from
      const absoluteTo = absoluteFrom + ref.duration
      const active = playback.currentFrame >= absoluteFrom && playback.currentFrame < absoluteTo
      const libraryAction = actions.find((libraryAction) => libraryAction.id === ref.actionId)

      if (!active || !libraryAction) {
        return []
      }

      return [
        {
          ref,
          action: libraryAction,
          segment: timelineSegment,
          absoluteFrom,
          absoluteTo,
          phase: actionPhase(ref, playback.currentFrame, timelineSegment.from),
        },
      ]
    }),
  )
  const currentAction = activeActionEntries[0]?.action
  const backgroundPreviewUrl =
    stage.backgroundSource.previewMode === 'video' && !backgroundPreviewFailed
      ? stage.backgroundSource.localPreviewUrl
      : undefined
  const foregroundPreviewUrl = !foregroundPreviewFailed ? stage.foregroundSource.localPreviewUrl : undefined
  const foregroundIsVisible = playback.currentFrame <= stage.foregroundSource.durationFrames
  const isEditing = mode === 'editing'
  const mediaTimeSeconds = playback.currentFrame / fps
  const getVisibleMediaTracks = useCallback(() =>
    [foregroundIsVisible ? foregroundVideoRef.current : null, backgroundVideoRef.current].filter(
      (track): track is HTMLVideoElement => Boolean(track),
    ), [foregroundIsVisible])
  const syncMediaTime = useCallback((timeSeconds = mediaTimeSeconds) => {
    for (const video of getVisibleMediaTracks()) {
      if (Number.isFinite(timeSeconds)) {
        video.currentTime = timeSeconds
      }
    }
  }, [getVisibleMediaTracks, mediaTimeSeconds])
  const playMediaTracks = async () => {
    syncMediaTime()
    const foregroundVideo = foregroundIsVisible ? foregroundVideoRef.current : null
    const backgroundVideo = backgroundVideoRef.current

    if (foregroundVideo) {
      await foregroundVideo.play().catch(() => undefined)
    }

    if (backgroundVideo) {
      await backgroundVideo.play().catch(() => undefined)
    }

    if (foregroundVideo?.paused) {
      await foregroundVideo.play().catch(() => undefined)
    }
  }
  const pauseMediaTracks = () => {
    for (const video of getVisibleMediaTracks()) {
      video.pause()
    }
  }
  const syncPlaybackFromBackground = () => {
    const backgroundVideo = backgroundVideoRef.current
    if (!backgroundVideo) {
      return
    }

    const nextFrame = clampPercent(backgroundVideo.currentTime * fps, 0, playback.totalFrames)
    const foregroundVideo = foregroundIsVisible ? foregroundVideoRef.current : null
    if (foregroundVideo && Math.abs(foregroundVideo.currentTime - backgroundVideo.currentTime) > 0.12) {
      foregroundVideo.currentTime = backgroundVideo.currentTime
    }

    const frameDelta = Math.abs(nextFrame - lastDispatchedFrameRef.current)
    if (nextFrame !== playback.currentFrame && (!playback.isPlaying || frameDelta >= 2)) {
      lastDispatchedFrameRef.current = nextFrame
      dispatch({ type: 'seek-frame', frame: nextFrame })
    }
  }
  const seekMediaTracks = (frame: number) => {
    lastDispatchedFrameRef.current = frame
    syncMediaTime(frame / fps)
    dispatch({ type: 'seek-frame', frame })
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragState) {
      return
    }

    if (dragState.kind === 'canvas-action') {
      dispatch({
        type: 'move-selected-action',
        x: Math.round(event.clientX / 7),
        y: Math.round(event.clientY / 5),
      })
    }

    if (dragState.kind === 'foreground-move') {
      dispatch({
        type: 'set-foreground-window',
        patch: {
          x: clampPercent(dragState.originX + (event.clientX - dragState.startX) / 10, 0, 92),
          y: clampPercent(dragState.originY + (event.clientY - dragState.startY) / 10, 0, 92),
        },
      })
    }

    if (dragState.kind === 'foreground-resize') {
      dispatch({
        type: 'set-foreground-window',
        patch: {
          width: clampPercent(dragState.originWidth + (event.clientX - dragState.startX) / 7, 8, 80),
          height: clampPercent(dragState.originHeight + (event.clientY - dragState.startY) / 10, 8, 80),
        },
      })
    }

    if (dragState.kind === 'action-move') {
      dispatch({
        type: 'move-selected-action',
        x: clampPercent(dragState.originX + (event.clientX - dragState.startX) / 6.25),
        y: clampPercent(dragState.originY + (event.clientY - dragState.startY) / 5),
      })
    }

    if (dragState.kind === 'action-resize') {
      const width = clampPercent(dragState.originWidth + (event.clientX - dragState.startX) / 10, 6, 96)
      const height = clampPercent(dragState.originHeight + (event.clientY - dragState.startY) / 10, 4, 80)
      dispatch({
        type: 'resize-selected-action',
        width,
        height,
        radius: action.category === 'circle' ? Math.max(width, height) / 2 : dragState.originRadius,
      })
    }
  }
  const stopDrag = () => setDragState(undefined)
  const renderActiveActionOverlay = (entry: ActiveActionEntry, index: number) => {
    const overlayAction = entry.action
    const text = previewText(overlayAction)
    const color = overlayAction.params.color ?? '#2563eb'
    const actionStyle = {
      left: pct(overlayAction.params.x, 16),
      top: pct(overlayAction.params.y, 28),
      width: pct(overlayAction.params.width, overlayAction.category === 'circle' ? 18 : 42),
      height: pct(overlayAction.params.height, overlayAction.category === 'lower-third' ? 14 : 18),
      borderColor: color,
      borderRadius: `${overlayAction.params.borderRadius ?? overlayAction.params.radius ?? 10}px`,
      backgroundColor: hexToRgba(overlayAction.params.backgroundColor, overlayAction.params.backgroundOpacity),
      color,
      opacity: entry.phase === 'enter' ? 0.72 : entry.phase === 'exit' ? 0.58 : 1,
      '--action-color': color,
      '--action-scale': overlayAction.params.scale ?? 1.12,
      '--action-progress': `${overlayAction.params.progress ?? 64}%`,
    } as CSSProperties

    return (
      <div
        key={`${entry.ref.id ?? entry.ref.actionId}-${previewRun}`}
        className={`preview-action preview-action--${overlayAction.category}`}
        data-action-ref-id={entry.ref.id}
        data-animation-phase={entry.phase}
        data-testid={index === 0 ? 'preview-action' : `preview-action-${entry.ref.id ?? entry.ref.actionId}`}
        onPointerDown={(event) => {
          event.stopPropagation()
          if (isEditing) {
            setDragState({
              kind: 'action-move',
              startX: event.clientX,
              startY: event.clientY,
              originX: overlayAction.params.x ?? 16,
              originY: overlayAction.params.y ?? 28,
            })
          }
        }}
        style={actionStyle}
      >
        {renderActionPreview(overlayAction, text)}
        {isEditing ? (
          <>
            <button
              type="button"
              aria-label="移动动作标注"
              className="action-move-handle editor-only"
              data-editor-only="true"
              data-testid="action-move-handle"
              style={dragHandleStyle}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.setPointerCapture?.(event.pointerId)
                setDragState({
                  kind: 'action-move',
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: overlayAction.params.x ?? 16,
                  originY: overlayAction.params.y ?? 28,
                })
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture?.(event.pointerId)
                stopDrag()
              }}
              onPointerCancel={stopDrag}
            />
            <button
              type="button"
              aria-label="调整动作标注大小"
              className="resize-handle resize-handle--action editor-only"
              data-editor-only="true"
              data-testid="action-resize-handle"
              style={dragHandleStyle}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                event.currentTarget.setPointerCapture?.(event.pointerId)
                setDragState({
                  kind: 'action-resize',
                  startX: event.clientX,
                  startY: event.clientY,
                  originWidth: overlayAction.params.width ?? (overlayAction.category === 'circle' ? 18 : 42),
                  originHeight: overlayAction.params.height ?? (overlayAction.category === 'lower-third' ? 14 : 18),
                  originRadius: overlayAction.params.radius ?? 0,
                })
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture?.(event.pointerId)
                stopDrag()
              }}
              onPointerCancel={stopDrag}
            />
          </>
        ) : null}
      </div>
    )
  }

  return (
    <section className="course-card course-card--preview">
      <div className="course-card__header">
        <p>Review Stage</p>
        <span>
          slide {segment.slide} · {segment.speaker}
        </span>
      </div>
      <h2>Review 预览</h2>
      <div className="preview-controls">
        <label>
          画布比例
          <select
            aria-label="画布比例"
            value={stage.canvasAspectRatio}
            onChange={(event) =>
              dispatch({
                type: 'set-aspect-ratio',
                aspectRatio: event.target.value as CourseStage['canvasAspectRatio'],
              })
            }
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
        <button
          type="button"
          onPointerDown={() => {
            if (!playback.isPlaying) {
              playMediaTracks()
            }
          }}
          onClick={() => {
            if (playback.isPlaying) {
              pauseMediaTracks()
            }
            dispatch({ type: 'set-playing', isPlaying: !playback.isPlaying })
          }}
        >
          {playback.isPlaying ? '暂停' : '播放'}
        </button>
        <span>进场 · 强调 · 退场</span>
        <button type="button" onClick={() => setPreviewRun((current) => current + 1)}>
          重播动作
        </button>
      </div>
      <div className="playback-row">
        <label>
          播放头
          <input
            aria-label="播放头"
            type="range"
            min={0}
            max={playback.totalFrames}
            value={playback.currentFrame}
            onChange={(event) => seekMediaTracks(Number(event.target.value))}
          />
        </label>
        <span>
          {playback.currentFrame} / {playback.totalFrames}f
        </span>
        <span>当前章节：{segment.title}</span>
        <span>Active action: {currentAction?.id ?? 'none'}</span>
      </div>
      <div
        className="preview-canvas"
        data-testid="preview-canvas"
        data-aspect-ratio={stage.canvasAspectRatio}
        onPointerDown={(event) => {
          if (isEditing && event.target === event.currentTarget) {
            setDragState({ kind: 'canvas-action' })
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
      >
        <div
          className="preview-media-frame"
          data-testid="preview-media-frame"
          data-source-aspect-ratio={stage.backgroundSource.sourceAspectRatio}
        >
          {backgroundPreviewUrl ? (
            <video
              className="preview-background-video"
              data-testid="background-preview-video"
              muted
              playsInline
              preload="metadata"
              ref={backgroundVideoRef}
              onError={() => setBackgroundPreviewFailed(true)}
              onTimeUpdate={syncPlaybackFromBackground}
              style={{ pointerEvents: 'none' }}
            >
              <source src={backgroundPreviewUrl} type="video/mp4" />
            </video>
          ) : null}
          {!backgroundPreviewUrl ? (
            <div className="preview-slide">
              <span>Slide {segment.slide}</span>
              <strong>{segment.title}</strong>
              <p>{segment.caption}</p>
              <em>local preview source unavailable</em>
            </div>
          ) : null}
          <div className="preview-slide preview-slide--sr">
            <span>Slide {segment.slide}</span>
            <strong>{segment.title}</strong>
            <p>{segment.caption}</p>
          </div>
          {isEditing ? stage.elements.filter((element) => elementIsVisible(element, playback.currentFrame)).map((element) => (
            <button
              className="stage-element-box editor-only"
              key={element.id}
              type="button"
              aria-pressed={element.id === selectedElementId}
              data-editor-only="true"
              style={{
                left: `${element.box.x}%`,
                top: `${element.box.y}%`,
                width: `${element.box.width}%`,
                height: `${element.box.height}%`,
              }}
              onClick={(event) => {
                event.stopPropagation()
                dispatch({ type: 'select-stage-element', id: element.id })
              }}
            >
              {element.label}
            </button>
          )) : null}
          {activeActionEntries.map(renderActiveActionOverlay)}
        </div>
        {foregroundIsVisible ? (
          <div
            className="preview-speaker"
            data-testid="foreground-window-preview"
            data-shape={stage.foregroundWindow.shape}
            onPointerDown={(event) => {
              event.stopPropagation()
              if (isEditing) {
                setDragState({
                  kind: 'foreground-move',
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: stage.foregroundWindow.x,
                  originY: stage.foregroundWindow.y,
                })
              }
            }}
            style={{
              left: `${stage.foregroundWindow.x}%`,
              top: `${stage.foregroundWindow.y}%`,
              width: `${stage.foregroundWindow.width}%`,
              height: `${stage.foregroundWindow.height}%`,
              opacity: stage.foregroundWindow.opacity,
            }}
          >
            {foregroundPreviewUrl ? (
              <video
                className="preview-speaker__video"
                data-testid="foreground-preview-video"
                playsInline
                preload="metadata"
                ref={foregroundVideoRef}
                onError={() => setForegroundPreviewFailed(true)}
              >
                <source src={foregroundPreviewUrl} type="video/mp4" />
              </video>
            ) : (
              <span className="preview-media-unavailable">local preview source unavailable</span>
            )}
            {isEditing ? (
              <button
                type="button"
                aria-label="调整前台窗口大小"
                className="resize-handle resize-handle--foreground editor-only"
                data-editor-only="true"
                data-testid="foreground-resize-handle"
                style={dragHandleStyle}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                  setDragState({
                    kind: 'foreground-resize',
                    startX: event.clientX,
                    startY: event.clientY,
                    originWidth: stage.foregroundWindow.width,
                    originHeight: stage.foregroundWindow.height,
                  })
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => {
                  event.currentTarget.releasePointerCapture?.(event.pointerId)
                  stopDrag()
                }}
                onPointerCancel={stopDrag}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {selectedElement ? <p className="preview-hint">已选元素：{selectedElement.label}</p> : null}
      <div className="action-time-ruler" data-testid="action-time-ruler">
        <span
          className="action-time-ruler__playhead"
          style={{ left: `${(playback.currentFrame / playback.totalFrames) * 100}%` }}
          aria-hidden="true"
        />
        {timeline.map((timelineSegment) => (
          <span
            className="action-time-ruler__segment"
            key={timelineSegment.id}
            style={{
              left: `${(timelineSegment.from / playback.totalFrames) * 100}%`,
              width: `${(timelineSegment.duration / playback.totalFrames) * 100}%`,
            }}
          >
            {timelineSegment.title}
          </span>
        ))}
        {timeline.flatMap((timelineSegment) =>
          timelineSegment.actionRefs.map((ref, index) => {
            const targetElement = stage.elements.find((element) => element.id === ref.elementId)
            return (
              <span
                className="action-time-ruler__action"
                key={`${timelineSegment.id}-${ref.actionId}-${index}`}
                style={{
                  left: `${((timelineSegment.from + ref.from) / playback.totalFrames) * 100}%`,
                  width: `${(ref.duration / playback.totalFrames) * 100}%`,
                }}
              >
                {ref.actionId}
                {targetElement ? ` → ${targetElement.label}` : ''}
              </span>
            )
          }),
        )}
      </div>
      <p className="preview-hint">拖动画面中的标注可更新当前动作的 X/Y 参数。本地后续可把修改请求交给 Codex。</p>
    </section>
  )
}

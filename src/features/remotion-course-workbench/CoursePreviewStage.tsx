import { Player } from '@remotion/player'
import type { CallbackListener, PlayerRef } from '@remotion/player'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { migrateLegacyWorkbenchState } from './domain/courseProjectMigration'
import type { CourseProjectV2 } from './domain/courseProjectSchema'
import {
  compositionDimensions,
  CourseComposition,
} from './remotion/CourseComposition'
import { resolveActionOverlay } from './remotion/ActionOverlayLayer'
import { resolveForegroundWindowStyle } from './remotion/ForegroundLayer'
import { calculateContainTransform, editorCanvasStyle } from './remotion/PreviewGeometry'
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
  absoluteFrom: number
  phase: 'enter' | 'emphasis' | 'exit'
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

function isPlatformOverlay(ref: AnimationActionRef) {
  return (
    ref.exportRole === 'platform-overlay' &&
    ref.renderedInBackground !== true &&
    ref.exportableOverlay !== false
  )
}

function buildCompositionProject(
  stage: CourseStage,
  timeline: TimelineSegment[],
  actions: AnimationAction[],
  fps: number,
  durationFrames: number,
): CourseProjectV2 {
  const previewStage: CourseStage = {
    ...stage,
    foregroundSource: {
      ...stage.foregroundSource,
      durationFrames: Math.max(1, Math.round(stage.foregroundSource.durationFrames) || 1),
    },
    foregroundWindow: {
      ...stage.foregroundWindow,
      width: Math.max(1, stage.foregroundWindow.width || 1),
      height: Math.max(1, stage.foregroundWindow.height || 1),
    },
  }
  const previewActions = actions.map((candidate) => ({
    ...candidate,
    name: candidate.name.trim() || candidate.id,
    description: candidate.description.trim() || candidate.id,
    version: candidate.version.trim() || '0.0.0-draft',
    defaultDurationFrames: Math.max(1, Math.round(candidate.defaultDurationFrames) || 1),
  }))
  const previewTimeline = timeline.map((timelineSegment) => ({
    ...timelineSegment,
    actionRefs: timelineSegment.actionRefs.map((ref) => ({
      ...ref,
      duration: Math.max(1, Math.round(ref.duration) || 1),
      fadeInFrames: Math.max(0, Math.round(ref.fadeInFrames ?? 0) || 0),
      fadeOutFrames: Math.max(0, Math.round(ref.fadeOutFrames ?? 0) || 0),
    })),
  }))
  const migrated = migrateLegacyWorkbenchState({
    project: {
      id: stage.backgroundSource.id.replace(/^hf-/u, '') || stage.backgroundSource.id,
      title: stage.backgroundSource.name,
      aspectRatio: stage.canvasAspectRatio,
      fps,
    },
    stage: previewStage,
    timeline: previewTimeline,
    actions: previewActions,
  })
  const elementMap = Object.fromEntries(
    stage.elements.map((element) => [
      element.id,
      {
        rectsByAspect: element.boxesByAspect ?? { [stage.canvasAspectRatio]: element.box },
      },
    ]),
  )
  const foregroundMediaUrl = previewStage.foregroundSource.localPreviewUrl

  return {
    ...migrated,
    durationFrames,
    source: {
      ...migrated.source,
      background: {
        ...migrated.source.background,
        durationFrames,
        mediaUrl:
          stage.backgroundSource.previewMode === 'video'
            ? stage.backgroundSource.localPreviewUrl
            : undefined,
      },
      ...(foregroundMediaUrl
        ? {
            foreground: {
              id: previewStage.foregroundSource.id,
              durationFrames: previewStage.foregroundSource.durationFrames,
              mediaUrl: foregroundMediaUrl,
              audioPolicy: 'primary' as const,
              window: previewStage.foregroundWindow,
            },
          }
        : {}),
    },
    elementMap,
  } as CourseProjectV2
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
  const [previewSize, setPreviewSize] = useState(() => compositionDimensions[stage.canvasAspectRatio])
  const playerRef = useRef<PlayerRef>(null)
  const previewMediaFrameRef = useRef<HTMLDivElement>(null)
  const lastDispatchedFrameRef = useRef(playback.currentFrame)
  const selectedElement = stage.elements.find((element) => element.id === selectedElementId)
  const isEditing = mode === 'editing'
  const dimensions = compositionDimensions[stage.canvasAspectRatio]
  const previewTransform = calculateContainTransform(dimensions, previewSize)
  const compositionProject = useMemo(
    () => buildCompositionProject(stage, timeline, actions, fps, playback.totalFrames),
    [actions, fps, playback.totalFrames, stage, timeline],
  )
  const activeActionEntries = timeline.flatMap((timelineSegment): ActiveActionEntry[] =>
    timelineSegment.actionRefs.flatMap((ref) => {
      const absoluteFrom = timelineSegment.from + ref.from
      const active = playback.currentFrame >= absoluteFrom && playback.currentFrame < absoluteFrom + ref.duration
      const libraryAction = actions.find((candidate) => candidate.id === ref.actionId)

      if (!active || !libraryAction || !isPlatformOverlay(ref)) {
        return []
      }

      return [{
        ref,
        action: libraryAction,
        absoluteFrom,
        phase: actionPhase(ref, playback.currentFrame, timelineSegment.from),
      }]
    }),
  )
  const currentAction = activeActionEntries[0]?.action
  const foregroundIsVisible =
    playback.currentFrame < Math.min(stage.foregroundSource.durationFrames, playback.totalFrames)

  useLayoutEffect(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const onFrameUpdate: CallbackListener<'frameupdate'> = ({ detail }) => {
      const frame = clampPercent(detail.frame, 0, playback.totalFrames)

      if (frame !== lastDispatchedFrameRef.current) {
        lastDispatchedFrameRef.current = frame
        dispatch({ type: 'seek-frame', frame })
      }
    }
    const onPlay: CallbackListener<'play'> = () => dispatch({ type: 'set-playing', isPlaying: true })
    const onPause: CallbackListener<'pause'> = () => dispatch({ type: 'set-playing', isPlaying: false })

    player.addEventListener('frameupdate', onFrameUpdate)
    player.addEventListener('play', onPlay)
    player.addEventListener('pause', onPause)

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate)
      player.removeEventListener('play', onPlay)
      player.removeEventListener('pause', onPause)
    }
  }, [dispatch, playback.totalFrames])

  useLayoutEffect(() => {
    const mediaFrame = previewMediaFrameRef.current

    if (!mediaFrame) {
      return
    }

    const measure = () => {
      const rect = mediaFrame.getBoundingClientRect()

      if (rect.width > 0 && rect.height > 0) {
        setPreviewSize((current) =>
          current.width === rect.width && current.height === rect.height
            ? current
            : { width: rect.width, height: rect.height },
        )
      }
    }

    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(mediaFrame)
    window.addEventListener('resize', measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    const player = playerRef.current

    if (!player || player.getCurrentFrame() === playback.currentFrame) {
      return
    }

    lastDispatchedFrameRef.current = playback.currentFrame
    player.seekTo(playback.currentFrame)
  }, [playback.currentFrame])

  const seekPlayer = useCallback((frame: number) => {
    const nextFrame = clampPercent(frame, 0, playback.totalFrames)
    lastDispatchedFrameRef.current = nextFrame
    playerRef.current?.seekTo(nextFrame)
    dispatch({ type: 'seek-frame', frame: nextFrame })
  }, [dispatch, playback.totalFrames])

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

  const renderEditorAction = (entry: ActiveActionEntry) => {
    const instance = compositionProject.actionInstances.find((candidate) => candidate.id === entry.ref.id)
    const resolved = instance
      ? resolveActionOverlay(compositionProject, instance, stage.canvasAspectRatio)
      : undefined

    if (!instance || !resolved) {
      return null
    }

    const selectionStyle = {
      ...resolved.style,
      opacity: entry.phase === 'enter' ? 0.72 : entry.phase === 'exit' ? 0.58 : 1,
    }

    return (
      <div
        className="action-selection-box editor-only"
        data-action-ref-id={entry.ref.id}
        data-animation-phase={entry.phase}
        data-editor-only="true"
        data-testid={`action-selection-${entry.ref.id}`}
        key={entry.ref.id}
        style={selectionStyle}
      >
        <button
          aria-label="移动动作标注"
          className="action-move-handle editor-only"
          data-editor-only="true"
          data-testid="action-move-handle"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.setPointerCapture?.(event.pointerId)
            setDragState({
              kind: 'action-move',
              startX: event.clientX,
              startY: event.clientY,
              originX: entry.action.params.x ?? 16,
              originY: entry.action.params.y ?? 28,
            })
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId)
            stopDrag()
          }}
          onPointerCancel={stopDrag}
          style={dragHandleStyle}
          type="button"
        />
        <button
          aria-label="调整动作标注大小"
          className="resize-handle resize-handle--action editor-only"
          data-editor-only="true"
          data-testid="action-resize-handle"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.setPointerCapture?.(event.pointerId)
            setDragState({
              kind: 'action-resize',
              startX: event.clientX,
              startY: event.clientY,
              originWidth: entry.action.params.width ?? (entry.action.category === 'circle' ? 18 : 42),
              originHeight: entry.action.params.height ?? (entry.action.category === 'lower-third' ? 14 : 18),
              originRadius: entry.action.params.radius ?? 0,
            })
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId)
            stopDrag()
          }}
          onPointerCancel={stopDrag}
          style={dragHandleStyle}
          type="button"
        />
      </div>
    )
  }

  return (
    <section className="course-card course-card--preview">
      <div className="course-card__header">
        <p>Review Stage</p>
        <span>slide {segment.slide} · {segment.speaker}</span>
      </div>
      <h2>Review 预览</h2>
      <div className="preview-controls">
        <label>
          画布比例
          <select
            aria-label="画布比例"
            value={stage.canvasAspectRatio}
            onChange={(event) => dispatch({
              type: 'set-aspect-ratio',
              aspectRatio: event.target.value as CourseStage['canvasAspectRatio'],
            })}
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (playback.isPlaying) {
              playerRef.current?.pause()
            } else {
              playerRef.current?.play()
            }
            dispatch({ type: 'set-playing', isPlaying: !playback.isPlaying })
          }}
        >
          {playback.isPlaying ? '暂停' : '播放'}
        </button>
        <span>进场 · 强调 · 退场</span>
        <button
          type="button"
          onClick={() => seekPlayer(activeActionEntries[0]?.absoluteFrom ?? segment.from)}
        >
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
            max={Math.max(0, playback.totalFrames - 1)}
            value={Math.min(playback.currentFrame, Math.max(0, playback.totalFrames - 1))}
            onChange={(event) => seekPlayer(Number(event.target.value))}
          />
        </label>
        <span>{playback.currentFrame} / {playback.totalFrames}f</span>
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
          ref={previewMediaFrameRef}
        >
          <div className="preview-player-shell" data-testid="course-remotion-player">
            <Player
              acknowledgeRemotionLicense
              component={CourseComposition}
              compositionHeight={dimensions.height}
              compositionWidth={dimensions.width}
              controls={false}
              durationInFrames={playback.totalFrames}
              fps={fps}
              initialFrame={playback.currentFrame}
              inputProps={{ project: compositionProject, aspectRatio: stage.canvasAspectRatio, interactive: true }}
              ref={playerRef}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {isEditing ? (
            <div
              className="preview-editor-canvas editor-only"
              data-editor-only="true"
              data-testid="preview-editor-canvas"
              style={editorCanvasStyle(dimensions, previewTransform)}
            >
              {stage.elements.filter((element) => elementIsVisible(element, playback.currentFrame)).map((element) => (
                <button
                  className="stage-element-box editor-only"
                  key={element.id}
                  type="button"
                  aria-pressed={element.id === selectedElementId}
                  data-editor-only="true"
                  style={(() => {
                    const box = element.boxesByAspect?.[stage.canvasAspectRatio] ?? element.box
                    return {
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }
                  })()}
                  onClick={(event) => {
                    event.stopPropagation()
                    dispatch({ type: 'select-stage-element', id: element.id })
                  }}
                >
                  {element.label}
                </button>
              ))}
              {activeActionEntries.map(renderEditorAction)}
              {foregroundIsVisible ? (
                <div
                  className="preview-speaker preview-speaker--editor editor-only"
                  data-editor-only="true"
                  data-testid="foreground-window-preview"
                  data-shape={stage.foregroundWindow.shape}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    setDragState({
                      kind: 'foreground-move',
                      startX: event.clientX,
                      startY: event.clientY,
                      originX: stage.foregroundWindow.x,
                      originY: stage.foregroundWindow.y,
                    })
                  }}
                  style={resolveForegroundWindowStyle(stage.foregroundWindow)}
                >
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
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
                {ref.actionId}{targetElement ? ` → ${targetElement.label}` : ''}
              </span>
            )
          }),
        )}
      </div>
      <p className="preview-hint">拖动画面中的标注可更新当前动作的 X/Y 参数。本地后续可把修改请求交给 Codex。</p>
    </section>
  )
}

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AnimationAction, CourseWorkbenchAction, TimelineSegment } from './workbenchTypes'

type CoursePreviewStageProps = {
  action: AnimationAction
  segment: TimelineSegment
  dispatch: React.Dispatch<CourseWorkbenchAction>
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

export function CoursePreviewStage({ action, segment, dispatch }: CoursePreviewStageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewRun, setPreviewRun] = useState(0)
  const text = previewText(action)
  const color = action.params.color ?? '#2563eb'
  const actionStyle = {
    left: pct(action.params.x, 16),
    top: pct(action.params.y, 28),
    width: pct(action.params.width, action.category === 'circle' ? 18 : 42),
    height: pct(action.params.height, action.category === 'lower-third' ? 14 : 18),
    borderColor: color,
    color,
    '--action-color': color,
    '--action-scale': action.params.scale ?? 1.12,
    '--action-progress': `${action.params.progress ?? 64}%`,
  } as CSSProperties

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
        <span>进场 · 强调 · 退场</span>
        <button type="button" onClick={() => setPreviewRun((current) => current + 1)}>
          重播动作
        </button>
      </div>
      <div
        className="preview-canvas"
        data-testid="preview-canvas"
        onPointerDown={() => setIsDragging(true)}
        onPointerMove={(event) => {
          if (!isDragging) {
            return
          }

          dispatch({
            type: 'move-selected-action',
            x: Math.round(event.clientX / 7),
            y: Math.round(event.clientY / 5),
          })
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <div className="preview-slide">
          <span>Slide {segment.slide}</span>
          <strong>{segment.title}</strong>
          <p>{segment.caption}</p>
        </div>
        <div className="preview-speaker">口播</div>
        <div
          key={`${action.id}-${previewRun}`}
          className={`preview-action preview-action--${action.category}`}
          data-animation-phase="enter-emphasis-exit"
          data-testid="preview-action"
          style={actionStyle}
        >
          {renderActionPreview(action, text)}
        </div>
      </div>
      <p className="preview-hint">拖动画面中的标注可更新当前动作的 X/Y 参数。本地后续可把修改请求交给 Codex。</p>
    </section>
  )
}

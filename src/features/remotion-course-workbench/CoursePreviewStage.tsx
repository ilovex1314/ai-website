import { useState } from 'react'
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

export function CoursePreviewStage({ action, segment, dispatch }: CoursePreviewStageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const text = previewText(action)
  const color = action.params.color ?? '#2563eb'
  const actionStyle = {
    left: pct(action.params.x, 16),
    top: pct(action.params.y, 28),
    width: pct(action.params.width, action.category === 'circle' ? 18 : 42),
    height: pct(action.params.height, action.category === 'lower-third' ? 14 : 18),
    borderColor: color,
    color,
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
        <div className={`preview-action preview-action--${action.category}`} data-testid="preview-action" style={actionStyle}>
          {text}
        </div>
      </div>
      <p className="preview-hint">拖动画面中的标注可更新当前动作的 X/Y 参数。本地后续可把修改请求交给 Codex。</p>
    </section>
  )
}

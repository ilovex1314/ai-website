import { useEffect, useState } from 'react'
import { actionCategoryLabels } from './animationLibraryModel'
import { PointingArrowEditor } from './PointingArrowEditor'
import { PointingArrowVisual } from './PointingArrowVisual'
import type { ActionParams, AnimationAction } from './workbenchTypes'

const assetKindLabels = {
  'animate-existing-element': '添加动画',
  'add-element-with-animation': '添加元素 + 动画',
} as const

type CourseActionLiveDemoProps = {
  action: AnimationAction
  onActionChange?: (params: Partial<ActionParams>) => void
}

function demoLabel(action: AnimationAction) {
  return action.params.label ?? action.params.text ?? action.params.title ?? action.name
}

function demoBody(action: AnimationAction) {
  const label = demoLabel(action)

  switch (action.category) {
    case 'progress':
      return <><span>{label}</span><i aria-hidden="true" /></>
    case 'step-reveal':
      return <><span>{label}</span><small>{action.params.step ?? 1}/{action.params.totalSteps ?? 4}</small></>
    case 'cursor':
      return <><span aria-hidden="true" /><strong>{label}</strong></>
    case 'code':
      return <><span>line {action.params.line ?? 1}</span><strong>{label}</strong></>
    case 'comparison':
      return <><span>Before</span><strong>{label}</strong><span>After</span></>
    case 'transition':
      return <><strong>{label}</strong><span>{action.params.subtitle ?? 'Next section'}</span></>
    default:
      return label
  }
}

export function CourseActionLiveDemo({ action, onActionChange }: CourseActionLiveDemoProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    setIsPlaying(true)
    setReplayKey((key) => key + 1)
  }, [action.id])

  const replay = () => {
    setIsPlaying(true)
    setReplayKey((key) => key + 1)
  }

  return (
    <section
      className="course-card action-studio-card action-live-demo"
      data-action-category={action.category}
      data-testid="action-live-demo"
    >
      <div className="course-card__header">
        <p>Live Component</p>
        <span>{actionCategoryLabels[action.category]}</span>
      </div>
      <h2>实时 Demo</h2>

      <div className="action-live-demo__toolbar">
        <div>
          <strong className="action-live-demo__title">{action.name}</strong>
          <span>{assetKindLabels[action.assetKind]} · {action.defaultDurationFrames}f</span>
        </div>
        <div className="action-live-demo__controls">
          <button className="course-button" type="button" onClick={() => setIsPlaying((value) => !value)}>
            {isPlaying ? '暂停 Demo' : '播放 Demo'}
          </button>
          <button className="course-button" type="button" onClick={replay}>重播 Demo</button>
        </div>
      </div>

      <div className={`action-live-demo__stage${isPlaying ? '' : ' is-paused'}`}>
        <div className="action-demo__subject" data-testid="action-demo-subject">
          <small>CHAPTER 02</small>
          <strong>课程核心概念</strong>
          <span>把复杂信息变成观众一眼能抓住的重点。</span>
        </div>
        <div
          className={`preview-action preview-action--${action.category} action-live-demo__visual`}
          data-testid="action-live-visual"
          key={`${action.id}-${replayKey}`}
          style={{
            '--action-color': action.params.color ?? '#2563eb',
            '--action-progress': `${action.params.progress ?? 64}%`,
            '--action-scale': action.params.scale ?? 1.12,
            borderColor: action.params.color ?? '#2563eb',
            color: action.params.color ?? '#2563eb',
            borderRadius: `${action.params.borderRadius ?? action.params.radius ?? 10}px`,
          } as React.CSSProperties}
        >
          {action.id === 'pointing-arrow' ? (
            <PointingArrowVisual
              color={action.params.color ?? '#2563eb'}
              imageUrl={action.params.arrowImageUrl}
              shape={action.params.arrowShape ?? 'straight'}
              sourceTail={{ x: action.params.arrowTailAnchorX ?? 0.08, y: action.params.arrowTailAnchorY ?? 0.5 }}
              sourceTip={{ x: action.params.arrowTipAnchorX ?? 0.92, y: action.params.arrowTipAnchorY ?? 0.5 }}
            />
          ) : demoBody(action)}
        </div>
      </div>

      {onActionChange ? <PointingArrowEditor action={action} onChange={onActionChange} /> : null}

      <div className="action-live-demo__meta">
        <span><strong>资产类型</strong>{assetKindLabels[action.assetKind]}</span>
        <span><strong>版本</strong>{action.version}</span>
        <span><strong>状态</strong>{action.status}</span>
      </div>
      <p className="action-live-demo__intent">{action.implementation.intent}</p>
    </section>
  )
}

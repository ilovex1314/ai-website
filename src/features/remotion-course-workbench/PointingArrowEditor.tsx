import { useEffect, useState } from 'react'
import { readArrowAsset } from './arrowAssetModel'
import type { ActionParams, AnimationAction, PointingArrowShape } from './workbenchTypes'

type PointingArrowEditorProps = {
  action: AnimationAction
  onChange: (params: Partial<ActionParams>) => void
}

const shapeLabels: Array<{ value: PointingArrowShape; label: string }> = [
  { value: 'straight', label: '直线' },
  { value: 'curve', label: '曲线' },
  { value: 'elbow', label: '折线' },
  { value: 'custom-image', label: '自定义图片' },
]

export function PointingArrowEditor({ action, onChange }: PointingArrowEditorProps) {
  const [calibrating, setCalibrating] = useState<'tail' | 'tip'>('tail')
  const [error, setError] = useState('')
  const params = action.params

  useEffect(() => {
    setCalibrating('tail')
    setError('')
  }, [action.id])

  if (action.id !== 'pointing-arrow') return null

  const upload = async (file?: File) => {
    if (!file) return
    try {
      const asset = await readArrowAsset(file)
      onChange({
        arrowShape: 'custom-image',
        arrowImageUrl: asset.dataUrl,
        arrowImageAspectRatio: asset.aspectRatio,
        arrowTailAnchorX: 0.08,
        arrowTailAnchorY: 0.5,
        arrowTipAnchorX: 0.92,
        arrowTipAnchorY: 0.5,
      })
      setError('')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '箭头图片读取失败')
    }
  }

  return (
    <div className="pointing-arrow-editor" data-testid="pointing-arrow-editor">
      <div className="pointing-arrow-editor__header">
        <strong>指向配置</strong>
        <span>箭头尖端自动吸附目标 DOM 最近边缘</span>
      </div>
      <div className="pointing-arrow-editor__shapes" aria-label="箭头形状">
        {shapeLabels.map((shape) => (
          <button
            aria-pressed={(params.arrowShape ?? 'straight') === shape.value}
            key={shape.value}
            type="button"
            onClick={() => onChange({ arrowShape: shape.value })}
          >
            {shape.label}
          </button>
        ))}
      </div>
      <div className="pointing-arrow-editor__fields">
        <label>
          箭头颜色
          <input type="color" value={params.color ?? '#2563eb'} onChange={(event) => onChange({ color: event.target.value })} />
        </label>
        <label>
          上传异形箭头
          <input accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml" type="file" onChange={(event) => void upload(event.target.files?.[0])} />
        </label>
      </div>
      {(params.arrowShape === 'custom-image' || params.arrowImageUrl) && (
        <div className="pointing-arrow-calibration">
          <div className="pointing-arrow-calibration__toolbar">
            <button aria-pressed={calibrating === 'tail'} type="button" onClick={() => setCalibrating('tail')}>标定尾部</button>
            <button aria-pressed={calibrating === 'tip'} type="button" onClick={() => setCalibrating('tip')}>标定尖端</button>
            <span>点击图片设置当前锚点</span>
          </div>
          {params.arrowImageUrl ? (
            <button
              aria-label="箭头锚点标定画布"
              className="pointing-arrow-calibration__canvas"
              type="button"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
                const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height)))
                onChange(calibrating === 'tail'
                  ? { arrowTailAnchorX: x, arrowTailAnchorY: y }
                  : { arrowTipAnchorX: x, arrowTipAnchorY: y })
              }}
            >
              <img alt="自定义箭头" src={params.arrowImageUrl} />
              <i className="is-tail" style={{ left: `${(params.arrowTailAnchorX ?? 0.08) * 100}%`, top: `${(params.arrowTailAnchorY ?? 0.5) * 100}%` }}>尾</i>
              <i className="is-tip" style={{ left: `${(params.arrowTipAnchorX ?? 0.92) * 100}%`, top: `${(params.arrowTipAnchorY ?? 0.5) * 100}%` }}>尖</i>
            </button>
          ) : <p>上传图片后标定尾部与尖端。</p>}
        </div>
      )}
      {error ? <p className="pointing-arrow-editor__error" role="alert">{error}</p> : null}
    </div>
  )
}

import type { Dispatch } from 'react'
import type { ModelerAction, PrimitiveKind, TransformMode } from './modelerTypes'

const primitiveTools: Array<{ primitive: PrimitiveKind; label: string }> = [
  { primitive: 'box', label: '添加立方体' },
  { primitive: 'sphere', label: '添加球体' },
  { primitive: 'cylinder', label: '添加圆柱' },
  { primitive: 'cone', label: '添加圆锥' },
  { primitive: 'plane', label: '添加平面' },
]

const transformModes: Array<{ mode: TransformMode; label: string }> = [
  { mode: 'translate', label: '移动' },
  { mode: 'rotate', label: '旋转' },
  { mode: 'scale', label: '缩放' },
]

type ModelerToolbarProps = {
  mode: TransformMode
  onModeChange: (mode: TransformMode) => void
  dispatch: Dispatch<ModelerAction>
}

export function ModelerToolbar({ mode, onModeChange, dispatch }: ModelerToolbarProps) {
  return (
    <aside className="modeler-toolbar" aria-label="建模工具">
      <div>
        <h2>基础几何体</h2>
        <div className="tool-button-grid">
          {primitiveTools.map((tool) => (
            <button
              key={tool.primitive}
              type="button"
              onClick={() => dispatch({ type: 'add-part', primitive: tool.primitive })}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2>变换模式</h2>
        <div className="segmented-control" role="group" aria-label="变换模式">
          {transformModes.map((item) => (
            <button
              className={mode === item.mode ? 'is-active' : ''}
              key={item.mode}
              type="button"
              onClick={() => onModeChange(item.mode)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="reset-button" onClick={() => dispatch({ type: 'reset-current-model' })}>
        重置当前组合体
      </button>
    </aside>
  )
}

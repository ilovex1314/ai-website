import type { Dispatch } from 'react'
import type {
  ModelPart,
  ModelerAction,
  PartMaterial,
  PartTransform,
  PrimitiveDimensions,
} from './modelerTypes'

type ObjectInspectorProps = {
  selectedPart: ModelPart | undefined
  dispatch: Dispatch<ModelerAction>
}

const transformFields: Array<{
  group: keyof PartTransform
  label: string
  step: number
}> = [
  { group: 'position', label: '位置', step: 0.1 },
  { group: 'rotation', label: '旋转', step: 0.1 },
  { group: 'scale', label: '缩放', step: 0.1 },
]

const axes = ['X', 'Y', 'Z'] as const

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getDimensionFields(part: ModelPart) {
  switch (part.primitive) {
    case 'box':
      return [
        { key: 'width', label: '宽度 X', value: 'width' in part.dimensions ? part.dimensions.width : 1 },
        { key: 'height', label: '高度 Y', value: 'height' in part.dimensions ? part.dimensions.height : 1 },
        { key: 'depth', label: '深度 Z', value: 'depth' in part.dimensions ? part.dimensions.depth : 1 },
      ] as const
    case 'cylinder':
    case 'cone':
      return [
        { key: 'radius', label: '半径 R', value: 'radius' in part.dimensions ? part.dimensions.radius : 0.5 },
        { key: 'height', label: '高度 H', value: 'height' in part.dimensions ? part.dimensions.height : 1 },
      ] as const
    case 'sphere':
      return [{ key: 'radius', label: '半径 R', value: 'radius' in part.dimensions ? part.dimensions.radius : 0.5 }] as const
    case 'plane':
    default:
      return [
        { key: 'width', label: '宽度 X', value: 'width' in part.dimensions ? part.dimensions.width : 1 },
        { key: 'depth', label: '深度 Z', value: 'depth' in part.dimensions ? part.dimensions.depth : 1 },
      ] as const
  }
}

export function ObjectInspector({ selectedPart, dispatch }: ObjectInspectorProps) {
  if (!selectedPart) {
    return (
      <section className="panel-section inspector-empty">
        <h2>属性面板</h2>
        <p>点击画布或对象树中的零件后，可以编辑它的 transform 和材质。</p>
      </section>
    )
  }

  function patchTransform(group: keyof PartTransform, index: number, value: string) {
    const next = [...selectedPart!.transform[group]] as PartTransform[typeof group]
    next[index] = toNumber(value)
    dispatch({
      type: 'update-part',
      id: selectedPart!.id,
      patch: { transform: { [group]: next } },
    })
  }

  function patchMaterial(patch: Partial<PartMaterial>) {
    dispatch({
      type: 'update-part',
      id: selectedPart!.id,
      patch: { material: patch },
    })
  }

  function patchDimension(key: string, value: string) {
    dispatch({
      type: 'update-part',
      id: selectedPart!.id,
      patch: {
        dimensions: {
          ...selectedPart!.dimensions,
          [key]: Math.max(0.05, toNumber(value)),
        } as PrimitiveDimensions,
      },
    })
  }

  return (
    <section className="panel-section object-inspector">
      <h2>属性面板</h2>
      <label>
        名称
        <input
          value={selectedPart.name}
          onChange={(event) =>
            dispatch({
              type: 'update-part',
              id: selectedPart.id,
              patch: { name: event.target.value },
            })
          }
        />
      </label>

      {transformFields.map((field) => (
        <fieldset key={field.group}>
          <legend>{field.label}</legend>
          <div className="axis-grid">
            {axes.map((axis, index) => (
              <label key={axis}>
                {axis}
                <input
                  type="number"
                  step={field.step}
                  value={selectedPart.transform[field.group][index]}
                  onChange={(event) => patchTransform(field.group, index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend>基础尺寸</legend>
        <div className="dimension-grid">
          {getDimensionFields(selectedPart).map((field) => (
            <label key={field.key}>
              {field.label}
              <input
                type="number"
                min="0.05"
                step="0.05"
                value={field.value}
                onChange={(event) => patchDimension(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="material-grid">
        <label>
          颜色
          <input
            aria-label="颜色"
            type="color"
            value={selectedPart.material.color}
            onChange={(event) => patchMaterial({ color: event.target.value })}
          />
        </label>
        <label>
          金属度
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={selectedPart.material.metalness}
            onChange={(event) => patchMaterial({ metalness: toNumber(event.target.value) })}
          />
        </label>
        <label>
          粗糙度
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={selectedPart.material.roughness}
            onChange={(event) => patchMaterial({ roughness: toNumber(event.target.value) })}
          />
        </label>
      </div>

      <button
        type="button"
        className="danger-button"
        onClick={() => dispatch({ type: 'delete-part', id: selectedPart.id })}
      >
        删除选中对象
      </button>
    </section>
  )
}

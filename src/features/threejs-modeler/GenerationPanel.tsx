import type { GeneratedScene, GenerationAnimationMode, GenerationMode, GenerationSettings, SavedScene } from './modelerTypes'

type GenerationPanelProps = {
  settings: GenerationSettings
  generatedScene: GeneratedScene
  savedScenes: SavedScene[]
  onChange: (settings: GenerationSettings) => void
}

const modeLabels: Array<{ value: GenerationMode; label: string }> = [
  { value: 'grid', label: '网格阵列' },
  { value: 'radial', label: '环形装置' },
  { value: 'stack', label: '层叠高塔' },
]

const animationLabels: Array<{ value: GenerationAnimationMode; label: string }> = [
  { value: 'orbit', label: '整体旋转' },
  { value: 'pulse', label: '呼吸缩放' },
  { value: 'disperse', label: '粒子分散' },
]

function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function GenerationPanel({ settings, generatedScene, savedScenes, onChange }: GenerationPanelProps) {
  return (
    <section className="generation-controls">
      <label>
        场景
        <select
          aria-label="场景"
          value={settings.sourceSceneId ?? ''}
          onChange={(event) => onChange({ ...settings, sourceSceneId: event.target.value || null })}
        >
          <option value="">选择已保存场景</option>
          {savedScenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <label>
          生成模式
          <select
            aria-label="生成模式"
            value={settings.mode}
            onChange={(event) =>
              onChange({ ...settings, mode: event.target.value as GenerationMode })
            }
          >
            {modeLabels.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        数量
        <input
          type="number"
          min="1"
          max="36"
          value={settings.count}
          onChange={(event) =>
            onChange({ ...settings, count: Math.max(1, Math.min(36, numberValue(event.target.value))) })
          }
        />
      </label>
      <label>
        间距
        <input
          type="number"
          min="0.5"
          max="8"
          step="0.1"
          value={settings.spacing}
          onChange={(event) => onChange({ ...settings, spacing: numberValue(event.target.value) })}
        />
      </label>
      <label>
        动画
        <select
          aria-label="动画模式"
          value={settings.animation.mode}
          onChange={(event) =>
            onChange({
              ...settings,
              animation: { ...settings.animation, mode: event.target.value as GenerationAnimationMode },
            })
          }
        >
          {animationLabels.map((animation) => (
            <option key={animation.value} value={animation.value}>
              {animation.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        速度
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={settings.animation.speed}
          onChange={(event) =>
            onChange({ ...settings, animation: { ...settings.animation, speed: numberValue(event.target.value) } })
          }
        />
      </label>
      <label>
        幅度
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={settings.animation.amplitude}
          onChange={(event) =>
            onChange({ ...settings, animation: { ...settings.animation, amplitude: numberValue(event.target.value) } })
          }
        />
      </label>
      <p>已生成 {generatedScene.instances.length} 个场景实例，后续可以把这份结构持久化到数据库。</p>
    </section>
  )
}

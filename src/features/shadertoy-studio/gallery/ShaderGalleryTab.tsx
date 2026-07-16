import { useState } from 'react'
import { ShaderCanvas } from '../runtime/ShaderCanvas'
import type { ShaderDiagnostic, ShaderHandoff, TeachingUniformValues } from '../runtime/shaderTypes'
import {
  createGalleryState,
  galleryDefaults,
  galleryHandoff,
  galleryPresets,
  galleryUniformBindings,
  getGalleryPreset,
  type GalleryContainer,
  type GalleryPreset,
  type GalleryState,
} from './galleryPresets'

export type ShaderGalleryTabProps = {
  state: GalleryState
  onChange: (state: GalleryState) => void
  onInspectInLab: (presetId: GalleryPreset['id']) => void
  onCheckMigration: (handoff: ShaderHandoff) => void
}

const containerLabels: Record<GalleryContainer, string> = {
  background: '全屏背景',
  hero: 'Hero 横幅',
  card: '内容卡片',
}

const containerNotes: Record<GalleryContainer, string> = {
  background: '背景模式要预留文字安全区，并用遮罩保证前景对比度。',
  hero: 'Hero 模式适合首屏标题；控制 DPR 和动画速度能降低持续 GPU 压力。',
  card: '卡片模式面积更小，适合作为交互反馈；仍要为减少动态效果的用户提供暂停状态。',
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255) as [number, number, number]
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((value) => Math.round(value * 255).toString(16).padStart(2, '0')).join('')}`
}

export function ShaderGalleryTab({
  state,
  onChange,
  onInspectInLab,
  onCheckMigration,
}: ShaderGalleryTabProps) {
  const preset = getGalleryPreset(state.presetId)
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([])

  const updateUniform = <Key extends keyof TeachingUniformValues>(
    key: Key,
    value: TeachingUniformValues[Key],
  ) => onChange({ ...state, uniforms: { ...state.uniforms, [key]: value } })

  return (
    <div className="shader-gallery-grid">
      <aside className="shader-panel shader-preset-list" aria-label="原创 Shader 作品">
        <p className="shader-kicker">A · 作品展厅</p>
        <h2>先看见 Shader 能做什么</h2>
        {galleryPresets.map((item) => (
          <button
            className="shader-preset-card"
            data-preset-id={item.id}
            aria-pressed={item.id === state.presetId}
            aria-label={`选择作品 ${item.title}`}
            key={item.id}
            onClick={() => onChange({
              ...state,
              presetId: item.id,
              uniforms: {
                ...galleryDefaults,
                uPrimaryColor: [...galleryDefaults.uPrimaryColor],
                uSecondaryColor: [...galleryDefaults.uSecondaryColor],
              },
              compileRevision: state.compileRevision + 1,
            })}
          >
            <img src={item.poster} alt="" />
            <span>{item.title}</span>
            <small>{item.eyebrow}</small>
          </button>
        ))}
      </aside>

      <section className="shader-panel shader-gallery-stage-panel">
        <header className="shader-section-heading">
          <div>
            <p>{preset.eyebrow}</p>
            <h2>{preset.title}</h2>
          </div>
          <span className="shader-status" data-level={diagnostics.length ? 'error' : state.playing ? 'running' : 'warning'}>
            {diagnostics.length ? '编译有误' : state.playing ? '实时运行' : '已暂停'}
          </span>
        </header>
        <p>{preset.description}</p>
        <div className="shader-stage" data-container={state.container}>
          <ShaderCanvas
            key={`${state.presetId}-${state.compileRevision}`}
            request={{ source: preset.source, profile: 'webgl1', revision: state.compileRevision }}
            uniforms={galleryUniformBindings(state)}
            playing={state.playing}
            quality={state.quality}
            initialElapsed={state.elapsed}
            ariaLabel={`${preset.title} 实时 Shader 画布`}
            onCompileResult={(result) => setDiagnostics(result.ok ? [] : result.diagnostics)}
            onElapsedChange={(elapsed) => onChange({ ...state, elapsed })}
          />
        </div>
        <p className="shader-stage-note">{containerNotes[state.container]} {preset.usage}</p>
        {diagnostics.length ? (
          <div aria-live="polite">
            {diagnostics.map((item) => <p className="shader-issue" data-level="blocker" key={item.raw}>{item.message}</p>)}
          </div>
        ) : null}
        <div className="shader-button-row">
          <button onClick={() => onChange({ ...state, playing: !state.playing })}>
            {state.playing ? '暂停动画' : '继续动画'}
          </button>
          <button onClick={() => onChange({ ...state, elapsed: 0, compileRevision: state.compileRevision + 1 })}>重置时间</button>
          <button onClick={() => onInspectInLab(state.presetId)}>去实验室拆解</button>
          <button onClick={() => onCheckMigration(galleryHandoff(state))}>检查迁移</button>
        </div>
      </section>

      <aside className="shader-panel shader-side-panel">
        <h3>宿主控制</h3>
        <div className="shader-control-list">
          <label>动画速度
            <input aria-label="动画速度" type="range" min="0" max="3" step="0.05" value={state.uniforms.uSpeed} onChange={(event) => updateUniform('uSpeed', Number(event.target.value))} />
          </label>
          <label>图形尺度
            <input type="range" min="0.5" max="8" step="0.1" value={state.uniforms.uScale} onChange={(event) => updateUniform('uScale', Number(event.target.value))} />
          </label>
          <label>发光强度
            <input type="range" min="0" max="2.5" step="0.05" value={state.uniforms.uIntensity} onChange={(event) => updateUniform('uIntensity', Number(event.target.value))} />
          </label>
          <label>主色
            <input type="color" value={rgbToHex(state.uniforms.uPrimaryColor)} onChange={(event) => updateUniform('uPrimaryColor', hexToRgb(event.target.value))} />
          </label>
          <label>辅色
            <input type="color" value={rgbToHex(state.uniforms.uSecondaryColor)} onChange={(event) => updateUniform('uSecondaryColor', hexToRgb(event.target.value))} />
          </label>
        </div>

        <fieldset>
          <legend>网站容器</legend>
          {Object.entries(containerLabels).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="gallery-container" checked={state.container === value} onChange={() => onChange({ ...state, container: value as GalleryContainer })} />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>渲染质量</legend>
          {([0.5, 0.75, 1] as const).map((quality) => (
            <button aria-pressed={state.quality === quality} key={quality} onClick={() => onChange({ ...state, quality })}>{quality}×</button>
          ))}
        </fieldset>

        <div className="shader-concept-card">
          <h3>你正在控制什么？</h3>
          <p>React 把速度、颜色与尺寸写成 uniforms；GPU 再为画布中的每个像素执行同一个 mainImage。</p>
          <button onClick={() => onChange(createGalleryState())}>恢复展厅默认值</button>
        </div>
      </aside>
    </div>
  )
}

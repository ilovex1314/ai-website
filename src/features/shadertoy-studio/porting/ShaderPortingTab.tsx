import { useState } from 'react'
import { ShaderCanvas } from '../runtime/ShaderCanvas'
import type { CompatibilityIssue } from '../runtime/shaderCompatibility'
import type {
  ShaderCompileResult,
  ShaderDiagnostic,
  ShaderHandoff,
  ShaderProfilePreference,
  UniformBinding,
} from '../runtime/shaderTypes'
import { IntegrationRecipe } from './IntegrationRecipe'
import {
  applyAnalysis,
  createIntegrationRecipe,
  type PortingState,
} from './portingModel'

export type ShaderPortingTabProps = {
  state: PortingState
  onChange: (state: PortingState) => void
  pendingHandoff?: ShaderHandoff
  onAcceptHandoff: () => void
  onRejectHandoff: () => void
}

function blockerGuidance(issue: CompatibilityIssue) {
  if (issue.id === 'external-channel') return '先确认 texture source，再实现 filtering/wrapping，并在每一帧完成 texture/frame binding。'
  if (issue.id.startsWith('sampler-')) return '把资源作为本地 asset 加载，创建 texture 并完成 sampler binding。'
  if (issue.id === 'sound-pipeline') return '把声音入口拆到 Web Audio 管线。'
  if (issue.id === 'vr-pipeline') return '用 WebXR 提供双眼视图和姿态输入。'
  if (issue.id.startsWith('uniform-')) return '把 matrix、array 或 struct 展平成受支持的标量和向量 uniforms。'
  return issue.action
}

function updateBindingValue(binding: UniformBinding, index: number, raw: string | boolean): UniformBinding {
  if (binding.type === 'bool') return { ...binding, value: Boolean(raw) }
  const number = Number(raw)
  if (Array.isArray(binding.value)) {
    const next = [...binding.value] as number[]
    next[index] = Number.isFinite(number) ? number : 0
    return { ...binding, value: next as UniformBinding['value'] }
  }
  return { ...binding, value: Number.isFinite(number) ? number : 0 }
}

export function ShaderPortingTab({
  state,
  onChange,
  pendingHandoff,
  onAcceptHandoff,
  onRejectHandoff,
}: ShaderPortingTabProps) {
  const [runRevision, setRunRevision] = useState<number | null>(null)
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([])
  const recipe = createIntegrationRecipe(state)

  const editSource = (source: string) => {
    setRunRevision(null)
    setDiagnostics([])
    onChange({
      ...state,
      source,
      sourceRevision: state.sourceRevision + 1,
      verifiedRevision: null,
      report: null,
      customUniforms: {},
    })
  }

  const setProfile = (profilePreference: ShaderProfilePreference) => {
    setRunRevision(null)
    onChange({ ...state, profilePreference, report: null, verifiedRevision: null })
  }

  const handleCompile = (result: ShaderCompileResult) => {
    if (result.ok) {
      setDiagnostics([])
      onChange({ ...state, verifiedRevision: state.sourceRevision })
    } else {
      setDiagnostics(result.diagnostics)
    }
  }

  return (
    <div className="shader-porting-grid">
      <section className="shader-panel shader-porting-source">
        <p className="shader-kicker">C · 迁移工作台</p>
        <h2>先识别依赖，再决定怎么接入</h2>
        <p>首版只直接运行自包含的 Image 单 Pass；不猜测 Channel、Buffer、音视频或多 Pass 来源。</p>

        {pendingHandoff ? (
          <div className="shader-handoff-banner">
            <strong>要用“{pendingHandoff.title}”覆盖当前迁移源码吗？</strong>
            <p>当前内容会保留到你明确接受为止。</p>
            <div className="shader-button-row">
              <button onClick={onAcceptHandoff}>接受并分析</button>
              <button onClick={onRejectHandoff}>保留当前内容</button>
            </div>
          </div>
        ) : null}

        <label htmlFor="shader-porting-source">Shadertoy Image 源码</label>
        <textarea
          id="shader-porting-source"
          className="shader-code-input"
          value={state.source}
          spellCheck={false}
          onChange={(event) => editSource(event.target.value)}
        />

        <fieldset>
          <legend>GLSL / WebGL profile</legend>
          {([
            ['auto', '自动识别'],
            ['webgl1', 'WebGL 1'],
            ['webgl2', 'WebGL 2'],
          ] as const).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="porting-profile" checked={state.profilePreference === value} onChange={() => setProfile(value)} />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="shader-provenance-fields">
          <label>来源 URL
            <input type="url" value={state.provenance?.sourceUrl ?? ''} onChange={(event) => onChange({ ...state, provenance: { ...state.provenance, sourceUrl: event.target.value } })} />
          </label>
          <label>作者
            <input value={state.provenance?.author ?? ''} onChange={(event) => onChange({ ...state, provenance: { ...state.provenance, author: event.target.value } })} />
          </label>
          <label>许可备注
            <input value={state.provenance?.licenseNote ?? ''} onChange={(event) => onChange({ ...state, provenance: { ...state.provenance, licenseNote: event.target.value } })} />
          </label>
        </div>

        <div className="shader-button-row">
          <button onClick={() => {
            setRunRevision(null)
            setDiagnostics([])
            onChange(applyAnalysis(state))
          }}>分析兼容性</button>
          <button disabled={state.report?.canRun !== true} onClick={() => setRunRevision(state.sourceRevision)}>尝试运行</button>
        </div>
      </section>

      <section className="shader-panel shader-porting-result">
        <header className="shader-section-heading">
          <div>
            <p>兼容性报告</p>
            <h2>{state.report ? `${state.report.profile.toUpperCase()} · ${state.report.status}` : '等待分析'}</h2>
          </div>
          <span className="shader-status" data-level={state.report?.status ?? 'warning'}>
            {state.report?.canRun ? '可尝试编译' : state.report ? '需要补齐宿主能力' : '未分析'}
          </span>
        </header>

        {state.report?.issues.map((issue) => (
          <article className="shader-issue" data-level={issue.level} key={issue.id}>
            <h3>{issue.title}</h3>
            <p>{issue.detail}</p>
            <p><strong>迁移动作：</strong>{blockerGuidance(issue)}</p>
          </article>
        ))}

        {Object.entries(state.customUniforms).length ? (
          <section className="shader-custom-uniforms">
            <h3>自定义 uniform 初始值</h3>
            {Object.entries(state.customUniforms).map(([name, binding]) => (
              <div className="shader-uniform-row" key={name}>
                {binding.type === 'bool' ? (
                  <label>{name} ({binding.type})
                    <input
                      type="checkbox"
                      checked={Boolean(binding.value)}
                      onChange={(event) => onChange({ ...state, verifiedRevision: null, customUniforms: { ...state.customUniforms, [name]: updateBindingValue(binding, 0, event.target.checked) } })}
                    />
                  </label>
                ) : Array.isArray(binding.value) ? (
                  <fieldset>
                    <legend>{name} ({binding.type})</legend>
                    {binding.value.map((value, index) => (
                      <label key={index}>{index + 1}
                        <input type="number" step="any" value={value} onChange={(event) => onChange({ ...state, verifiedRevision: null, customUniforms: { ...state.customUniforms, [name]: updateBindingValue(binding, index, event.target.value) } })} />
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <label>{name} ({binding.type})
                    <input type="number" step={binding.type === 'int' ? 1 : 'any'} value={Number(binding.value)} onChange={(event) => onChange({ ...state, verifiedRevision: null, customUniforms: { ...state.customUniforms, [name]: updateBindingValue(binding, 0, event.target.value) } })} />
                  </label>
                )}
              </div>
            ))}
          </section>
        ) : null}

        {runRevision === state.sourceRevision && state.report?.canRun ? (
          <div className="shader-stage" data-container="card">
            <ShaderCanvas
              request={{ source: state.source, profile: state.report.profile, revision: runRevision }}
              uniforms={state.customUniforms}
              playing
              quality={0.75}
              initialElapsed={0}
              ariaLabel="迁移源码验证画布"
              onCompileResult={handleCompile}
              onElapsedChange={() => undefined}
            />
          </div>
        ) : null}

        {diagnostics.length ? (
          <div aria-live="polite">
            {diagnostics.map((item, index) => <p className="shader-issue" data-level="blocker" key={`${item.raw}-${index}`}>{item.line ? `第 ${item.line} 行：` : ''}{item.message}</p>)}
          </div>
        ) : null}
      </section>

      <aside className="shader-panel shader-side-panel">
        {recipe ? <IntegrationRecipe recipe={recipe} /> : (
          <div className="shader-empty-recipe">
            <h2>配方等待验证</h2>
            <p>{state.report?.canRun ? '点击“尝试运行”，编译成功后才会生成可信配方。' : '通过兼容性分析并补齐 blocker 后，这里才会生成配方。'}</p>
          </div>
        )}
      </aside>
    </div>
  )
}

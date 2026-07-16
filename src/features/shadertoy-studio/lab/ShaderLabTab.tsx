import { useCallback, useRef, useState } from 'react'
import type { GalleryPreset } from '../gallery/galleryPresets'
import { ShaderCanvas } from '../runtime/ShaderCanvas'
import type { ShaderCompileResult, ShaderDiagnostic, ShaderHandoff } from '../runtime/shaderTypes'
import {
  labHandoff,
  lessonUniformBindings,
  shaderLessons,
  updateLessonDraft,
  type LabState,
} from './shaderLessons'

export type ShaderLabTabProps = {
  state: LabState
  onChange: (state: LabState) => void
  referencePreset?: GalleryPreset
  onCheckMigration: (handoff: ShaderHandoff) => void
}

export function ShaderLabTab({ state, onChange, referencePreset, onCheckMigration }: ShaderLabTabProps) {
  const lesson = shaderLessons.find((item) => item.id === state.activeLessonId) ?? shaderLessons[0]
  const draft = state.drafts[lesson.id]
  const pendingRunRevision = useRef<number | null>(null)
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([])

  const changeDraft = (patch: Parameters<typeof updateLessonDraft>[2]) => {
    onChange(updateLessonDraft(state, lesson.id, patch))
  }

  const handleCompile = useCallback((result: ShaderCompileResult) => {
    if (!result.ok) {
      setDiagnostics(result.diagnostics)
      pendingRunRevision.current = null
      return
    }
    setDiagnostics([])
    if (pendingRunRevision.current !== draft.compileRevision) return
    pendingRunRevision.current = null
    onChange(updateLessonDraft(state, lesson.id, {
      lastSuccessfulSource: draft.source,
      explanationRevealed: true,
    }))
  }, [draft.compileRevision, draft.source, lesson.id, onChange, state])

  return (
    <div className="shader-lab-grid">
      <aside className="shader-panel shader-lesson-rail" aria-label="五步 Shader 实验">
        <p className="shader-kicker">B · 引导实验室</p>
        <h2>从一个像素学到完整接入</h2>
        {shaderLessons.map((item) => (
          <button
            key={item.id}
            aria-pressed={item.id === lesson.id}
            aria-label={`实验 ${item.number}：${item.title}`}
            onClick={() => onChange({ ...state, activeLessonId: item.id })}
          >
            <span>{String(item.number).padStart(2, '0')}</span>
            {item.title}
          </button>
        ))}
        {referencePreset ? (
          <div className="shader-reference-card">
            <small>来自作品展厅</small>
            <strong>{referencePreset.title}</strong>
            <p>把它当成最终案例，对照前四节逐层拆解。</p>
          </div>
        ) : null}
      </aside>

      <section className="shader-panel shader-lab-workspace">
        <header className="shader-section-heading">
          <div>
            <p>实验 {lesson.number} · {lesson.concept}</p>
            <h2>{lesson.title}</h2>
          </div>
          <span className="shader-status" data-level={diagnostics.length ? 'error' : state.playing ? 'running' : 'warning'}>
            {diagnostics.length ? '等待修正' : state.playing ? '逐帧运行' : '单帧预览'}
          </span>
        </header>
        <p>{lesson.summary}</p>

        <div className="shader-stage" data-container="card">
          <ShaderCanvas
            request={{ source: draft.source, profile: 'webgl1', revision: draft.compileRevision }}
            uniforms={lessonUniformBindings(draft)}
            playing={state.playing}
            quality={state.quality}
            initialElapsed={draft.elapsed}
            ariaLabel={`${lesson.title} 实验画布`}
            onCompileResult={handleCompile}
            onElapsedChange={(elapsed) => changeDraft({ elapsed })}
          />
        </div>

        <fieldset className="shader-prediction">
          <legend>{lesson.predictionQuestion}</legend>
          {lesson.predictionOptions.map((option) => (
            <label key={option.id}>
              <input
                type="radio"
                name={`prediction-${lesson.id}`}
                checked={draft.predictionId === option.id}
                onChange={() => changeDraft({ predictionId: option.id })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {draft.explanationRevealed ? (
          <div className="shader-explanation" aria-live="polite">
            <h3>运行结果解释</h3>
            <p>{lesson.explanation}</p>
            <p>{draft.predictionId === lesson.correctPredictionId ? '你的预测与运行结果一致。' : '对照画面和公式，再修改一个值试试。'}</p>
          </div>
        ) : null}

        {diagnostics.length ? (
          <div aria-live="polite">
            {diagnostics.map((item, index) => (
              <p className="shader-issue" data-level="blocker" key={`${item.raw}-${index}`}>
                {item.line ? `第 ${item.line} 行：` : ''}{item.message}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <aside className="shader-panel shader-side-panel shader-lab-editor">
        <label htmlFor="shader-lab-source">GLSL mainImage 源码</label>
        <textarea
          id="shader-lab-source"
          className="shader-code-input"
          value={draft.source}
          spellCheck={false}
          onChange={(event) => changeDraft({ source: event.target.value, explanationRevealed: false })}
        />
        <div className="shader-button-row">
          <button onClick={() => {
            const revision = draft.compileRevision + 1
            pendingRunRevision.current = revision
            changeDraft({ compileRevision: revision })
          }}>运行代码</button>
          <button onClick={() => {
            pendingRunRevision.current = null
            setDiagnostics([])
            changeDraft({
              source: lesson.source,
              lastSuccessfulSource: lesson.source,
              compileRevision: draft.compileRevision + 1,
              explanationRevealed: false,
            })
          }}>恢复本节源码</button>
        </div>

        <div className="shader-control-list">
          <label>动画速度
            <input type="range" min="0" max="3" step="0.05" value={draft.uniforms.uSpeed} onChange={(event) => changeDraft({ uniforms: { ...draft.uniforms, uSpeed: Number(event.target.value) } })} />
          </label>
          <label>图形尺度
            <input type="range" min="0.5" max="8" step="0.1" value={draft.uniforms.uScale} onChange={(event) => changeDraft({ uniforms: { ...draft.uniforms, uScale: Number(event.target.value) } })} />
          </label>
          <label>发光强度
            <input type="range" min="0" max="2.5" step="0.05" value={draft.uniforms.uIntensity} onChange={(event) => changeDraft({ uniforms: { ...draft.uniforms, uIntensity: Number(event.target.value) } })} />
          </label>
        </div>

        <div className="shader-button-row">
          <button onClick={() => onChange({ ...state, playing: !state.playing })}>{state.playing ? '暂停动画' : '继续动画'}</button>
          {([0.5, 0.75, 1] as const).map((quality) => (
            <button aria-pressed={state.quality === quality} key={quality} onClick={() => onChange({ ...state, quality })}>{quality}×</button>
          ))}
        </div>

        <section className="shader-host-bridge">
          <h3>从 Shadertoy 到 React，宿主补上什么？</h3>
          <ol>
            <li>React 创建 canvas/context</li>
            <li>编译并 link 顶点与片元 Shader</li>
            <li>响应尺寸变化，更新 iResolution</li>
            <li>逐帧更新 time、mouse 与 custom uniforms</li>
            <li>卸载时取消 RAF 并删除 GPU resources</li>
          </ol>
          <button onClick={() => onCheckMigration(labHandoff(state))}>把本节带到迁移工作台</button>
        </section>
      </aside>
    </div>
  )
}

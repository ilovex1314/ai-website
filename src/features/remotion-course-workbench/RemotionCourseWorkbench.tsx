import { useMemo, useReducer, useState } from 'react'
import { CodexHandoffPanel } from './CodexHandoffPanel'
import { CourseActionEditor } from './CourseActionEditor'
import { CourseAnimationLibraryPanel } from './CourseAnimationLibraryPanel'
import { CourseProjectIntake, type IntakeState } from './CourseProjectIntake'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import {
  buildCapCutHandoffPackage,
  buildCourseAssemblyManifest,
  courseWorkbenchReducer,
} from './courseWorkbenchReducer'
import { CourseExportPanel } from './CourseExportPanel'
import { buildCompositionProject, CoursePreviewStage } from './CoursePreviewStage'
import { CourseTimelinePanel } from './CourseTimelinePanel'
import { PointingArrowEditor } from './PointingArrowEditor'
import { absoluteActionRange, relativeFrameForSegment } from './domain/animationTiming'
import { WorkbenchClient } from './api/workbenchClient'
import type { AnimationAction, AnimationActionRef, TimelineSegment } from './workbenchTypes'
import './RemotionCourseWorkbench.css'

const shouldAutoImportLocalProject = import.meta.env.DEV && import.meta.env.MODE !== 'test'

type ElementActionRefEntry = {
  segment: TimelineSegment
  ref: AnimationActionRef
}

function actionParamLabel(action?: AnimationAction) {
  return action?.params.label ?? action?.params.text ?? action?.params.title ?? ''
}

function bindingFrameRange(segment: TimelineSegment, ref: AnimationActionRef) {
  const range = absoluteActionRange(segment, ref)
  return `${range.fromFrame}f - ${range.toFrame}f`
}

export function RemotionCourseWorkbench() {
  const [state, dispatch] = useReducer(courseWorkbenchReducer, undefined, createDefaultCourseWorkbenchState)
  const workbenchClient = useMemo(() => new WorkbenchClient(), [])
  const [intakeState, setIntakeState] = useState<IntakeState>(
    shouldAutoImportLocalProject ? 'scanning' : 'idle',
  )
  const [overrideStatus, setOverrideStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle')
  const [overrideError, setOverrideError] = useState<string>()
  const [bindingDraft, setBindingDraft] = useState<{
    elementId?: string
    from?: number
    duration?: number
    fadeInFrames?: number
    fadeOutFrames?: number
  }>({})
  const selectedAction = useMemo(
    () => state.actions.find((action) => action.id === state.selectedActionId) ?? state.actions[0],
    [state.actions, state.selectedActionId],
  )
  const selectedSegment = useMemo(
    () => state.timeline.find((segment) => segment.id === state.selectedSegmentId) ?? state.timeline[0],
    [state.selectedSegmentId, state.timeline],
  )
  const selectedElement = useMemo(
    () => state.stage.elements.find((element) => element.id === state.selectedElementId),
    [state.selectedElementId, state.stage.elements],
  )
  const elementActionRefs = useMemo<ElementActionRefEntry[]>(
    () =>
      selectedElement
        ? state.timeline.flatMap((segment) =>
            segment.actionRefs
              .filter((ref) => ref.elementId === selectedElement.id)
              .map((ref) => ({ segment, ref })),
          )
        : [],
    [selectedElement, state.timeline],
  )
  const elementHyperframesAnimations = useMemo(
    () => selectedElement
      ? state.detectedHyperframesAnimations.filter((animation) => animation.elementId === selectedElement.id)
      : [],
    [selectedElement, state.detectedHyperframesAnimations],
  )
  const selectedActionRefEntry = useMemo(
    () =>
      elementActionRefs.find((entry) => entry.ref.id === state.selectedActionRefId)
      ?? elementActionRefs[0],
    [elementActionRefs, state.selectedActionRefId],
  )
  const selectedRefAction = useMemo(
    () =>
      state.actions.find((action) => action.id === selectedActionRefEntry?.ref.actionId)
      ?? selectedAction,
    [selectedAction, selectedActionRefEntry?.ref.actionId, state.actions],
  )
  const selectedRefActionWithInstanceParams = useMemo(
    () => ({
      ...selectedRefAction,
      params: { ...selectedRefAction.params, ...selectedActionRefEntry?.ref.params },
    }),
    [selectedActionRefEntry?.ref.params, selectedRefAction],
  )
  const selectedRefLabel = actionParamLabel(selectedRefActionWithInstanceParams)
  const elementBindingDraft = bindingDraft.elementId === selectedElement?.id ? bindingDraft : {}
  const defaultBindingFrom = state.playback.currentFrame
  const defaultBindingDuration = selectedAction.defaultDurationFrames
  const latestRequest = state.handoffRequests[0]
  const assemblyManifest = useMemo(() => buildCourseAssemblyManifest(state), [state])
  const capcutPackage = useMemo(() => buildCapCutHandoffPackage(state), [state])
  const hasCurrentProjectStructure = !shouldAutoImportLocalProject || intakeState === 'ready'
  const renderProject = useMemo(
    () => buildCompositionProject(
      state.stage,
      state.timeline,
      state.actions,
      state.project.fps,
      state.playback.totalFrames,
    ),
    [state.actions, state.playback.totalFrames, state.project.fps, state.stage, state.timeline],
  )

  return (
    <main className="course-workbench">
      <header className="course-workbench__topbar">
        <a className="course-workbench__back" href="/">
          返回目录
        </a>
        <div className="course-workbench__brand">
          <span className="course-workbench__mark" aria-hidden="true" />
          <div>
            <p>Remotion Course Workbench</p>
            <h1>Studio Console</h1>
          </div>
        </div>
        <div className="course-workbench__toolbar" aria-label="课程项目概览">
          <span>{state.project.title}</span>
          <span>{state.project.aspectRatio}</span>
          <span>{state.project.fps}fps</span>
          <span>{state.project.localBridgeMode}</span>
        </div>
      </header>

      <section className="course-workbench__layout" aria-label="课程动画制作台工作区">
        <aside className="course-workbench__sidebar">
          <CourseProjectIntake
            projectPath={state.stage.backgroundSource.projectPath}
            durationLabel={`${Math.round(state.playback.totalFrames / state.project.fps)}s · ${state.playback.totalFrames}f`}
            foregroundName={state.stage.foregroundSource.name}
            foregroundPath={state.stage.foregroundSource.path}
            backgroundAudioPolicy={state.stage.backgroundSource.audioPolicy}
            foregroundAudioPolicy={state.stage.foregroundSource.audioPolicy}
            autoImport={shouldAutoImportLocalProject}
            structure={{
              scenes: state.stage.backgroundSource.structureStatus.scenesParsed,
              elements: state.stage.backgroundSource.structureStatus.elementsParsed,
              animations: state.stage.backgroundSource.structureStatus.animationsDetected,
              missingActions: state.stage.backgroundSource.structureStatus.missingActionsCreated,
            }}
            onReady={(result) => dispatch({ type: 'hydrate-hyperframes-import', payload: result })}
            onStateChange={setIntakeState}
            onForegroundReady={(result, file) => dispatch({
              type: 'hydrate-foreground-upload',
              payload: {
                name: file.name,
                relativePath: result.foreground.relativePath,
                mediaUrl: result.source.mediaUrl,
                durationFrames: result.source.durationFrames,
              },
            })}
          />
          {hasCurrentProjectStructure ? (
            <CourseTimelinePanel
              timeline={state.timeline}
              actions={state.actions}
              selectedSegmentId={state.selectedSegmentId}
              dispatch={dispatch}
            />
          ) : (
            <section className="course-card" data-testid="course-structure-loading">
              <div className="course-card__header">
                <p>Timeline</p>
                <span>loading</span>
              </div>
              <h2>正在载入结构化项目</h2>
              <p>读取场景、元素位置和 HyperFrames 内置动画…</p>
            </section>
          )}
        </aside>
        <section className="course-workbench__main-stage">
          {hasCurrentProjectStructure ? (
            <CoursePreviewStage
              action={selectedAction}
              segment={selectedSegment}
              stage={state.stage}
              playback={state.playback}
              timeline={state.timeline}
              actions={state.actions}
              selectedElementId={state.selectedElementId}
              fps={state.project.fps}
              dispatch={dispatch}
            />
          ) : (
            <section className="course-card course-preview-loading" data-testid="course-preview-loading">
              <div className="course-card__header">
                <p>Review Stage</p>
                <span>manifest-first</span>
              </div>
              <h2>正在准备 Review 画布</h2>
              <p>导入完成后再展示元素框，避免旧 mock 位置覆盖新视频。</p>
            </section>
          )}
          <CourseAnimationLibraryPanel
            actions={state.actions}
            selectedActionId={state.selectedActionId}
            categoryFilter={state.categoryFilter}
            dispatch={dispatch}
          />
        </section>
        <aside className="course-workbench__inspector">
          <section className="course-card course-card--element-inspector" data-testid="element-inspector">
            <div className="course-card__header">
              <p>Element</p>
              <span>{selectedElement?.kind ?? 'none'}</span>
            </div>
            <h2>Element Inspector</h2>
            {selectedElement ? (
              <div className="element-inspector-body">
                <div className="element-inspector-body__summary">
                  <strong>已选元素：{selectedElement.label}</strong>
                  <span>selector: {selectedElement.selector}</span>
                  <span>compositionId: {selectedElement.compositionId}</span>
                </div>
                <section className="element-hyperframes-animations" data-testid="hyperframes-element-animations">
                  <div className="element-binding-panel__title">
                    <strong>HyperFrames 内置动画</strong>
                    <span>{elementHyperframesAnimations.length} 个</span>
                  </div>
                  <div className="element-hyperframes-override-actions">
                    <button
                      className="course-button course-button--primary"
                      type="button"
                      disabled={
                        Object.keys(state.hyperframesAnimationOverrides).length === 0
                        || overrideStatus === 'rendering'
                      }
                      onClick={async () => {
                        setOverrideStatus('rendering')
                        setOverrideError(undefined)
                        try {
                          const result = await workbenchClient.saveHyperframesOverrides(state.project.id, {
                            sourcePath: state.stage.backgroundSource.projectPath,
                            fps: state.project.fps,
                            overrides: Object.values(state.hyperframesAnimationOverrides),
                            renderPreview: true,
                          })
                          if (result.mediaUrl) {
                            dispatch({ type: 'set-background-preview', mediaUrl: result.mediaUrl })
                          }
                          setOverrideStatus('ready')
                        } catch (error) {
                          setOverrideStatus('error')
                          setOverrideError(error instanceof Error ? error.message : '后台预览重建失败')
                        }
                      }}
                    >
                      {overrideStatus === 'rendering' ? '正在重建后台…' : '应用修改并重建后台'}
                    </button>
                    {overrideStatus === 'ready' ? <span>后台预览已更新</span> : null}
                    {overrideError ? <span className="element-animation-conflict">{overrideError}</span> : null}
                  </div>
                  {elementHyperframesAnimations.length > 0 ? (
                    <div className="element-binding-list">
                      {elementHyperframesAnimations.map((animation) => {
                        const override = state.hyperframesAnimationOverrides[animation.id]
                        const disabled = override?.operation === 'disable'
                        const modified = override?.operation === 'modify'
                        const fromFrame = modified ? override.fromFrame ?? animation.from : animation.from
                        const durationFrames = modified
                          ? override.durationFrames ?? animation.duration
                          : animation.duration
                        const ease = modified ? override.ease ?? animation.ease ?? '' : animation.ease ?? ''

                        return (
                          <div
                            className={`element-binding-item element-binding-item--hyperframes${disabled ? ' is-disabled' : ''}`}
                            data-animation-id={animation.id}
                            key={animation.id}
                          >
                            <strong>{animation.label}</strong>
                            <span>{animation.actionSignature} · {fromFrame}f - {fromFrame + durationFrames}f</span>
                            <small>{animation.properties.join(' / ')} · {ease || 'default ease'}</small>
                            <span className="element-animation-status">
                              {disabled ? '已停用' : modified ? '已修改' : '原始'}
                            </span>
                            {disabled ? (
                              <button
                                className="course-button"
                                type="button"
                                aria-label="恢复原始动画"
                                onClick={() => dispatch({ type: 'restore-hyperframes-animation', id: animation.id })}
                              >
                                恢复原始
                              </button>
                            ) : (
                              <>
                                <div className="editor-grid element-hyperframes-animation-editor">
                                  <label>
                                    起点
                                    <input
                                      type="number"
                                      value={fromFrame}
                                      onChange={(event) => dispatch({
                                        type: 'modify-hyperframes-animation',
                                        id: animation.id,
                                        patch: {
                                          fromFrame: Number(event.target.value),
                                          durationFrames,
                                          ease,
                                        },
                                      })}
                                    />
                                  </label>
                                  <label>
                                    时长
                                    <input
                                      type="number"
                                      value={durationFrames}
                                      onChange={(event) => dispatch({
                                        type: 'modify-hyperframes-animation',
                                        id: animation.id,
                                        patch: {
                                          fromFrame,
                                          durationFrames: Number(event.target.value),
                                          ease,
                                        },
                                      })}
                                    />
                                  </label>
                                  <label className="editor-grid__wide">
                                    缓动
                                    <input
                                      type="text"
                                      value={ease}
                                      onChange={(event) => dispatch({
                                        type: 'modify-hyperframes-animation',
                                        id: animation.id,
                                        patch: { fromFrame, durationFrames, ease: event.target.value },
                                      })}
                                    />
                                  </label>
                                </div>
                                <div className="element-binding-actions">
                                  {modified ? (
                                    <button
                                      className="course-button"
                                      type="button"
                                      aria-label="恢复原始动画"
                                      onClick={() => dispatch({ type: 'restore-hyperframes-animation', id: animation.id })}
                                    >
                                      恢复原始
                                    </button>
                                  ) : null}
                                  <button
                                    className="course-button course-button--danger"
                                    type="button"
                                    aria-label="停用 HyperFrames 动画"
                                    onClick={() => dispatch({ type: 'disable-hyperframes-animation', id: animation.id })}
                                  >
                                    停用动画
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="preview-hint">该元素没有可归属的 HyperFrames 动画。</p>
                  )}
                </section>
                <div className="element-binding-panel" data-testid="dom-animation-binding-panel">
                  <div className="element-binding-panel__title">
                    <strong>平台新增动画</strong>
                    <span>{elementActionRefs.length > 0 ? '已绑定动画' : '尚未绑定动画'}</span>
                  </div>
                  <p className="preview-hint">这里管理平台覆盖动画；HyperFrames 内置动画已烘焙在后台视频中。</p>
                  {state.animationConflict ? (
                    <p className="element-animation-conflict" role="alert">{state.animationConflict}</p>
                  ) : null}
                  {elementActionRefs.length > 0 ? (
                    <div className="element-binding-list" data-testid="element-binding-list">
                      {elementActionRefs.map(({ segment, ref }) => {
                        const refAction = state.actions.find((action) => action.id === ref.actionId)
                        return (
                          <button
                            className="element-binding-item"
                            key={ref.id ?? `${segment.id}-${ref.actionId}-${ref.from}`}
                            type="button"
                            aria-pressed={ref.id === selectedActionRefEntry?.ref.id}
                            onClick={() => ref.id && dispatch({ type: 'select-action-ref', id: ref.id })}
                          >
                            <strong>{ref.actionId}</strong>
                            <span>{refAction?.name ?? ref.actionId}</span>
                            <span>
                              {bindingFrameRange(segment, ref)} · {ref.duration}f
                            </span>
                            <small>
                              平台覆盖动画 · color {refAction?.params.color ?? 'n/a'} · label{' '}
                              {actionParamLabel(refAction) || 'n/a'} · fadeIn {ref.fadeInFrames ?? 0}f ·
                              fadeOut {ref.fadeOutFrames ?? 0}f
                            </small>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="preview-hint">尚未绑定动画。选择动作后可写入当前 DOM 的 timeline actionRef。</p>
                  )}
                  <div className="editor-grid element-binding-editor">
                    <label>
                      绑定动作
                      <select
                        value={selectedActionRefEntry?.ref.actionId ?? state.selectedActionId}
                        onChange={(event) => {
                          const nextActionId = event.target.value
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({
                              type: 'update-selected-action-ref',
                              patch: { actionId: nextActionId },
                            })
                          } else {
                            dispatch({ type: 'select-action', id: nextActionId })
                          }
                        }}
                      >
                        {state.actions.map((action) => (
                          <option key={action.id} value={action.id}>
                            {action.id} · {action.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      绑定起点
                      <input
                        type="number"
                        value={
                          selectedActionRefEntry
                            ? absoluteActionRange(selectedActionRefEntry.segment, selectedActionRefEntry.ref).fromFrame
                            : elementBindingDraft.from ?? defaultBindingFrom
                        }
                        onChange={(event) => {
                          const from = Number(event.target.value)
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({
                              type: 'update-selected-action-ref',
                              patch: { from: relativeFrameForSegment(selectedActionRefEntry.segment, from) },
                            })
                          } else {
                            setBindingDraft((current) => ({ ...current, elementId: selectedElement?.id, from }))
                          }
                        }}
                      />
                    </label>
                    <label>
                      绑定时长
                      <input
                        type="number"
                        value={
                          selectedActionRefEntry?.ref.duration
                          ?? elementBindingDraft.duration
                          ?? defaultBindingDuration
                        }
                        onChange={(event) => {
                          const duration = Number(event.target.value)
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({ type: 'update-selected-action-ref', patch: { duration } })
                          } else {
                            setBindingDraft((current) => ({ ...current, elementId: selectedElement?.id, duration }))
                          }
                        }}
                      />
                    </label>
                    <label>
                      淡入帧
                      <input
                        type="number"
                        value={selectedActionRefEntry?.ref.fadeInFrames ?? elementBindingDraft.fadeInFrames ?? 0}
                        onChange={(event) => {
                          const fadeInFrames = Number(event.target.value)
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({ type: 'update-selected-action-ref', patch: { fadeInFrames } })
                          } else {
                            setBindingDraft((current) => ({ ...current, elementId: selectedElement?.id, fadeInFrames }))
                          }
                        }}
                      />
                    </label>
                    <label>
                      淡出帧
                      <input
                        type="number"
                        value={selectedActionRefEntry?.ref.fadeOutFrames ?? elementBindingDraft.fadeOutFrames ?? 0}
                        onChange={(event) => {
                          const fadeOutFrames = Number(event.target.value)
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({ type: 'update-selected-action-ref', patch: { fadeOutFrames } })
                          } else {
                            setBindingDraft((current) => ({ ...current, elementId: selectedElement?.id, fadeOutFrames }))
                          }
                        }}
                      />
                    </label>
                    <label>
                      绑定颜色
                      <input
                        type="color"
                        value={selectedRefActionWithInstanceParams.params.color ?? '#2563eb'}
                        onChange={(event) => {
                          const color = event.target.value
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({
                              type: 'update-selected-action-ref',
                              patch: { params: { ...selectedActionRefEntry.ref.params, color } },
                            })
                          } else {
                            dispatch({ type: 'update-action', id: selectedRefAction.id, patch: { params: { color } } })
                          }
                        }}
                      />
                    </label>
                    <label className="editor-grid__wide">
                      绑定标签
                      <input
                        type="text"
                        value={selectedRefLabel}
                        onChange={(event) => {
                          const label = event.target.value
                          if (selectedActionRefEntry?.ref.id) {
                            dispatch({
                              type: 'update-selected-action-ref',
                              patch: { params: { ...selectedActionRefEntry.ref.params, label } },
                            })
                          } else {
                            dispatch({ type: 'update-action', id: selectedRefAction.id, patch: { params: { label } } })
                          }
                        }}
                      />
                    </label>
                  </div>
                  <PointingArrowEditor
                    action={selectedRefActionWithInstanceParams}
                    onChange={(params) => {
                      if (selectedActionRefEntry?.ref.id) {
                        dispatch({
                          type: 'update-selected-action-ref',
                          patch: { params: { ...selectedActionRefEntry.ref.params, ...params } },
                        })
                      } else {
                        dispatch({ type: 'update-action', id: selectedRefAction.id, patch: { params } })
                      }
                    }}
                  />
                  <div className="element-binding-actions">
                    <button
                      className="course-button"
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'start-new-element-binding' })
                        setBindingDraft({ elementId: selectedElement.id, from: state.playback.currentFrame })
                      }}
                    >
                      新增平台动画
                    </button>
                    <button
                      className="course-button course-button--primary"
                      type="button"
                      onClick={() => dispatch({
                        type: 'bind-selected-action-to-element',
                        from: relativeFrameForSegment(
                          selectedSegment,
                          elementBindingDraft.from ?? defaultBindingFrom,
                        ),
                        duration: elementBindingDraft.duration ?? defaultBindingDuration,
                        fadeInFrames: elementBindingDraft.fadeInFrames ?? 0,
                        fadeOutFrames: elementBindingDraft.fadeOutFrames ?? 0,
                      })}
                    >
                      绑定动作到元素
                    </button>
                    <button
                      className="course-button course-button--danger"
                      type="button"
                      disabled={!selectedActionRefEntry?.ref.id}
                      onClick={() => dispatch({ type: 'remove-selected-action-ref' })}
                    >
                      移除绑定
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="preview-hint">选择 Review 画布中的 HyperFrames 元素后，可绑定当前动作。</p>
            )}
          </section>
          <section className="course-card course-card--foreground-window course-card--foreground-window-compact">
            <div className="course-card__header">
              <p>Foreground</p>
              <span>{state.stage.foregroundWindow.shape}</span>
            </div>
            <h2>前台窗口</h2>
            <div className="editor-grid">
              <label>
                前台 X
                <input
                  type="number"
                  value={state.stage.foregroundWindow.x}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: { x: Number(event.target.value) },
                    })
                  }
                />
              </label>
              <label>
                前台 Y
                <input
                  type="number"
                  value={state.stage.foregroundWindow.y}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: { y: Number(event.target.value) },
                    })
                  }
                />
              </label>
              <label>
                前台宽度
                <input
                  type="number"
                  value={state.stage.foregroundWindow.width}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: { width: Number(event.target.value) },
                    })
                  }
                />
              </label>
              <label>
                前台高度
                <input
                  type="number"
                  value={state.stage.foregroundWindow.height}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: { height: Number(event.target.value) },
                    })
                  }
                />
              </label>
              <label>
                前台形状
                <select
                  value={state.stage.foregroundWindow.shape}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: {
                        shape: event.target.value as typeof state.stage.foregroundWindow.shape,
                      },
                    })
                  }
                >
                  <option value="rounded">rounded</option>
                  <option value="circle">circle</option>
                  <option value="portrait">portrait</option>
                  <option value="rect">rect</option>
                </select>
              </label>
              <label>
                前台透明度
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={state.stage.foregroundWindow.opacity}
                  onChange={(event) =>
                    dispatch({
                      type: 'set-foreground-window',
                      patch: { opacity: Number(event.target.value) },
                    })
                  }
                />
              </label>
            </div>
          </section>
          <CourseActionEditor action={selectedAction} dispatch={dispatch} showPointingEditor={!selectedElement} />
          <CodexHandoffPanel reviewNote={state.reviewNote} latestRequest={latestRequest} dispatch={dispatch} />
        </aside>
      </section>

      <section className="course-workbench__exports" aria-label="课程工程和剪映交付包">
        <CourseExportPanel
          assemblyManifest={assemblyManifest}
          capcutPackage={capcutPackage}
          project={renderProject}
        />
      </section>
    </main>
  )
}

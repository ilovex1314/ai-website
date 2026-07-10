import { useMemo, useReducer } from 'react'
import { CodexHandoffPanel } from './CodexHandoffPanel'
import { CourseActionEditor } from './CourseActionEditor'
import { CourseAnimationLibraryPanel } from './CourseAnimationLibraryPanel'
import { CourseProjectIntake } from './CourseProjectIntake'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import {
  buildCapCutHandoffPackage,
  buildCourseAssemblyManifest,
  courseWorkbenchReducer,
} from './courseWorkbenchReducer'
import { CourseExportPanel } from './CourseExportPanel'
import { CoursePreviewStage } from './CoursePreviewStage'
import { CourseTimelinePanel } from './CourseTimelinePanel'
import type { AnimationAction, AnimationActionRef, TimelineSegment } from './workbenchTypes'
import './RemotionCourseWorkbench.css'

type ElementActionRefEntry = {
  segment: TimelineSegment
  ref: AnimationActionRef
}

function actionParamLabel(action?: AnimationAction) {
  return action?.params.label ?? action?.params.text ?? action?.params.title ?? ''
}

function bindingFrameRange(ref: AnimationActionRef) {
  return `${ref.from}f - ${ref.from + ref.duration}f`
}

export function RemotionCourseWorkbench() {
  const [state, dispatch] = useReducer(courseWorkbenchReducer, undefined, createDefaultCourseWorkbenchState)
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
  const selectedRefLabel = actionParamLabel(selectedRefAction)
  const latestRequest = state.handoffRequests[0]
  const assemblyManifest = useMemo(() => buildCourseAssemblyManifest(state), [state])
  const capcutPackage = useMemo(() => buildCapCutHandoffPackage(state), [state])

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
            structure={{
              scenes: state.stage.backgroundSource.structureStatus.scenesParsed,
              elements: state.stage.backgroundSource.structureStatus.elementsParsed,
              animations: state.stage.backgroundSource.structureStatus.animationsDetected,
              missingActions: state.stage.backgroundSource.structureStatus.missingActionsCreated,
            }}
          />
          <CourseTimelinePanel
            timeline={state.timeline}
            actions={state.actions}
            selectedSegmentId={state.selectedSegmentId}
            dispatch={dispatch}
          />
        </aside>
        <section className="course-workbench__main-stage">
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
                <div className="element-binding-panel" data-testid="dom-animation-binding-panel">
                  <div className="element-binding-panel__title">
                    <strong>DOM 绑定动画</strong>
                    <span>{elementActionRefs.length > 0 ? '已绑定动画' : '尚未绑定动画'}</span>
                  </div>
                  <p className="preview-hint">这里管理平台覆盖动画；HyperFrames 内置动画已烘焙在后台视频中。</p>
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
                              {bindingFrameRange(ref)} · {ref.duration}f
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
                        value={selectedActionRefEntry?.ref.from ?? 0}
                        onChange={(event) =>
                          dispatch({
                            type: 'update-selected-action-ref',
                            patch: { from: Number(event.target.value) },
                          })
                        }
                      />
                    </label>
                    <label>
                      绑定时长
                      <input
                        type="number"
                        value={
                          selectedActionRefEntry?.ref.duration
                          ?? state.actions.find((action) => action.id === state.selectedActionId)
                            ?.defaultDurationFrames
                          ?? 90
                        }
                        onChange={(event) =>
                          dispatch({
                            type: 'update-selected-action-ref',
                            patch: { duration: Number(event.target.value) },
                          })
                        }
                      />
                    </label>
                    <label>
                      淡入帧
                      <input
                        type="number"
                        value={selectedActionRefEntry?.ref.fadeInFrames ?? 0}
                        onChange={(event) =>
                          dispatch({
                            type: 'update-selected-action-ref',
                            patch: { fadeInFrames: Number(event.target.value) },
                          })
                        }
                      />
                    </label>
                    <label>
                      淡出帧
                      <input
                        type="number"
                        value={selectedActionRefEntry?.ref.fadeOutFrames ?? 0}
                        onChange={(event) =>
                          dispatch({
                            type: 'update-selected-action-ref',
                            patch: { fadeOutFrames: Number(event.target.value) },
                          })
                        }
                      />
                    </label>
                    <label>
                      绑定颜色
                      <input
                        type="color"
                        value={selectedRefAction.params.color ?? '#2563eb'}
                        onChange={(event) =>
                          dispatch({
                            type: 'update-action',
                            id: selectedRefAction.id,
                            patch: { params: { color: event.target.value } },
                          })
                        }
                      />
                    </label>
                    <label className="editor-grid__wide">
                      绑定标签
                      <input
                        type="text"
                        value={selectedRefLabel}
                        onChange={(event) =>
                          dispatch({
                            type: 'update-action',
                            id: selectedRefAction.id,
                            patch: { params: { label: event.target.value } },
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="element-binding-actions">
                    <button
                      className="course-button course-button--primary"
                      type="button"
                      onClick={() => dispatch({ type: 'bind-selected-action-to-element' })}
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
          <CourseActionEditor action={selectedAction} dispatch={dispatch} />
          <CodexHandoffPanel reviewNote={state.reviewNote} latestRequest={latestRequest} dispatch={dispatch} />
        </aside>
      </section>

      <section className="course-workbench__exports" aria-label="课程工程和剪映交付包">
        <CourseExportPanel assemblyManifest={assemblyManifest} capcutPackage={capcutPackage} />
      </section>
    </main>
  )
}

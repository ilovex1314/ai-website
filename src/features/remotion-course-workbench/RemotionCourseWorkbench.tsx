import { useMemo, useReducer } from 'react'
import { CodexHandoffPanel } from './CodexHandoffPanel'
import { CourseActionEditor } from './CourseActionEditor'
import { CourseAnimationLibraryPanel } from './CourseAnimationLibraryPanel'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import {
  buildCapCutHandoffPackage,
  buildCourseProjectPackage,
  courseWorkbenchReducer,
} from './courseWorkbenchReducer'
import { CourseExportPanel } from './CourseExportPanel'
import { CoursePreviewStage } from './CoursePreviewStage'
import { CourseTimelinePanel } from './CourseTimelinePanel'
import './RemotionCourseWorkbench.css'

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
  const latestRequest = state.handoffRequests[0]
  const projectPackage = useMemo(() => buildCourseProjectPackage(state), [state])
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
          <section className="course-card course-card--assets">
            <div className="course-card__header">
              <p>Assets</p>
              <span>
                {state.assets.filter((asset) => asset.status === 'ready').length}/{state.assets.length} ready
              </span>
            </div>
            <h2>Assets</h2>
            <div className="asset-grid">
              {state.assets.map((asset) => (
                <div className="asset-pill" key={asset.id}>
                  <span>{asset.name}</span>
                  <small>{asset.status}</small>
                </div>
              ))}
            </div>
          </section>
          <CourseTimelinePanel
            timeline={state.timeline}
            actions={state.actions}
            selectedSegmentId={state.selectedSegmentId}
            dispatch={dispatch}
          />
        </aside>
        <section className="course-workbench__main-stage">
          <CourseAnimationLibraryPanel
            actions={state.actions}
            selectedActionId={state.selectedActionId}
            categoryFilter={state.categoryFilter}
            dispatch={dispatch}
          />
          <CoursePreviewStage action={selectedAction} segment={selectedSegment} dispatch={dispatch} />
        </section>
        <aside className="course-workbench__inspector">
          <CourseActionEditor action={selectedAction} dispatch={dispatch} />
          <CodexHandoffPanel reviewNote={state.reviewNote} latestRequest={latestRequest} dispatch={dispatch} />
        </aside>
      </section>

      <section className="course-workbench__exports" aria-label="课程工程和剪映交付包">
        <CourseExportPanel projectPackage={projectPackage} capcutPackage={capcutPackage} />
      </section>
    </main>
  )
}

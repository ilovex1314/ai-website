import { actionCategoryLabels } from './animationLibraryModel'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import './RemotionCourseWorkbench.css'

export function CourseActionLibraryStudio() {
  const state = createDefaultCourseWorkbenchState()
  const complexAction = state.actions.find((action) => action.implementation.mode === 'llm-assisted')

  return (
    <main className="course-workbench">
      <header className="course-workbench__topbar">
        <a className="course-workbench__back" href="/topics/remotion-course">
          返回制作台
        </a>
        <div className="course-workbench__brand">
          <span className="course-workbench__mark" aria-hidden="true" />
          <div>
            <p>Remotion Course Workbench</p>
            <h1>Action Library Studio</h1>
          </div>
        </div>
        <div className="course-workbench__toolbar" aria-label="动作库模式">
          <span>Parametric</span>
          <span>LLM-assisted</span>
          <span>Custom component</span>
        </div>
      </header>

      <section className="action-studio-layout" aria-label="动作库子页面">
        <section className="course-card action-studio-card">
          <div className="course-card__header">
            <p>Action Assets</p>
            <span>{state.actions.length} actions</span>
          </div>
          <h2>动作资产库</h2>
          <div className="action-table action-table--studio" role="table" aria-label="动作资产实现方式">
            <div className="action-table__row action-table__row--head" role="row">
              <span>Name</span>
              <span>Type</span>
              <span>Mode</span>
              <span>Version</span>
              <span>Intent</span>
            </div>
            {state.actions.map((action) => (
              <div className="action-card action-table__row" key={action.id} role="row">
                <span>{action.name}</span>
                <small>{actionCategoryLabels[action.category]}</small>
                <small>{action.implementation.mode}</small>
                <small>{action.version}</small>
                <em>{action.implementation.intent}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="course-card action-studio-card">
          <div className="course-card__header">
            <p>Complex Motion</p>
            <span>Codex contract</span>
          </div>
          <h2>复杂动画意图</h2>
          <p className="export-note">
            固定参数适合高亮、箭头、标题条这类稳定动作；复杂动画需要让 Codex 负责理解意图和生成实现，
            但生成结果必须回写动作库 schema、组件契约和导出计划。
          </p>
          <div className="implementation-panel">
            <strong>{complexAction?.name}</strong>
            <span>{complexAction?.implementation.mode}</span>
            <p>{complexAction?.implementation.intent}</p>
            <pre>{JSON.stringify(complexAction?.implementation, null, 2)}</pre>
          </div>
        </section>
      </section>
    </main>
  )
}

import type { CodexHandoffRequest, CourseWorkbenchAction } from './workbenchTypes'

type CodexHandoffPanelProps = {
  reviewNote: string
  latestRequest?: CodexHandoffRequest
  dispatch: React.Dispatch<CourseWorkbenchAction>
}

export function CodexHandoffPanel({ reviewNote, latestRequest, dispatch }: CodexHandoffPanelProps) {
  return (
    <section className="course-card course-card--handoff">
      <div className="course-card__header">
        <p>Local Codex Handoff</p>
        <span>handoff-only</span>
      </div>
      <h2>Local Codex</h2>
      <p className="handoff-boundary">
        公网部署只展示平台和数据，不调用本地服务。本地生产流读取项目工程文件，生成修改请求或交付打包请求。
      </p>
      <label>
        Review 意见
        <textarea
          value={reviewNote}
          onChange={(event) => dispatch({ type: 'set-review-note', note: event.target.value })}
          placeholder="描述你希望 Codex 如何修改当前动画..."
        />
      </label>
      <button
        className="course-button course-button--primary"
        type="button"
        onClick={() => dispatch({ type: 'generate-handoff' })}
      >
        生成 Codex 修改请求
      </button>
      <pre data-testid="codex-handoff-output">
        {latestRequest
          ? JSON.stringify(latestRequest, null, 2)
          : '尚未生成请求。选择动作、写下 review 意见后生成 handoff payload。'}
      </pre>
    </section>
  )
}

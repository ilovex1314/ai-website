import { actionCategoryLabels } from './animationLibraryModel'
import type {
  AnimationAction,
  AnimationActionCategory,
  CourseWorkbenchAction,
  CourseWorkbenchState,
} from './workbenchTypes'

const categoryFilters: Array<{ category: CourseWorkbenchState['categoryFilter']; label: string }> = [
  { category: 'all', label: '全部' },
  { category: 'highlight', label: '高亮框' },
  { category: 'arrow', label: '箭头' },
  { category: 'circle', label: '圈注' },
  { category: 'text-card', label: '文字卡' },
  { category: 'lower-third', label: '标题条' },
  { category: 'zoom', label: '聚焦' },
  { category: 'progress', label: '进度' },
  { category: 'step-reveal', label: '步骤' },
  { category: 'cursor', label: '光标' },
  { category: 'code', label: '代码' },
  { category: 'comparison', label: '对比' },
  { category: 'spotlight', label: '遮罩' },
  { category: 'transition', label: '转场' },
]

type CourseAnimationLibraryPanelProps = {
  actions: AnimationAction[]
  selectedActionId: string
  categoryFilter: CourseWorkbenchState['categoryFilter']
  dispatch: React.Dispatch<CourseWorkbenchAction>
}

export function CourseAnimationLibraryPanel({
  actions,
  selectedActionId,
  categoryFilter,
  dispatch,
}: CourseAnimationLibraryPanelProps) {
  const visibleActions =
    categoryFilter === 'all'
      ? actions
      : actions.filter((action) => action.category === categoryFilter)
  const createCategory: AnimationActionCategory =
    categoryFilter === 'all' ? 'highlight' : categoryFilter

  return (
    <section className="course-card course-card--library">
      <div className="course-card__header">
        <p>Action Library</p>
        <span>{visibleActions.length} actions</span>
      </div>
      <h2>Action Library Manager</h2>
      <a className="course-link-button" href="/topics/remotion-course/actions">
        打开动作库子页面
      </a>
      <div className="category-tabs" aria-label="动作分类">
        {categoryFilters.map((filter) => (
          <button
            key={filter.category}
            type="button"
            aria-pressed={filter.category === categoryFilter}
            onClick={() => dispatch({ type: 'set-category-filter', category: filter.category })}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <button
        className="course-button course-button--primary"
        type="button"
        onClick={() => dispatch({ type: 'create-action', category: createCategory })}
      >
        新增动作
      </button>
      <div className="action-table" role="table" aria-label="动画动作资产表">
        <div className="action-table__row action-table__row--head" role="row">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Version</span>
          <span>Usage</span>
        </div>
        {visibleActions.map((action) => (
          <button
            className="action-card action-table__row"
            key={action.id}
            type="button"
            aria-pressed={action.id === selectedActionId}
            onClick={() => dispatch({ type: 'select-action', id: action.id })}
          >
            <span>{action.name}</span>
            <small>{actionCategoryLabels[action.category]}</small>
            <small>{action.status}</small>
            <small>{action.version}</small>
            <em>
              {action.source === 'hyperframes'
                ? `source: hyperframes · ${action.selector} · ${action.actionSignature}`
                : action.description}
            </em>
          </button>
        ))}
      </div>
    </section>
  )
}

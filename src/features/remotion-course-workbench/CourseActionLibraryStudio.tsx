import { useState } from 'react'
import { actionCategoryLabels } from './animationLibraryModel'
import { CourseActionLiveDemo } from './CourseActionLiveDemo'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import type { AnimationActionCategory } from './workbenchTypes'
import './RemotionCourseWorkbench.css'

const assetKindLabels = {
  'animate-existing-element': '添加动画',
  'add-element-with-animation': '添加元素 + 动画',
} as const

export function CourseActionLibraryStudio() {
  const [actions, setActions] = useState(() => createDefaultCourseWorkbenchState().actions)
  const [selectedActionId, setSelectedActionId] = useState(actions[0]?.id)
  const [assetFilter, setAssetFilter] = useState<'all' | keyof typeof assetKindLabels>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | AnimationActionCategory>('all')
  const selectedAction = actions.find((action) => action.id === selectedActionId) ?? actions[0]
  const filteredActions = actions.filter((action) =>
    (assetFilter === 'all' || action.assetKind === assetFilter) &&
    (categoryFilter === 'all' || action.category === categoryFilter),
  )

  const selectAssetFilter = (filter: 'all' | keyof typeof assetKindLabels) => {
    setAssetFilter(filter)
    const firstVisible = filter === 'all'
      ? actions[0]
      : actions.find((action) => action.assetKind === filter)
    if (firstVisible) setSelectedActionId(firstVisible.id)
  }

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
        <div className="course-workbench__toolbar" aria-label="动作库概览">
          <span>{actions.length} 个动作资产</span>
          <span>2 种资产类型</span>
        </div>
      </header>

      <section className="action-studio-layout" aria-label="动作库子页面">
        <section className="course-card action-studio-card">
          <div className="course-card__header">
            <p>Action Assets</p>
            <span>{actions.length} actions</span>
          </div>
          <h2>动作资产库</h2>
          <div className="action-asset-filters" aria-label="资产类型筛选">
            <button type="button" aria-pressed={assetFilter === 'all'} onClick={() => selectAssetFilter('all')}>全部</button>
            <button type="button" aria-pressed={assetFilter === 'animate-existing-element'} onClick={() => selectAssetFilter('animate-existing-element')}>添加动画</button>
            <button type="button" aria-pressed={assetFilter === 'add-element-with-animation'} onClick={() => selectAssetFilter('add-element-with-animation')}>添加元素 + 动画</button>
            <label>
              动作分类
              <select
                aria-label="动作分类筛选"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as 'all' | AnimationActionCategory)}
              >
                <option value="all">全部分类</option>
                {(Object.entries(actionCategoryLabels) as Array<[AnimationActionCategory, string]>).map(([category, label]) => (
                  <option key={category} value={category}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="action-table action-table--studio" role="table" aria-label="动作资产实现方式">
            <div className="action-table__row action-table__row--head" role="row">
              <span>Name</span>
              <span>资产类型</span>
              <span>动作分类</span>
              <span>Version</span>
              <span>Intent</span>
            </div>
            {filteredActions.map((action) => (
              <button
                aria-pressed={selectedAction.id === action.id}
                className="action-card action-table__row action-studio-action-row"
                key={action.id}
                type="button"
                onClick={() => setSelectedActionId(action.id)}
              >
                <span>{action.name}</span>
                <small>{assetKindLabels[action.assetKind]}</small>
                <small>{actionCategoryLabels[action.category]}</small>
                <small>{action.version}</small>
                <em>{action.implementation.intent}</em>
              </button>
            ))}
          </div>
        </section>

        <CourseActionLiveDemo
          action={selectedAction}
          onActionChange={(params) => setActions((current) => current.map((action) =>
            action.id === selectedAction.id
              ? { ...action, params: { ...action.params, ...params } }
              : action,
          ))}
        />
      </section>
    </main>
  )
}

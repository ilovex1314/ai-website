import type { Dispatch } from 'react'
import type { ModelDocument, ModelerAction } from './modelerTypes'

type SavedModelPanelProps = {
  document: ModelDocument
  onSaveCurrent: () => void
  onAddToScene: (id: string) => void
  dispatch: Dispatch<ModelerAction>
}

export function SavedModelPanel({
  document,
  onSaveCurrent,
  onAddToScene,
  dispatch,
}: SavedModelPanelProps) {
  const saveLabel = document.editingSavedModelId ? '更新组合体' : '保存为组合体'

  return (
    <section className="panel-section saved-model-panel">
      <div className="section-title-row">
        <h2>组合体库</h2>
        <div className="asset-save-actions">
          <button type="button" onClick={() => dispatch({ type: 'reset-current-model' })}>
            新建组合体
          </button>
          <button type="button" onClick={onSaveCurrent}>
            {saveLabel}
          </button>
        </div>
      </div>
      {document.savedModels.length === 0 ? (
        <p className="muted-copy">先保存上方画布，生成区才会把它当作完整模型来阵列、环绕或堆叠。</p>
      ) : (
        <div className="saved-model-list" role="list">
          {document.savedModels.map((model) => (
            <article
              aria-label={`组合体 ${model.name}，${model.parts.length} 个零件`}
              className={document.editingSavedModelId === model.id ? 'saved-model-item is-active' : 'saved-model-item'}
              key={model.id}
              role="listitem"
            >
              <div>
                <span>{model.name}</span>
                <small>{model.parts.length} 个零件</small>
              </div>
              <div className="saved-model-actions">
                <button type="button" onClick={() => onAddToScene(model.id)}>
                  加入场景
                </button>
                <button type="button" onClick={() => dispatch({ type: 'load-saved-model', id: model.id })}>
                  编辑
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

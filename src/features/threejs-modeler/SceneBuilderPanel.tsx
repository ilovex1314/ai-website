import type { Dispatch } from 'react'
import type { ModelDocument, ModelerAction, PrimitiveKind } from './modelerTypes'

type SceneBuilderPanelProps = {
  document: ModelDocument
  onSaveCurrentScene: () => void
  dispatch: Dispatch<ModelerAction>
}

const primitives: Array<{ primitive: PrimitiveKind; label: string }> = [
  { primitive: 'box', label: '立方体' },
  { primitive: 'sphere', label: '球体' },
  { primitive: 'cylinder', label: '圆柱' },
  { primitive: 'cone', label: '圆锥' },
  { primitive: 'plane', label: '平面' },
]

export function SceneBuilderPanel({ document, onSaveCurrentScene, dispatch }: SceneBuilderPanelProps) {
  const saveLabel = document.editingSavedSceneId ? '更新场景' : '保存为场景'
  const selectedObject = document.currentScene.objects.find((object) => object.id === document.selectedSceneObjectId)

  return (
    <section className="scene-builder-panel">
      <div className="section-title-row">
        <div>
          <h2>场景搭建</h2>
          <p>当前场景包含 {document.currentScene.objects.length} 个对象。</p>
        </div>
        <div className="scene-save-actions">
          <button type="button" onClick={() => dispatch({ type: 'reset-current-scene' })}>
            新建场景
          </button>
          <button type="button" onClick={onSaveCurrentScene}>
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="scene-builder-controls">
        <div>
          <h3>基础几何体</h3>
          <div className="scene-button-row">
            {primitives.map((item) => (
              <button
                key={item.primitive}
                type="button"
                onClick={() => dispatch({ type: 'add-scene-primitive', primitive: item.primitive })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3>组合体列表</h3>
          {document.savedModels.length === 0 ? (
            <p className="muted-copy">先在上方保存组合体，再把它作为整体放入场景。</p>
          ) : (
            <div className="scene-button-row">
              {document.savedModels.map((model) => (
                <button key={model.id} type="button" onClick={() => dispatch({ type: 'add-scene-model', modelId: model.id })}>
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>场景列表</h3>
          {document.savedScenes.length === 0 ? (
            <p className="muted-copy">保存后这里会出现可编辑、可用于最终渲染的场景。</p>
          ) : (
            <div className="saved-scene-list" role="list">
              {document.savedScenes.map((scene) => (
                <article
                  aria-label={`场景 ${scene.name}，${scene.objects.length} 个对象`}
                  className={document.editingSavedSceneId === scene.id ? 'saved-scene-item is-active' : 'saved-scene-item'}
                  key={scene.id}
                  role="listitem"
                >
                  <div>
                    <span>{scene.name}</span>
                    <small>{scene.objects.length} 个对象</small>
                  </div>
                  <button type="button" onClick={() => dispatch({ type: 'load-saved-scene', id: scene.id })}>
                    编辑
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <p className="muted-copy">
          {selectedObject ? `选中场景对象：${selectedObject.name}` : '未选中场景对象。可在画布中点击对象后拖拽变换。'}
        </p>
      </div>
    </section>
  )
}

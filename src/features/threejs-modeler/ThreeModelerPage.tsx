import { useCallback, useMemo, useReducer, useState } from 'react'
import { createDefaultModelDocument, defaultGenerationSettings } from './modelerDefaults'
import { modelerReducer } from './modelerReducer'
import { createGeneratedScene } from './generatedSceneFactory'
import { useThreeModelerScene } from './useThreeModelerScene'
import { useThreePreviewScene } from './useThreePreviewScene'
import { useThreeSceneBuilderScene } from './useThreeSceneBuilderScene'
import { ModelerToolbar } from './ModelerToolbar'
import { SceneTree } from './SceneTree'
import { ObjectInspector } from './ObjectInspector'
import { GenerationPanel } from './GenerationPanel'
import { SavedModelPanel } from './SavedModelPanel'
import { SceneBuilderPanel } from './SceneBuilderPanel'
import type { GenerationSettings, ModelPartPatch, SceneObjectPatch, TransformMode } from './modelerTypes'
import './ThreeModelerPage.css'

export function ThreeModelerPage() {
  const [document, dispatch] = useReducer(modelerReducer, undefined, createDefaultModelDocument)
  const [mode, setMode] = useState<TransformMode>('translate')
  const [generationSettings, setGenerationSettings] =
    useState<GenerationSettings>(defaultGenerationSettings)

  const selectedPart = document.parts.find((part) => part.id === document.selectedPartId)
  const selectedGeneratedScene =
    document.savedScenes.find((scene) => scene.id === generationSettings.sourceSceneId) ??
    document.savedScenes[0]
  const previewSourceScene = useMemo(
    () =>
      selectedGeneratedScene ?? {
        id: 'empty-source-scene',
        name: '未选择场景',
        objects: [],
      },
    [selectedGeneratedScene],
  )
  const generatedScene = useMemo(
    () => createGeneratedScene(previewSourceScene, generationSettings),
    [previewSourceScene, generationSettings],
  )
  const handleSelectPart = useCallback(
    (id: string | null) => dispatch({ type: 'select-part', id }),
    [],
  )
  const handleCommitPartTransform = useCallback((id: string, patch: Pick<ModelPartPatch, 'transform'>) => {
    dispatch({ type: 'update-part', id, patch })
  }, [])
  const handleSaveCurrent = useCallback(() => {
    const id = document.editingSavedModelId ?? `saved-model-${Date.now()}`
    const name = document.editingSavedModelId
      ? document.savedModels.find((model) => model.id === document.editingSavedModelId)?.name ?? document.name
      : `${document.name} ${document.savedModels.length + 1}`

    dispatch({ type: 'save-current-model', id, name })
  }, [document])
  const handleAddModelToScene = useCallback((id: string) => {
    dispatch({ type: 'add-scene-model', modelId: id })
  }, [])
  const handleSelectSceneObject = useCallback(
    (id: string | null) => dispatch({ type: 'select-scene-object', id }),
    [],
  )
  const handleCommitSceneObjectTransform = useCallback((id: string, patch: Pick<SceneObjectPatch, 'transform'>) => {
    dispatch({ type: 'update-scene-object', id, patch })
  }, [])
  const handleSaveCurrentScene = useCallback(() => {
    const id = document.editingSavedSceneId ?? `saved-scene-${Date.now()}`
    const name = document.editingSavedSceneId
      ? document.savedScenes.find((scene) => scene.id === document.editingSavedSceneId)?.name ?? document.currentScene.name
      : `Three.js 展示场景 ${document.savedScenes.length + 1}`

    dispatch({ type: 'save-current-scene', id, name })
    setGenerationSettings((current) => ({ ...current, sourceSceneId: id }))
  }, [document])
  const modelerCanvasRef = useThreeModelerScene({
    document,
    mode,
    onSelectPart: handleSelectPart,
    onCommitPartTransform: handleCommitPartTransform,
  })
  const sceneBuilderCanvasRef = useThreeSceneBuilderScene({
    document,
    mode,
    onSelectObject: handleSelectSceneObject,
    onCommitObjectTransform: handleCommitSceneObjectTransform,
  })
  const previewCanvasRef = useThreePreviewScene(previewSourceScene, document.savedModels, generatedScene)
  const jsonSummary = JSON.stringify(
    {
      id: document.id,
      version: document.version,
      parts: document.parts.map((part) => ({
        id: part.id,
        primitive: part.primitive,
        dimensions: part.dimensions,
        transform: part.transform,
        material: part.material,
      })),
      generatedInstances: generatedScene.instances.length,
      savedModels: document.savedModels.map((model) => ({
        id: model.id,
        name: model.name,
        parts: model.parts.length,
      })),
      currentScene: {
        id: document.currentScene.id,
        name: document.currentScene.name,
        objects: document.currentScene.objects.map((object) => ({
          id: object.id,
          type: object.type,
          name: object.name,
          transform: object.transform,
        })),
      },
      savedScenes: document.savedScenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        objects: scene.objects.length,
      })),
    },
    null,
    2,
  )

  return (
    <main className="three-modeler-page">
      <header className="modeler-header">
        <a href="/" className="back-link">
          返回目录
        </a>
        <div>
          <p className="eyebrow">Three.js / 原生 WebGL 工作流</p>
          <h1>Three.js 轻量 3D 建模实验室</h1>
          <p>当前模型包含 {document.parts.length} 个零件，可直接序列化为后续持久化数据。</p>
        </div>
      </header>

      <div className="modeler-workspace">
        <ModelerToolbar mode={mode} onModeChange={setMode} dispatch={dispatch} />

        <section className="viewport-column" aria-label="3D 建模画布">
          <div className="canvas-shell primary-canvas-shell">
            <canvas ref={modelerCanvasRef} aria-label="Three.js 建模画布" />
            <div className="canvas-overlay">
              <span>{selectedPart ? `选中：${selectedPart.name}` : '未选中对象'}</span>
              <span>{mode}</span>
            </div>
          </div>

          <div className="preview-row">
            <div className="preview-panel scene-builder-shell">
              <SceneBuilderPanel
                document={document}
                onSaveCurrentScene={handleSaveCurrentScene}
                dispatch={dispatch}
              />
            </div>
            <div className="canvas-shell scene-builder-canvas-shell">
              <canvas ref={sceneBuilderCanvasRef} aria-label="Three.js 场景搭建画布" />
            </div>
          </div>

          <div className="preview-row">
            <div className="preview-panel">
              <h2>生成大场景</h2>
              <GenerationPanel
                settings={generationSettings}
                generatedScene={generatedScene}
                savedScenes={document.savedScenes}
                onChange={setGenerationSettings}
              />
            </div>
            <div className="canvas-shell preview-canvas-shell">
              <canvas ref={previewCanvasRef} aria-label="Three.js 生成预览画布" />
            </div>
          </div>
        </section>

        <aside className="inspector-panel">
          <SavedModelPanel
            document={document}
            onSaveCurrent={handleSaveCurrent}
            onAddToScene={handleAddModelToScene}
            dispatch={dispatch}
          />
          <SceneTree document={document} dispatch={dispatch} />
          <ObjectInspector selectedPart={selectedPart} dispatch={dispatch} />
          <section className="panel-section principle-panel">
            <h2>实现原理</h2>
            <ol>
              <li>上方画布把 JSON schema 转成 Three.js mesh。</li>
              <li>拖拽 TransformControls 后会回写 position / rotation / scale。</li>
              <li>保存组合体后，场景画布可以把它当作 prefab 使用。</li>
              <li>保存场景后，生成画布会把整个场景作为实例源。</li>
              <li>生成模式控制排布，动画参数控制最终预览渲染。</li>
            </ol>
          </section>
          <section className="panel-section schema-panel">
            <h2>可持久化数据结构</h2>
            <pre>{jsonSummary}</pre>
          </section>
        </aside>
      </div>
    </main>
  )
}

import { describe, expect, it } from 'vitest'
import { createDefaultModelDocument, createModelPart } from './modelerDefaults'
import { modelerReducer } from './modelerReducer'

describe('modelerReducer', () => {
  it('adds a primitive part and selects it immediately', () => {
    const initial = createDefaultModelDocument()
    const next = modelerReducer(initial, {
      type: 'add-part',
      primitive: 'sphere',
      name: '观察球体',
    })

    expect(next.parts).toHaveLength(initial.parts.length + 1)
    expect(next.parts.at(-1)).toMatchObject({
      primitive: 'sphere',
      name: '观察球体',
    })
    expect(next.selectedPartId).toBe(next.parts.at(-1)!.id)
  })

  it('updates transform and material without mutating other parts', () => {
    const base = createDefaultModelDocument()
    const untouched = createModelPart('sphere', { name: '不会被改动的球体' })
    const document = {
      ...base,
      parts: [...base.parts, untouched],
      selectedPartId: base.parts[0].id,
    }

    const next = modelerReducer(document, {
      type: 'update-part',
      id: base.parts[0].id,
      patch: {
        dimensions: { width: 3, height: 1.2, depth: 2 },
        transform: { position: [2, 1, -3], scale: [1.5, 1.5, 0.8] },
        material: { color: '#58d7c5', metalness: 0.7 },
      },
    })

    expect(next.parts[0].dimensions).toEqual({ width: 3, height: 1.2, depth: 2 })
    expect(next.parts[0].transform.position).toEqual([2, 1, -3])
    expect(next.parts[0].transform.rotation).toEqual(base.parts[0].transform.rotation)
    expect(next.parts[0].transform.scale).toEqual([1.5, 1.5, 0.8])
    expect(next.parts[0].material.color).toBe('#58d7c5')
    expect(next.parts[0].material.roughness).toBe(base.parts[0].material.roughness)
    expect(next.parts.at(-1)).toBe(untouched)
  })

  it('selects, deletes, and resets parts predictably', () => {
    const base = createDefaultModelDocument()
    const extra = createModelPart('cone', { name: '可删除锥体' })
    const document = { ...base, parts: [...base.parts, extra], selectedPartId: extra.id }

    const selected = modelerReducer(document, { type: 'select-part', id: base.parts[0].id })
    const deleted = modelerReducer(selected, { type: 'delete-part', id: base.parts[0].id })
    const reset = modelerReducer(deleted, { type: 'reset-document' })

    expect(selected.selectedPartId).toBe(base.parts[0].id)
    expect(deleted.parts.map((part) => part.id)).not.toContain(base.parts[0].id)
    expect(deleted.selectedPartId).toBeNull()
    expect(reset).toEqual(createDefaultModelDocument())
  })

  it('saves the current model and loads it back for editing', () => {
    const base = createDefaultModelDocument()
    const saved = modelerReducer(base, {
      type: 'save-current-model',
      id: 'saved-study-rig',
      name: '学习组合体',
    })
    const changed = modelerReducer(saved, { type: 'add-part', primitive: 'cone' })
    const loaded = modelerReducer(changed, { type: 'load-saved-model', id: 'saved-study-rig' })

    expect(saved.savedModels).toHaveLength(1)
    expect(saved.savedModels[0]).toMatchObject({
      id: 'saved-study-rig',
      name: '学习组合体',
      parts: base.parts,
    })
    expect(loaded.parts).toEqual(base.parts)
    expect(loaded.editingSavedModelId).toBe('saved-study-rig')
    expect(loaded.selectedPartId).toBe(base.parts[0].id)
  })

  it('starts a new editable model without clearing saved assets', () => {
    const base = createDefaultModelDocument()
    const savedModel = modelerReducer(base, {
      type: 'save-current-model',
      id: 'saved-study-rig',
      name: '学习组合体',
    })
    const withSceneObject = modelerReducer(savedModel, {
      type: 'add-scene-model',
      modelId: 'saved-study-rig',
    })
    const withSavedScene = modelerReducer(withSceneObject, {
      type: 'save-current-scene',
      id: 'saved-scene-one',
      name: '教学展台场景',
    })
    const freshModel = modelerReducer(withSavedScene, { type: 'reset-current-model' })

    expect(freshModel.savedModels).toEqual(withSavedScene.savedModels)
    expect(freshModel.savedScenes).toEqual(withSavedScene.savedScenes)
    expect(freshModel.editingSavedModelId).toBeNull()
    expect(freshModel.parts).toHaveLength(3)
    expect(freshModel.parts[0].id).toBe('base-box')
  })

  it('builds scenes from primitives and saved models, then loads a saved scene for editing', () => {
    const base = createDefaultModelDocument()
    const withModel = modelerReducer(base, {
      type: 'save-current-model',
      id: 'saved-study-rig',
      name: '学习组合体',
    })
    const withPrimitive = modelerReducer(withModel, {
      type: 'add-scene-primitive',
      primitive: 'box',
      name: '场景底台',
    })
    const withModelObject = modelerReducer(withPrimitive, {
      type: 'add-scene-model',
      modelId: 'saved-study-rig',
    })
    const moved = modelerReducer(withModelObject, {
      type: 'update-scene-object',
      id: withModelObject.currentScene.objects[1].id,
      patch: { transform: { position: [2, 0, -1] } },
    })
    const saved = modelerReducer(moved, {
      type: 'save-current-scene',
      id: 'saved-scene-one',
      name: '教学展台场景',
    })
    const changed = modelerReducer(saved, { type: 'add-scene-primitive', primitive: 'sphere' })
    const loaded = modelerReducer(changed, { type: 'load-saved-scene', id: 'saved-scene-one' })

    expect(saved.savedScenes).toHaveLength(1)
    expect(saved.savedScenes[0]).toMatchObject({
      id: 'saved-scene-one',
      name: '教学展台场景',
      objects: [
        { type: 'primitive', name: '场景底台' },
        { type: 'model', sourceModelId: 'saved-study-rig' },
      ],
    })
    expect(saved.savedScenes[0].objects[1].transform.position).toEqual([2, 0, -1])
    expect(loaded.currentScene.objects).toEqual(saved.savedScenes[0].objects)
    expect(loaded.editingSavedSceneId).toBe('saved-scene-one')
    expect(loaded.selectedSceneObjectId).toBe(saved.savedScenes[0].objects[0].id)
  })
})

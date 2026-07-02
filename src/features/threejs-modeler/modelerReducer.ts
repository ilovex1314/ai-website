import { createDefaultModelDocument, createModelPart } from './modelerDefaults'
import type { ModelDocument, ModelerAction, ModelPart, PartTransform, SavedScene, SceneObject } from './modelerTypes'

const defaultSceneObjectTransform: PartTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

function clonePart(part: ModelPart): ModelPart {
  return {
    ...part,
    dimensions: { ...part.dimensions },
    transform: {
      position: [...part.transform.position],
      rotation: [...part.transform.rotation],
      scale: [...part.transform.scale],
    },
    material: { ...part.material },
  }
}

function cloneTransform(transform: PartTransform): PartTransform {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  }
}

function cloneSceneObject(object: SceneObject): SceneObject {
  if (object.type === 'primitive') {
    return {
      ...object,
      part: clonePart(object.part),
      transform: cloneTransform(object.transform),
    }
  }

  return {
    ...object,
    transform: cloneTransform(object.transform),
  }
}

function cloneSavedScene(scene: SavedScene): SavedScene {
  return {
    ...scene,
    objects: scene.objects.map(cloneSceneObject),
  }
}

function updatePart(part: ModelPart, action: Extract<ModelerAction, { type: 'update-part' }>) {
  if (part.id !== action.id) {
    return part
  }

  return {
    ...part,
    name: action.patch.name ?? part.name,
    dimensions: action.patch.dimensions ?? part.dimensions,
    transform: {
      ...part.transform,
      ...action.patch.transform,
    },
    material: {
      ...part.material,
      ...action.patch.material,
    },
  }
}

function updateSceneObject(object: SceneObject, action: Extract<ModelerAction, { type: 'update-scene-object' }>) {
  if (object.id !== action.id) {
    return object
  }

  return {
    ...object,
    name: action.patch.name ?? object.name,
    transform: {
      ...object.transform,
      ...action.patch.transform,
    },
  }
}

export function modelerReducer(document: ModelDocument, action: ModelerAction): ModelDocument {
  switch (action.type) {
    case 'add-part': {
      const part = createModelPart(action.primitive, { name: action.name })
      return {
        ...document,
        parts: [...document.parts, part],
        selectedPartId: part.id,
      }
    }

    case 'select-part':
      return {
        ...document,
        selectedPartId: action.id,
      }

    case 'update-part':
      return {
        ...document,
        parts: document.parts.map((part) => updatePart(part, action)),
      }

    case 'delete-part':
      return {
        ...document,
        parts: document.parts.filter((part) => part.id !== action.id),
        selectedPartId: document.selectedPartId === action.id ? null : document.selectedPartId,
      }

    case 'save-current-model': {
      const savedModel = {
        id: action.id,
        name: action.name,
        parts: document.parts.map(clonePart),
      }
      const existingIndex = document.savedModels.findIndex((model) => model.id === action.id)
      const savedModels =
        existingIndex >= 0
          ? document.savedModels.map((model) => (model.id === action.id ? savedModel : model))
          : [...document.savedModels, savedModel]

      return {
        ...document,
        savedModels,
        editingSavedModelId: action.id,
      }
    }

    case 'load-saved-model': {
      const savedModel = document.savedModels.find((model) => model.id === action.id)
      if (!savedModel) {
        return document
      }

      const parts = savedModel.parts.map(clonePart)
      return {
        ...document,
        parts,
        selectedPartId: parts[0]?.id ?? null,
        editingSavedModelId: savedModel.id,
      }
    }

    case 'reset-current-model': {
      const freshDocument = createDefaultModelDocument()
      return {
        ...document,
        parts: freshDocument.parts,
        selectedPartId: freshDocument.selectedPartId,
        editingSavedModelId: null,
        environment: freshDocument.environment,
      }
    }

    case 'add-scene-primitive': {
      const part = createModelPart(action.primitive, { name: action.name })
      const sceneObject: SceneObject = {
        id: `scene-object-${part.id}`,
        type: 'primitive',
        name: action.name ?? part.name,
        part,
        transform: cloneTransform(defaultSceneObjectTransform),
      }

      return {
        ...document,
        currentScene: {
          ...document.currentScene,
          objects: [...document.currentScene.objects, sceneObject],
        },
        selectedSceneObjectId: sceneObject.id,
      }
    }

    case 'add-scene-model': {
      const savedModel = document.savedModels.find((model) => model.id === action.modelId)
      if (!savedModel) {
        return document
      }

      const sceneObject: SceneObject = {
        id: `scene-object-${action.modelId}-${document.currentScene.objects.length + 1}`,
        type: 'model',
        name: savedModel.name,
        sourceModelId: savedModel.id,
        transform: cloneTransform(defaultSceneObjectTransform),
      }

      return {
        ...document,
        currentScene: {
          ...document.currentScene,
          objects: [...document.currentScene.objects, sceneObject],
        },
        selectedSceneObjectId: sceneObject.id,
      }
    }

    case 'select-scene-object':
      return {
        ...document,
        selectedSceneObjectId: action.id,
      }

    case 'update-scene-object':
      return {
        ...document,
        currentScene: {
          ...document.currentScene,
          objects: document.currentScene.objects.map((object) => updateSceneObject(object, action)),
        },
      }

    case 'delete-scene-object':
      return {
        ...document,
        currentScene: {
          ...document.currentScene,
          objects: document.currentScene.objects.filter((object) => object.id !== action.id),
        },
        selectedSceneObjectId: document.selectedSceneObjectId === action.id ? null : document.selectedSceneObjectId,
      }

    case 'save-current-scene': {
      const savedScene = {
        id: action.id,
        name: action.name,
        objects: document.currentScene.objects.map(cloneSceneObject),
      }
      const existingIndex = document.savedScenes.findIndex((scene) => scene.id === action.id)
      const savedScenes =
        existingIndex >= 0
          ? document.savedScenes.map((scene) => (scene.id === action.id ? savedScene : scene))
          : [...document.savedScenes, savedScene]

      return {
        ...document,
        currentScene: cloneSavedScene(savedScene),
        savedScenes,
        editingSavedSceneId: action.id,
      }
    }

    case 'load-saved-scene': {
      const savedScene = document.savedScenes.find((scene) => scene.id === action.id)
      if (!savedScene) {
        return document
      }

      const currentScene = cloneSavedScene(savedScene)
      return {
        ...document,
        currentScene,
        selectedSceneObjectId: currentScene.objects[0]?.id ?? null,
        editingSavedSceneId: savedScene.id,
      }
    }

    case 'reset-current-scene':
      return {
        ...document,
        currentScene: {
          id: 'threejs-study-scene-draft',
          name: '未保存场景',
          objects: [],
        },
        selectedSceneObjectId: null,
        editingSavedSceneId: null,
      }

    case 'reset-document':
      return createDefaultModelDocument()

    default:
      return document
  }
}

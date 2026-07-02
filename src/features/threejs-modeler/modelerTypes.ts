export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane'

export type TransformMode = 'translate' | 'rotate' | 'scale'

export type Vector3Tuple = [number, number, number]

export type PartTransform = {
  position: Vector3Tuple
  rotation: Vector3Tuple
  scale: Vector3Tuple
}

export type PartMaterial = {
  color: string
  metalness: number
  roughness: number
  opacity: number
}

export type PrimitiveDimensions =
  | { width: number; height: number; depth: number }
  | { radius: number }
  | { radius: number; height: number }
  | { width: number; depth: number }

export type ModelPart = {
  id: string
  name: string
  primitive: PrimitiveKind
  dimensions: PrimitiveDimensions
  transform: PartTransform
  material: PartMaterial
}

export type EnvironmentConfig = {
  background: string
  gridVisible: boolean
  axesVisible: boolean
}

export type ModelDocument = {
  id: string
  name: string
  version: 1
  units: 'meters'
  parts: ModelPart[]
  selectedPartId: string | null
  savedModels: SavedModel[]
  editingSavedModelId: string | null
  currentScene: SceneDocument
  selectedSceneObjectId: string | null
  savedScenes: SavedScene[]
  editingSavedSceneId: string | null
  environment: EnvironmentConfig
}

export type GenerationMode = 'grid' | 'radial' | 'stack'
export type GenerationAnimationMode = 'orbit' | 'pulse' | 'disperse'

export type SavedModel = {
  id: string
  name: string
  parts: ModelPart[]
}

export type SceneObject =
  | {
      id: string
      type: 'primitive'
      name: string
      part: ModelPart
      transform: PartTransform
    }
  | {
      id: string
      type: 'model'
      name: string
      sourceModelId: string
      transform: PartTransform
    }

export type SceneDocument = {
  id: string
  name: string
  objects: SceneObject[]
}

export type SavedScene = SceneDocument

export type GenerationSettings = {
  mode: GenerationMode
  sourceSceneId: string | null
  count: number
  spacing: number
  variance: number
  animation: {
    mode: GenerationAnimationMode
    speed: number
    amplitude: number
  }
}

export type ModelInstance = {
  id: string
  sourceSceneId: string
  phase: number
  transform: PartTransform
}

export type GeneratedScene = {
  id: string
  sourceSceneId: string
  generation: GenerationSettings
  instances: ModelInstance[]
}

export type ModelerAction =
  | { type: 'add-part'; primitive: PrimitiveKind; name?: string }
  | { type: 'select-part'; id: string | null }
  | { type: 'update-part'; id: string; patch: ModelPartPatch }
  | { type: 'delete-part'; id: string }
  | { type: 'save-current-model'; id: string; name: string }
  | { type: 'load-saved-model'; id: string }
  | { type: 'reset-current-model' }
  | { type: 'add-scene-primitive'; primitive: PrimitiveKind; name?: string }
  | { type: 'add-scene-model'; modelId: string }
  | { type: 'select-scene-object'; id: string | null }
  | { type: 'update-scene-object'; id: string; patch: SceneObjectPatch }
  | { type: 'delete-scene-object'; id: string }
  | { type: 'save-current-scene'; id: string; name: string }
  | { type: 'load-saved-scene'; id: string }
  | { type: 'reset-current-scene' }
  | { type: 'reset-document' }

export type ModelPartPatch = {
  name?: string
  dimensions?: PrimitiveDimensions
  transform?: Partial<PartTransform>
  material?: Partial<PartMaterial>
}

export type SceneObjectPatch = {
  name?: string
  transform?: Partial<PartTransform>
}

import type {
  GenerationSettings,
  ModelDocument,
  ModelPart,
  PartMaterial,
  PartTransform,
  PrimitiveKind,
  PrimitiveDimensions,
} from './modelerTypes'

const primitiveLabels: Record<PrimitiveKind, string> = {
  box: '立方体',
  sphere: '球体',
  cylinder: '圆柱',
  cone: '圆锥',
  plane: '平面',
}

const primitiveColors: Record<PrimitiveKind, string> = {
  box: '#58d7c5',
  sphere: '#f2c14e',
  cylinder: '#7aa8ff',
  cone: '#ff8f70',
  plane: '#9ca3af',
}

const defaultTransform: PartTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

const defaultMaterial: PartMaterial = {
  color: '#58d7c5',
  metalness: 0.25,
  roughness: 0.45,
  opacity: 1,
}

let partSequence = 0

export function getDefaultDimensions(primitive: PrimitiveKind): PrimitiveDimensions {
  switch (primitive) {
    case 'sphere':
      return { radius: 0.75 }
    case 'cylinder':
      return { radius: 0.55, height: 1.4 }
    case 'cone':
      return { radius: 0.65, height: 1.4 }
    case 'plane':
      return { width: 2.2, depth: 2.2 }
    case 'box':
    default:
      return { width: 1.4, height: 1.2, depth: 1.4 }
  }
}

export const defaultGenerationSettings: GenerationSettings = {
  mode: 'grid',
  sourceSceneId: null,
  count: 9,
  spacing: 2.4,
  variance: 0,
  animation: {
    mode: 'orbit',
    speed: 1,
    amplitude: 1,
  },
}

export function createModelPart(
  primitive: PrimitiveKind,
  options: Partial<Pick<ModelPart, 'id' | 'name'>> & {
    dimensions?: PrimitiveDimensions
    transform?: Partial<PartTransform>
    material?: Partial<PartMaterial>
  } = {},
): ModelPart {
  partSequence += 1

  return {
    id: options.id ?? `${primitive}-${partSequence}`,
    name: options.name ?? `${primitiveLabels[primitive]} ${partSequence}`,
    primitive,
    dimensions: options.dimensions ?? getDefaultDimensions(primitive),
    transform: {
      ...defaultTransform,
      ...options.transform,
    },
    material: {
      ...defaultMaterial,
      color: primitiveColors[primitive],
      ...options.material,
    },
  }
}

export function createDefaultModelDocument(): ModelDocument {
  return {
    id: 'threejs-study-model',
    name: 'Three.js 入门组合模型',
    version: 1,
    units: 'meters',
    selectedPartId: 'base-box',
    savedModels: [],
    editingSavedModelId: null,
    currentScene: {
      id: 'threejs-study-scene-draft',
      name: '未保存场景',
      objects: [],
    },
    selectedSceneObjectId: null,
    savedScenes: [],
    editingSavedSceneId: null,
    environment: {
      background: '#101820',
      gridVisible: true,
      axesVisible: true,
    },
    parts: [
      createModelPart('box', {
        id: 'base-box',
        name: '底座立方体',
        dimensions: { width: 2.4, height: 0.8, depth: 1.6 },
        transform: { position: [0, 0.4, 0], scale: [1, 1, 1] },
        material: { color: '#58d7c5', metalness: 0.35, roughness: 0.38 },
      }),
      createModelPart('cylinder', {
        id: 'center-cylinder',
        name: '中心圆柱',
        dimensions: { radius: 0.5, height: 1.1 },
        transform: { position: [0, 1.25, 0], scale: [1, 1, 1] },
        material: { color: '#7aa8ff', metalness: 0.2, roughness: 0.5 },
      }),
      createModelPart('sphere', {
        id: 'top-sphere',
        name: '顶部球体',
        dimensions: { radius: 0.75 },
        transform: { position: [0, 2.35, 0], scale: [1, 1, 1] },
        material: { color: '#f2c14e', metalness: 0.15, roughness: 0.42 },
      }),
    ],
  }
}

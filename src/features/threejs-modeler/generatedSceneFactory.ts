import type {
  GeneratedScene,
  GenerationSettings,
  ModelInstance,
  PartTransform,
  SceneDocument,
} from './modelerTypes'

const emptyRotation: PartTransform['rotation'] = [0, 0, 0]
const unitScale: PartTransform['scale'] = [1, 1, 1]

function round(value: number) {
  const normalized = Number(value.toFixed(6))
  return Object.is(normalized, -0) ? 0 : normalized
}

function createInstance(
  scene: SceneDocument,
  index: number,
  transform: PartTransform,
): ModelInstance {
  return {
    id: `${scene.id}-instance-${index + 1}`,
    sourceSceneId: scene.id,
    phase: round(index * 0.37),
    transform,
  }
}

function createGridInstances(scene: SceneDocument, settings: GenerationSettings) {
  const columns = Math.ceil(Math.sqrt(settings.count))
  const originOffset = ((columns - 1) * settings.spacing) / 2

  return Array.from({ length: settings.count }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)

    return createInstance(scene, index, {
      position: [
        round(column * settings.spacing - originOffset),
        0,
        round(row * settings.spacing - originOffset),
      ],
      rotation: emptyRotation,
      scale: unitScale,
    })
  })
}

function createRadialInstances(scene: SceneDocument, settings: GenerationSettings) {
  return Array.from({ length: settings.count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / settings.count

    return createInstance(scene, index, {
      position: [round(Math.cos(angle) * settings.spacing), 0, round(Math.sin(angle) * settings.spacing)],
      rotation: [0, angle, 0],
      scale: unitScale,
    })
  })
}

function createStackInstances(scene: SceneDocument, settings: GenerationSettings) {
  return Array.from({ length: settings.count }, (_, index) =>
    createInstance(scene, index, {
      position: [0, round(index * settings.spacing), 0],
      rotation: [0, round(index * 0.35), 0],
      scale: unitScale,
    }),
  )
}

export function createGeneratedScene(scene: SceneDocument, settings: GenerationSettings): GeneratedScene {
  const instances =
    scene.objects.length === 0
      ? []
      : {
          grid: createGridInstances,
          radial: createRadialInstances,
          stack: createStackInstances,
        }[settings.mode](scene, settings)

  return {
    id: `${scene.id}-${settings.mode}-generated`,
    sourceSceneId: scene.id,
    generation: settings,
    instances,
  }
}

import * as THREE from 'three'
import type {
  GeneratedScene,
  ModelDocument,
  ModelPart,
  PartTransform,
  SavedModel,
  SavedScene,
  SceneDocument,
} from './modelerTypes'

function createGeometry(part: ModelPart) {
  const dimensions = part.dimensions
  switch (part.primitive) {
    case 'sphere':
      return new THREE.SphereGeometry('radius' in dimensions ? dimensions.radius : 0.5, 32, 20)
    case 'cylinder':
      return new THREE.CylinderGeometry(
        'radius' in dimensions ? dimensions.radius : 0.5,
        'radius' in dimensions ? dimensions.radius : 0.5,
        'height' in dimensions ? dimensions.height : 1,
        32,
      )
    case 'cone':
      return new THREE.ConeGeometry(
        'radius' in dimensions ? dimensions.radius : 0.55,
        'height' in dimensions ? dimensions.height : 1,
        32,
      )
    case 'plane':
      return new THREE.BoxGeometry(
        'width' in dimensions ? dimensions.width : 1.4,
        0.04,
        'depth' in dimensions ? dimensions.depth : 1.4,
      )
    case 'box':
    default:
      return new THREE.BoxGeometry(
        'width' in dimensions ? dimensions.width : 1,
        'height' in dimensions ? dimensions.height : 1,
        'depth' in dimensions ? dimensions.depth : 1,
      )
  }
}

function applyTransform(object: THREE.Object3D, transform: PartTransform) {
  object.position.set(...transform.position)
  object.rotation.set(...transform.rotation)
  object.scale.set(...transform.scale)
}

export function createMeshFromPart(part: ModelPart) {
  const material = new THREE.MeshStandardMaterial({
    color: part.material.color,
    metalness: part.material.metalness,
    roughness: part.material.roughness,
    opacity: part.material.opacity,
    transparent: part.material.opacity < 1,
  })
  const mesh = new THREE.Mesh(createGeometry(part), material)

  mesh.name = part.name
  mesh.userData.partId = part.id
  applyTransform(mesh, part.transform)

  return mesh
}

export function createModelGroup(document: ModelDocument | SavedModel) {
  const group = new THREE.Group()
  group.name = document.name
  document.parts.forEach((part) => group.add(createMeshFromPart(part)))
  return group
}

export function createSceneDocumentGroup(sceneDocument: SceneDocument | SavedScene, savedModels: SavedModel[]) {
  const group = new THREE.Group()
  group.name = sceneDocument.name

  sceneDocument.objects.forEach((sceneObject) => {
    const objectGroup = new THREE.Group()
    objectGroup.name = sceneObject.name
    objectGroup.userData.sceneObjectId = sceneObject.id

    if (sceneObject.type === 'primitive') {
      objectGroup.add(createMeshFromPart(sceneObject.part))
    } else {
      const savedModel = savedModels.find((model) => model.id === sceneObject.sourceModelId)
      if (savedModel) {
        objectGroup.add(createModelGroup(savedModel))
      }
    }

    applyTransform(objectGroup, sceneObject.transform)
    group.add(objectGroup)
  })

  return group
}

export function createGeneratedSceneGroup(
  sceneDocument: SceneDocument | SavedScene,
  savedModels: SavedModel[],
  generatedScene: GeneratedScene,
) {
  const root = new THREE.Group()

  generatedScene.instances.forEach((instance) => {
    const modelGroup = createSceneDocumentGroup(sceneDocument, savedModels)
    modelGroup.name = instance.id
    applyTransform(modelGroup, instance.transform)
    root.add(modelGroup)
  })

  return root
}

export function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh

    // Three.js 不会自动释放 GPU 资源，切换模型时需要主动释放几何体和材质。
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else if (material) {
      material.dispose()
    }
  })
}

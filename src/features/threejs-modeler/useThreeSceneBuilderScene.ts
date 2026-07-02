import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { isSelectionClick } from './pointerSelection'
import { createSceneDocumentGroup, disposeObject3D } from './threeModelFactory'
import type { ModelDocument, SceneObjectPatch, TransformMode } from './modelerTypes'

type SceneBuilderOptions = {
  document: ModelDocument
  mode: TransformMode
  onSelectObject: (id: string | null) => void
  onCommitObjectTransform: (id: string, patch: Pick<SceneObjectPatch, 'transform'>) => void
}

function findSceneObjectRoot(object: THREE.Object3D | null) {
  let current = object
  while (current) {
    if (current.userData.sceneObjectId) {
      return current
    }
    current = current.parent
  }
  return null
}

export function useThreeSceneBuilderScene({
  document,
  mode,
  onSelectObject,
  onCommitObjectTransform,
}: SceneBuilderOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof WebGLRenderingContext === 'undefined') {
      return undefined
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 160)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerStart: { x: number; y: number } | null = null
    const orbitControls = new OrbitControls(camera, renderer.domElement)
    const transformControls = new TransformControls(camera, renderer.domElement)

    camera.position.set(6, 5, 7)
    orbitControls.enableDamping = true
    scene.background = new THREE.Color('#0b1220')
    scene.add(new THREE.HemisphereLight('#ffffff', '#172033', 1.5))

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.4)
    keyLight.position.set(5, 7, 4)
    scene.add(keyLight)
    scene.add(new THREE.GridHelper(16, 16, '#395466', '#22313f'))

    const sceneGroup = createSceneDocumentGroup(document.currentScene, document.savedModels)
    scene.add(sceneGroup)
    transformControls.setMode(mode)
    scene.add(transformControls.getHelper())

    const selectedObject = sceneGroup.children.find(
      (child) => child.userData.sceneObjectId === document.selectedSceneObjectId,
    )
    if (selectedObject) {
      transformControls.attach(selectedObject)
    }

    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value

      if (!event.value && transformControls.object) {
        const object = transformControls.object
        const objectId = object.userData.sceneObjectId as string | undefined
        if (objectId) {
          // 场景画布保存的是对象级 transform；组合体内部结构仍由组合体库维护。
          onCommitObjectTransform(objectId, {
            transform: {
              position: [object.position.x, object.position.y, object.position.z],
              rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
              scale: [object.scale.x, object.scale.y, object.scale.z],
            },
          })
        }
      }
    })

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    function handlePointerDown(event: PointerEvent) {
      pointerStart = { x: event.clientX, y: event.clientY }
    }

    function handlePointerUp(event: PointerEvent) {
      if (!pointerStart || !isSelectionClick(pointerStart, { x: event.clientX, y: event.clientY })) {
        pointerStart = null
        return
      }

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const hit = raycaster.intersectObjects(sceneGroup.children, true)[0]
      const sceneObjectRoot = findSceneObjectRoot(hit?.object ?? null)
      onSelectObject(sceneObjectRoot?.userData.sceneObjectId ?? null)
      pointerStart = null
    }

    let frame = 0
    function animate() {
      orbitControls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      transformControls.dispose()
      orbitControls.dispose()
      disposeObject3D(sceneGroup)
      renderer.dispose()
    }
  }, [document, mode, onSelectObject, onCommitObjectTransform])

  return canvasRef
}

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { createModelGroup, disposeObject3D } from './threeModelFactory'
import { isSelectionClick } from './pointerSelection'
import type { ModelDocument, ModelPartPatch, TransformMode } from './modelerTypes'

type SceneOptions = {
  document: ModelDocument
  mode: TransformMode
  onSelectPart: (id: string | null) => void
  onCommitPartTransform: (id: string, patch: Pick<ModelPartPatch, 'transform'>) => void
}

export function useThreeModelerScene({
  document,
  mode,
  onSelectPart,
  onCommitPartTransform,
}: SceneOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof WebGLRenderingContext === 'undefined') {
      return undefined
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerStart: { x: number; y: number } | null = null
    const orbitControls = new OrbitControls(camera, renderer.domElement)
    const transformControls = new TransformControls(camera, renderer.domElement)

    camera.position.set(4, 4, 6)
    orbitControls.enableDamping = true
    scene.background = new THREE.Color(document.environment.background)
    scene.add(new THREE.HemisphereLight('#ffffff', '#1f2937', 1.6))

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.2)
    keyLight.position.set(4, 6, 3)
    scene.add(keyLight)

    if (document.environment.gridVisible) {
      scene.add(new THREE.GridHelper(12, 12, '#375569', '#263744'))
    }

    if (document.environment.axesVisible) {
      scene.add(new THREE.AxesHelper(2.5))
    }

    const modelGroup = createModelGroup(document)
    scene.add(modelGroup)
    transformControls.setMode(mode)
    scene.add(transformControls.getHelper())

    const selectedObject = modelGroup.children.find(
      (child) => child.userData.partId === document.selectedPartId,
    )
    if (selectedObject) {
      transformControls.attach(selectedObject)
    }

    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value

      if (!event.value && transformControls.object) {
        const object = transformControls.object
        const partId = object.userData.partId as string | undefined
        if (partId) {
          // TransformControls 直接改的是 Three.js 对象；这里把结果同步回 React 数据源。
          onCommitPartTransform(partId, {
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

      const hit = raycaster.intersectObjects(modelGroup.children, false)[0]
      onSelectPart(hit?.object.userData.partId ?? null)
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
      disposeObject3D(modelGroup)
      renderer.dispose()
    }
  }, [document, mode, onSelectPart, onCommitPartTransform])

  return canvasRef
}

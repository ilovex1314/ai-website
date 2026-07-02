import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GeneratedScene, SavedModel, SceneDocument } from './modelerTypes'
import { createGeneratedSceneGroup, disposeObject3D } from './threeModelFactory'

export function useThreePreviewScene(sceneDocument: SceneDocument, savedModels: SavedModel[], generatedScene: GeneratedScene) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof WebGLRenderingContext === 'undefined') {
      return undefined
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180)
    const controls = new OrbitControls(camera, renderer.domElement)
    const group = createGeneratedSceneGroup(sceneDocument, savedModels, generatedScene)

    camera.position.set(7, 6, 8)
    controls.enableDamping = true
    scene.background = new THREE.Color('#0e141b')
    scene.add(new THREE.HemisphereLight('#ffffff', '#111827', 1.35))

    const light = new THREE.DirectionalLight('#ffffff', 2)
    light.position.set(6, 8, 4)
    scene.add(light)
    scene.add(new THREE.GridHelper(18, 18, '#2f4f60', '#21323d'))
    scene.add(group)

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const animationStart = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    function animate() {
      const time = (performance.now() - animationStart) / 1000
      const { animation } = generatedScene.generation

      if (!reducedMotion) {
        if (animation.mode === 'orbit') {
          group.rotation.y += 0.0025 * animation.speed
        }

        group.children.forEach((child, index) => {
          const instance = generatedScene.instances[index]
          if (!instance) {
            return
          }

          if (animation.mode === 'pulse') {
            const pulse = 1 + Math.sin(time * animation.speed + instance.phase) * 0.08 * animation.amplitude
            child.scale.setScalar(pulse)
          }

          if (animation.mode === 'disperse') {
            const spread = Math.sin(time * animation.speed + instance.phase) * animation.amplitude
            child.position.set(
              instance.transform.position[0] * (1 + spread * 0.16),
              instance.transform.position[1] + Math.max(0, spread) * 0.35,
              instance.transform.position[2] * (1 + spread * 0.16),
            )
          }
        })
      }

      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      controls.dispose()
      disposeObject3D(group)
      renderer.dispose()
    }
  }, [sceneDocument, savedModels, generatedScene])

  return canvasRef
}

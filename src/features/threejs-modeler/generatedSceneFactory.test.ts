import { describe, expect, it } from 'vitest'
import { createGeneratedScene } from './generatedSceneFactory'
import type { SceneDocument } from './modelerTypes'

const scene: SceneDocument = {
  id: 'saved-scene-one',
  name: '教学展台场景',
  objects: [
    {
      id: 'scene-object-one',
      type: 'primitive',
      name: '场景底台',
      part: {
        id: 'scene-box',
        name: '场景底台',
        primitive: 'box',
        dimensions: { width: 1, height: 1, depth: 1 },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        material: { color: '#58d7c5', metalness: 0.2, roughness: 0.4, opacity: 1 },
      },
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    },
  ],
}

describe('createGeneratedScene', () => {
  it('creates grid instances with row and column spacing', () => {
    const generated = createGeneratedScene(scene, {
      mode: 'grid',
      sourceSceneId: scene.id,
      count: 5,
      spacing: 3,
      variance: 0,
      animation: { mode: 'orbit', speed: 1, amplitude: 1 },
    })

    expect(generated.sourceSceneId).toBe(scene.id)
    expect(generated.instances).toHaveLength(5)
    expect(generated.instances.map((instance) => instance.transform.position)).toEqual([
      [-3, 0, -3],
      [0, 0, -3],
      [3, 0, -3],
      [-3, 0, 0],
      [0, 0, 0],
    ])
  })

  it('creates radial instances around the origin', () => {
    const generated = createGeneratedScene(scene, {
      mode: 'radial',
      sourceSceneId: 'saved-scene-one',
      count: 4,
      spacing: 2,
      variance: 0,
      animation: { mode: 'pulse', speed: 1.2, amplitude: 0.6 },
    })

    expect(generated.instances.map((instance) => instance.transform.position)).toEqual([
      [2, 0, 0],
      [0, 0, 2],
      [-2, 0, 0],
      [0, 0, -2],
    ])
    expect(generated.instances.map((instance) => instance.transform.rotation[1])).toEqual([
      0,
      Math.PI / 2,
      Math.PI,
      (Math.PI * 3) / 2,
    ])
  })

  it('creates stack instances with vertical offsets and gentle rotation', () => {
    const generated = createGeneratedScene(scene, {
      mode: 'stack',
      sourceSceneId: 'saved-scene-one',
      count: 3,
      spacing: 1.5,
      variance: 0,
      animation: { mode: 'disperse', speed: 0.8, amplitude: 1.4 },
    })

    expect(generated.instances.map((instance) => instance.transform.position)).toEqual([
      [0, 0, 0],
      [0, 1.5, 0],
      [0, 3, 0],
    ])
    expect(generated.instances[2].transform.rotation[1]).toBeCloseTo(0.7)
    expect(generated.generation.animation.mode).toBe('disperse')
  })
})

import { describe, expect, it } from 'vitest'
import {
  acceptHandoff,
  applyAnalysis,
  createInitialPortingState,
  createIntegrationRecipe,
} from './portingModel'

describe('portingModel', () => {
  it('accepts an explicit handoff and creates a verified recipe only after success', () => {
    const handed = acceptHandoff(createInitialPortingState(), {
      source: 'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      origin: 'gallery',
      title: 'Aurora Orbit',
      profile: 'webgl1',
      uniformValues: {
        uSpeed: 1,
        uScale: 3,
        uIntensity: 1,
        uPrimaryColor: [0.2, 0.7, 1],
        uSecondaryColor: [0.8, 0.2, 1],
      },
    })
    const analyzed = applyAnalysis(handed)
    expect(analyzed.report?.canRun).toBe(true)
    expect(createIntegrationRecipe(analyzed)).toBeNull()
    const verified = { ...analyzed, verifiedRevision: analyzed.sourceRevision }
    expect(createIntegrationRecipe(verified)?.title).toBe('Aurora Orbit React 接入配方')
  })
})

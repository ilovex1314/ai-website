import { describe, expect, it } from 'vitest'
import { createShaderClock, tickShaderClock } from './shaderClock'

describe('shaderClock', () => {
  it('freezes while paused and resumes without adding hidden time', () => {
    let clock = createShaderClock(2)
    clock = tickShaderClock(clock, 1000, true)
    clock = tickShaderClock(clock, 1016, true)
    expect(clock.time).toBeCloseTo(2.016)
    expect(clock.frame).toBe(2)
    clock = tickShaderClock(clock, 5016, false)
    expect(clock.time).toBeCloseTo(2.016)
    expect(clock.delta).toBe(0)
    clock = tickShaderClock(clock, 6016, true)
    expect(clock.delta).toBe(0)
    clock = tickShaderClock(clock, 6032, true)
    expect(clock.time).toBeCloseTo(2.032)
  })
})

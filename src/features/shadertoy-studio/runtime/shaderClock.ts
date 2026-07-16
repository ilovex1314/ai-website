export type ShaderClock = {
  time: number
  delta: number
  frame: number
  frameRate: number
  lastNow: number | null
}

export function createShaderClock(time = 0): ShaderClock {
  return { time, delta: 0, frame: 0, frameRate: 0, lastNow: null }
}

export function tickShaderClock(clock: ShaderClock, now: number, playing: boolean): ShaderClock {
  if (!playing) return { ...clock, delta: 0, lastNow: null }
  const delta = clock.lastNow === null
    ? 0
    : Math.max(0, Math.min((now - clock.lastNow) / 1000, 0.1))
  return {
    time: clock.time + delta,
    delta,
    frame: clock.frame + 1,
    frameRate: delta > 0 ? 1 / delta : clock.frameRate,
    lastNow: now,
  }
}

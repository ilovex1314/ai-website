export type PointerPhase = 'down' | 'move' | 'up'
export type ShaderMouse = [number, number, number, number]

type PointerRect = { left: number; top: number; width: number; height: number }
type PointerBuffer = { width: number; height: number }
type PointerPosition = { clientX: number; clientY: number }

export function mapPointerToShader(
  rect: PointerRect,
  buffer: PointerBuffer,
  event: PointerPosition,
  phase: PointerPhase,
  previous: ShaderMouse,
): ShaderMouse {
  const x = Math.max(0, Math.min(buffer.width, (event.clientX - rect.left) * buffer.width / rect.width))
  const y = Math.max(0, Math.min(buffer.height, buffer.height - (event.clientY - rect.top) * buffer.height / rect.height))
  if (phase === 'down') return [x, y, x, y]
  if (phase === 'up') return [x, y, -Math.abs(previous[2]), -Math.abs(previous[3])]
  return previous[2] > 0 && previous[3] > 0 ? [x, y, previous[2], previous[3]] : previous
}

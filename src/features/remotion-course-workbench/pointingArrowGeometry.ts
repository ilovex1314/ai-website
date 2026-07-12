type PixelRect = {
  x: number
  y: number
  width: number
  height: number
}

type PointingArrowLayoutParams = {
  offsetX?: number
  offsetY?: number
  widthDelta?: number
  heightDelta?: number
}

export type PointingArrowGeometry = {
  left: number
  top: number
  width: number
  height: number
  tail: { x: number; y: number }
  tip: { x: number; y: number }
  tailAbsolute: { x: number; y: number }
  tipAbsolute: { x: number; y: number }
}

const PADDING = 18

export function resolvePointingArrowGeometry(
  target: PixelRect,
  params: PointingArrowLayoutParams,
): PointingArrowGeometry {
  const center = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  }
  const tailAbsolute = {
    x: center.x + (params.offsetX ?? -220) + (params.widthDelta ?? 0),
    y: center.y + (params.offsetY ?? 140) + (params.heightDelta ?? 0),
  }
  let dx = tailAbsolute.x - center.x
  let dy = tailAbsolute.y - center.y

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    dx = -1
    dy = 0
  }

  const edgeScale = 1 / Math.max(
    Math.abs(dx) / Math.max(1, target.width / 2),
    Math.abs(dy) / Math.max(1, target.height / 2),
  )
  const tipAbsolute = {
    x: center.x + dx * edgeScale,
    y: center.y + dy * edgeScale,
  }
  const left = Math.min(tailAbsolute.x, tipAbsolute.x) - PADDING
  const top = Math.min(tailAbsolute.y, tipAbsolute.y) - PADDING
  const width = Math.max(36, Math.abs(tailAbsolute.x - tipAbsolute.x) + PADDING * 2)
  const height = Math.max(36, Math.abs(tailAbsolute.y - tipAbsolute.y) + PADDING * 2)

  return {
    left,
    top,
    width,
    height,
    tail: {
      x: ((tailAbsolute.x - left) / width) * 100,
      y: ((tailAbsolute.y - top) / height) * 100,
    },
    tip: {
      x: ((tipAbsolute.x - left) / width) * 100,
      y: ((tipAbsolute.y - top) / height) * 100,
    },
    tailAbsolute,
    tipAbsolute,
  }
}

import type { PointingArrowShape } from './workbenchTypes'

type Point = { x: number; y: number }

type PointingArrowVisualProps = {
  shape: PointingArrowShape
  color: string
  imageUrl?: string
  sourceTail?: Point
  sourceTip?: Point
  tail?: Point
  tip?: Point
}

const defaultTail = { x: 8, y: 84 }
const defaultTip = { x: 92, y: 16 }

function pathForShape(shape: Exclude<PointingArrowShape, 'custom-image'>, tail: Point, tip: Point) {
  if (tail === defaultTail && tip === defaultTip) {
    if (shape === 'curve') return 'M 8 84 Q 48 4 92 16'
    if (shape === 'elbow') return 'M 8 84 L 56 84 L 56 16 L 92 16'
    return 'M 8 84 L 92 16'
  }

  if (shape === 'curve') {
    const controlX = (tail.x + tip.x) / 2 - (tip.y - tail.y) * 0.28
    const controlY = (tail.y + tip.y) / 2 + (tip.x - tail.x) * 0.28
    return `M ${tail.x} ${tail.y} Q ${controlX} ${controlY} ${tip.x} ${tip.y}`
  }
  if (shape === 'elbow') {
    const middleX = (tail.x + tip.x) / 2
    return `M ${tail.x} ${tail.y} L ${middleX} ${tail.y} L ${middleX} ${tip.y} L ${tip.x} ${tip.y}`
  }
  return `M ${tail.x} ${tail.y} L ${tip.x} ${tip.y}`
}

function calibratedTransform(sourceTail: Point, sourceTip: Point, tail: Point, tip: Point) {
  const sourceStart = { x: sourceTail.x * 100, y: sourceTail.y * 100 }
  const sourceEnd = { x: sourceTip.x * 100, y: sourceTip.y * 100 }
  const sourceVector = { x: sourceEnd.x - sourceStart.x, y: sourceEnd.y - sourceStart.y }
  const targetVector = { x: tip.x - tail.x, y: tip.y - tail.y }
  const sourceLength = Math.max(0.001, Math.hypot(sourceVector.x, sourceVector.y))
  const targetLength = Math.max(0.001, Math.hypot(targetVector.x, targetVector.y))
  const scale = targetLength / sourceLength
  const angle = Math.atan2(targetVector.y, targetVector.x) - Math.atan2(sourceVector.y, sourceVector.x)
  const a = scale * Math.cos(angle)
  const b = scale * Math.sin(angle)
  const c = -scale * Math.sin(angle)
  const d = scale * Math.cos(angle)
  const e = tail.x - (a * sourceStart.x + c * sourceStart.y)
  const f = tail.y - (b * sourceStart.x + d * sourceStart.y)
  return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`
}

export function PointingArrowVisual({
  shape,
  color,
  imageUrl,
  sourceTail = { x: 0.08, y: 0.5 },
  sourceTip = { x: 0.92, y: 0.5 },
  tail = defaultTail,
  tip = defaultTip,
}: PointingArrowVisualProps) {
  const markerId = `pointing-arrow-head-${color.replace(/[^a-z0-9]/giu, '')}`

  return (
    <svg
      aria-label="指向箭头"
      className="pointing-arrow-visual"
      data-arrow-shape={shape}
      data-testid="pointing-arrow-visual"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {shape === 'custom-image' && imageUrl ? (
        <image
          data-testid="pointing-arrow-image"
          height="100"
          href={imageUrl}
          preserveAspectRatio="none"
          transform={calibratedTransform(sourceTail, sourceTip, tail, tip)}
          width="100"
          x="0"
          y="0"
        />
      ) : (
        <>
          <defs>
            <marker id={markerId} markerHeight="8" markerUnits="strokeWidth" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M 0 0 L 8 4 L 0 8 Z" fill={color} />
            </marker>
          </defs>
          <path
            d={pathForShape(shape === 'custom-image' ? 'straight' : shape, tail, tip)}
            data-testid="pointing-arrow-path"
            fill="none"
            markerEnd={`url(#${markerId})`}
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
        </>
      )}
    </svg>
  )
}

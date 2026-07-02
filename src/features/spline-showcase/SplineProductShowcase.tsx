import { useEffect, useMemo, useRef, useState } from 'react'
import {
  actionSixInspiredShowcase,
  type ModelPart,
  type ProductHotspot,
} from './splineShowcaseData'
import './SplineProductShowcase.css'

type Rotation = {
  x: number
  y: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startRotation: Rotation
}

type ExpansionPhase = 'idle' | 'collapsing' | 'expanding' | 'expanded'

const initialRotation: Rotation = { x: -18, y: 24 }

export function SplineProductShowcase() {
  const data = actionSixInspiredShowcase
  const shouldRenderSplineFrame =
    data.scene.embedMode === 'iframe' && data.scene.sceneUrl?.startsWith('https://')
  const [rotation, setRotation] = useState(initialRotation)
  const [activePartId, setActivePartId] = useState(data.hotspots[0]?.partId ?? 'lens')
  const [expandedPartId, setExpandedPartId] = useState<string | null>(null)
  const [expansionPhase, setExpansionPhase] = useState<ExpansionPhase>('idle')
  const dragRef = useRef<DragState | null>(null)
  const expansionTimerRef = useRef<number | null>(null)

  const activeHotspot = useMemo(
    () =>
      data.hotspots.find((hotspot) => hotspot.partId === activePartId) ??
      data.hotspots[0],
    [activePartId, data.hotspots],
  )

  useEffect(() => {
    return () => {
      if (expansionTimerRef.current !== null) {
        window.clearTimeout(expansionTimerRef.current)
      }
    }
  }, [])

  function clearExpansionTimer() {
    if (expansionTimerRef.current !== null) {
      window.clearTimeout(expansionTimerRef.current)
      expansionTimerRef.current = null
    }
  }

  function togglePartExpansion(partId: string) {
    setActivePartId(partId)
    clearExpansionTimer()

    if (expandedPartId === partId) {
      setExpandedPartId(null)
      setExpansionPhase('idle')
      return
    }

    if (expandedPartId) {
      setExpandedPartId(null)
      setExpansionPhase('collapsing')
      expansionTimerRef.current = window.setTimeout(() => {
        setActivePartId(partId)
        setExpandedPartId(partId)
        setExpansionPhase('expanding')
        expansionTimerRef.current = window.setTimeout(() => {
          setExpansionPhase('expanded')
          expansionTimerRef.current = null
        }, 180)
      }, 180)
      return
    }

    setExpandedPartId(partId)
    setExpansionPhase('expanding')
    expansionTimerRef.current = window.setTimeout(() => {
      setExpansionPhase('expanded')
      expansionTimerRef.current = null
    }, 180)
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function dragModel(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const nextY = drag.startRotation.y + (event.clientX - drag.startX) * 0.35
    const nextX = clamp(drag.startRotation.x - (event.clientY - drag.startY) * 0.25, -34, 18)
    setRotation({
      x: Math.round(nextX),
      y: Math.round(nextY),
    })
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }

  return (
    <main className="spline-product-page">
      <a className="spline-back" href="/">
        返回目录
      </a>

      <section className="product-hero">
        <div className="product-copy">
          <p className="spline-eyebrow">Spline topic / product model data</p>
          <p className="product-name">{data.product.name}</p>
          <h1>Action 6 灵感 3D 产品展示</h1>
          <p className="product-tagline">{data.product.tagline}</p>
          <p className="product-description">{data.product.description}</p>
          <p className="product-disclaimer">{data.product.disclaimer}</p>

          <div className="spec-strip" aria-label="产品规格参考">
            {data.specs.map((spec) => (
              <div key={spec.label}>
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="product-viewer-shell">
          {shouldRenderSplineFrame ? (
            <SplineSceneFrame sceneUrl={data.scene.sceneUrl ?? ''} />
          ) : (
            <LocalProductModel
              activePartId={activePartId}
              expandedPartId={expandedPartId}
              expansionPhase={expansionPhase}
              hotspots={data.hotspots}
              parts={data.model.parts}
              rotation={rotation}
              watermark={data.model.watermark}
              onPartHover={setActivePartId}
              onPartToggle={togglePartExpansion}
              onPointerDown={startDrag}
              onPointerMove={dragModel}
              onPointerUp={finishDrag}
            />
          )}
          <HotspotPanel hotspot={activeHotspot} />
        </div>
      </section>

      <section className="product-data-panel" aria-label="Spline 数据结构摘要">
        <div>
          <span>scene</span>
          <strong>{data.scene.embedMode}</strong>
          <p>{data.scene.sceneUrl ?? '等待替换为真实 Action 6 Spline 发布 URL'}</p>
        </div>
        <div>
          <span>localModelUrl</span>
          <strong>{data.scene.localModelUrl}</strong>
          <p>本地结构化数据和 GLB 源资产保留作 Spline 导入、回退渲染和教学拆解。</p>
        </div>
        <div>
          <span>sourceAsset</span>
          <strong>{data.scene.sourceAsset.format.toUpperCase()}</strong>
          <p>{data.scene.sourceAsset.url}</p>
        </div>
        <div>
          <span>hotspots</span>
          <strong>{data.hotspots.length} 个部件热点</strong>
          <p>hover 或轻触模型部件时展示对应卖点。</p>
        </div>
      </section>
    </main>
  )
}

function SplineSceneFrame({ sceneUrl }: { sceneUrl: string }) {
  return (
    <figure className="spline-live-stage" aria-label="Spline 发布场景">
      <iframe
        allow="fullscreen; xr-spatial-tracking"
        className="spline-live-frame"
        data-testid="spline-public-scene"
        src={sceneUrl}
        title="Action 6 inspired Spline scene"
      />
      <figcaption>
        <strong>Spline Public URL</strong>
        <span>拖拽旋转由 Spline 场景运行时接管。</span>
      </figcaption>
    </figure>
  )
}

function LocalProductModel({
  activePartId,
  expandedPartId,
  expansionPhase,
  hotspots,
  parts,
  rotation,
  watermark,
  onPartHover,
  onPartToggle,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  activePartId: string
  expandedPartId: string | null
  expansionPhase: ExpansionPhase
  hotspots: ProductHotspot[]
  parts: ModelPart[]
  rotation: Rotation
  watermark: string
  onPartHover: (partId: string) => void
  onPartToggle: (partId: string) => void
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  const hotspotPartIds = new Set(hotspots.map((hotspot) => hotspot.partId))

  return (
    <figure className="product-stage" aria-label="Action 6 灵感原创 3D 展示模型">
      <div className="stage-glow" />
      <div className="stage-shadow" />
      <div
        className="precision-camera"
        data-expanded-part={expandedPartId ?? 'none'}
        data-expansion-phase={expansionPhase}
        data-rotation={`${rotation.x},${rotation.y}`}
        data-testid="local-action-camera-model"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        <div className="camera-depth camera-depth-left" />
        <div className="camera-depth camera-depth-right" />
        <div className="camera-depth camera-depth-top" />
        <div className="camera-depth camera-depth-bottom" />
        {parts.map((part) => {
          const isHotspot = hotspotPartIds.has(part.id)
          return (
            <button
              aria-label={isHotspot ? `热点：${part.label}` : part.label}
              className={`model-part ${part.className}`}
              data-active={activePartId === part.id}
              data-expanded={expandedPartId === part.id}
              data-kind={part.kind}
              key={part.id}
              onClick={() => onPartToggle(part.id)}
              onFocus={() => onPartHover(part.id)}
              onMouseEnter={() => onPartHover(part.id)}
              onPointerEnter={() => onPartHover(part.id)}
              type="button"
            >
              {part.text ? <span>{part.text}</span> : null}
            </button>
          )
        })}
      </div>
      <div className="hotspot-markers" aria-label="模型热点标记">
        {hotspots.map((hotspot) => (
          <button
            aria-label={`热点标记：${hotspot.label}`}
            className={`hotspot-marker hotspot-marker-${hotspot.partId}`}
            data-active={activePartId === hotspot.partId}
            data-expanded={expandedPartId === hotspot.partId}
            key={hotspot.id}
            onClick={() => onPartToggle(hotspot.partId)}
            onFocus={() => onPartHover(hotspot.partId)}
            onMouseEnter={() => onPartHover(hotspot.partId)}
            onPointerEnter={() => onPartHover(hotspot.partId)}
            type="button"
          />
        ))}
      </div>
      <figcaption>
        <strong>{watermark}</strong>
        <span>拖拽旋转，hover 部件查看详情。</span>
      </figcaption>
    </figure>
  )
}

function HotspotPanel({ hotspot }: { hotspot: ProductHotspot }) {
  return (
    <aside className="hotspot-panel" aria-live="polite">
      <p className="spline-eyebrow">Hotspot</p>
      <h2>{hotspot.label}</h2>
      <p>{hotspot.description}</p>
      <ul>
        {hotspot.specs.map((spec) => (
          <li key={spec}>{spec}</li>
        ))}
      </ul>
    </aside>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

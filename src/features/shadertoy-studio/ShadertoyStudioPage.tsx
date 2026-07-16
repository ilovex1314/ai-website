import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ShaderGalleryTab } from './gallery/ShaderGalleryTab'
import {
  createGalleryState,
  getGalleryPreset,
  type GalleryPresetId,
} from './gallery/galleryPresets'
import { ShaderLabTab } from './lab/ShaderLabTab'
import { createLabState } from './lab/shaderLessons'
import { ShaderPortingTab } from './porting/ShaderPortingTab'
import {
  acceptHandoff,
  applyAnalysis,
  createInitialPortingState,
} from './porting/portingModel'
import type { ShaderHandoff } from './runtime/shaderTypes'
import './ShadertoyStudioPage.css'

const views = ['gallery', 'lab', 'porting'] as const
type StudioView = typeof views[number]

const viewLabels: Record<StudioView, string> = {
  gallery: '作品展厅',
  lab: '引导实验室',
  porting: '迁移工作台',
}

function getInitialView(): StudioView {
  const value = new URLSearchParams(window.location.search).get('view')
  return views.includes(value as StudioView) ? value as StudioView : 'gallery'
}

function nextView(current: StudioView, key: string): StudioView | undefined {
  const index = views.indexOf(current)
  if (key === 'ArrowRight') return views[(index + 1) % views.length]
  if (key === 'ArrowLeft') return views[(index + views.length - 1) % views.length]
  if (key === 'Home') return views[0]
  if (key === 'End') return views[views.length - 1]
  return undefined
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function ShadertoyStudioPage() {
  const [activeView, setActiveView] = useState<StudioView>(getInitialView)
  const [galleryState, setGalleryState] = useState(() => ({
    ...createGalleryState(),
    playing: !prefersReducedMotion(),
  }))
  const [labState, setLabState] = useState(() => ({
    ...createLabState(),
    playing: !prefersReducedMotion(),
  }))
  const [portingState, setPortingState] = useState(createInitialPortingState)
  const [referencePresetId, setReferencePresetId] = useState<GalleryPresetId | undefined>()
  const [pendingHandoff, setPendingHandoff] = useState<ShaderHandoff | undefined>()
  const tabRefs = useRef<Record<StudioView, HTMLButtonElement | null>>({ gallery: null, lab: null, porting: null })

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', activeView)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeView])

  const switchView = (view: StudioView, focus = false) => {
    setActiveView(view)
    if (focus) tabRefs.current[view]?.focus()
  }

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, view: StudioView) => {
    const target = nextView(view, event.key)
    if (!target) return
    event.preventDefault()
    switchView(target, true)
  }

  const portingIsUntouched = portingState.sourceRevision === 1
    && portingState.title === '未命名 Shader'
    && portingState.report === null
    && portingState.verifiedRevision === null

  const sendToPorting = (handoff: ShaderHandoff) => {
    if (portingIsUntouched) {
      setPortingState(applyAnalysis(acceptHandoff(portingState, handoff)))
      setPendingHandoff(undefined)
    } else {
      setPendingHandoff(handoff)
    }
    switchView('porting')
  }

  const acceptPending = () => {
    if (!pendingHandoff) return
    setPortingState(applyAnalysis(acceptHandoff(portingState, pendingHandoff)))
    setPendingHandoff(undefined)
  }

  return (
    <main className="shadertoy-studio">
      <header className="shader-studio-header">
        <a className="shader-back-link" href="/">← 返回案例目录</a>
        <div className="shader-title-row">
          <div>
            <p className="shader-kicker">TOPIC 04 · NATIVE WEBGL WORKBENCH</p>
            <h1>Shadertoy Studio</h1>
            <p className="shader-subtitle">从作品、原理到 React 迁移。</p>
          </div>
          <div className="shader-runtime-summary" aria-live="polite">
            <span className="shader-status" data-level="running">Native WebGL</span>
            <strong>{viewLabels[activeView]}</strong>
            <small>单 Pass · WebGL 1 / WebGL 2</small>
          </div>
        </div>

        <ol className="shader-concept-strip" data-active-view={activeView} aria-label="Shader 运行链路">
          {['像素坐标', 'mainImage', 'uniforms', 'GPU 逐像素计算', 'canvas'].map((item, index) => (
            <li key={item}><span>{index + 1}</span>{item}</li>
          ))}
        </ol>

        <div className="shader-tablist" role="tablist" aria-label="Shadertoy Studio 模式">
          {views.map((view, index) => (
            <button
              key={view}
              ref={(node) => { tabRefs.current[view] = node }}
              role="tab"
              id={`shader-tab-${view}`}
              aria-controls={`shader-panel-${view}`}
              aria-selected={activeView === view}
              tabIndex={activeView === view ? 0 : -1}
              onKeyDown={(event) => handleTabKey(event, view)}
              onClick={() => switchView(view)}
            >
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              {viewLabels[view]}
            </button>
          ))}
        </div>
      </header>

      <section
        className="shader-tabpanel"
        role="tabpanel"
        id={`shader-panel-${activeView}`}
        aria-labelledby={`shader-tab-${activeView}`}
        aria-label={viewLabels[activeView]}
      >
        {activeView === 'gallery' ? (
          <ShaderGalleryTab
            state={galleryState}
            onChange={setGalleryState}
            onInspectInLab={(presetId) => {
              setReferencePresetId(presetId)
              switchView('lab')
            }}
            onCheckMigration={sendToPorting}
          />
        ) : null}
        {activeView === 'lab' ? (
          <ShaderLabTab
            state={labState}
            onChange={setLabState}
            referencePreset={referencePresetId ? getGalleryPreset(referencePresetId) : undefined}
            onCheckMigration={sendToPorting}
          />
        ) : null}
        {activeView === 'porting' ? (
          <ShaderPortingTab
            state={portingState}
            onChange={setPortingState}
            pendingHandoff={pendingHandoff}
            onAcceptHandoff={acceptPending}
            onRejectHandoff={() => setPendingHandoff(undefined)}
          />
        ) : null}
      </section>
    </main>
  )
}

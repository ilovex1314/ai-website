import { useEffect, useRef, useState, type RefObject } from 'react'
import { createShaderClock, tickShaderClock } from './shaderClock'
import { mapPointerToShader, type ShaderMouse } from './pointerMapping'
import { createShaderRuntime, type ShaderQuality, type ShaderRuntime } from './shaderRuntime'
import type {
  ShaderCompileRequest,
  ShaderCompileResult,
  ShaderRuntimeStatus,
  UniformBinding,
} from './shaderTypes'

export type ShaderCanvasOptions = {
  request: ShaderCompileRequest
  uniforms: Record<string, UniformBinding>
  playing: boolean
  quality: ShaderQuality
  initialElapsed: number
  ariaLabel: string
  onCompileResult: (result: ShaderCompileResult) => void
  onElapsedChange: (elapsed: number) => void
  onMouseChange?: (mouse: ShaderMouse) => void
}

type Activation = (request: ShaderCompileRequest, forceNew?: boolean) => void

export function useShaderCanvas(options: ShaderCanvasOptions): {
  hostRef: RefObject<HTMLDivElement | null>
  status: ShaderRuntimeStatus
} {
  const hostRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<ShaderRuntime | null>(null)
  const activeRequestRef = useRef<ShaderCompileRequest | null>(null)
  const activateRef = useRef<Activation | null>(null)
  const canvasCleanupRef = useRef<(() => void) | null>(null)
  const clockRef = useRef(createShaderClock(options.initialElapsed))
  const mouseRef = useRef<ShaderMouse>([0, 0, 0, 0])
  const contextLostRef = useRef(false)
  const playingRef = useRef(options.playing)
  const qualityRef = useRef(options.quality)
  const uniformsRef = useRef(options.uniforms)
  const ariaLabelRef = useRef(options.ariaLabel)
  const compileCallbackRef = useRef(options.onCompileResult)
  const elapsedCallbackRef = useRef(options.onElapsedChange)
  const mouseCallbackRef = useRef(options.onMouseChange)
  const [status, setStatus] = useState<ShaderRuntimeStatus>('initializing')
  const [runtimeGeneration, setRuntimeGeneration] = useState(0)

  playingRef.current = options.playing
  qualityRef.current = options.quality
  uniformsRef.current = options.uniforms
  ariaLabelRef.current = options.ariaLabel
  compileCallbackRef.current = options.onCompileResult
  elapsedCallbackRef.current = options.onElapsedChange
  mouseCallbackRef.current = options.onMouseChange

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let closed = false

    const attachCanvas = (canvas: HTMLCanvasElement, runtime: ShaderRuntime) => {
      const updatePointer = (event: PointerEvent) => {
        const phase = event.type === 'pointerdown'
          ? 'down'
          : event.type === 'pointerup' || event.type === 'pointercancel'
            ? 'up'
            : 'move'
        mouseRef.current = mapPointerToShader(
          canvas.getBoundingClientRect(),
          { width: canvas.width, height: canvas.height },
          event,
          phase,
          mouseRef.current,
        )
        mouseCallbackRef.current?.(mouseRef.current)
        if (phase === 'down') canvas.setPointerCapture?.(event.pointerId)
      }
      const resize = () => runtime.resize(qualityRef.current)
      const lost = (event: Event) => {
        event.preventDefault()
        contextLostRef.current = true
        setStatus('context-lost')
      }
      const restored = () => {
        contextLostRef.current = false
        const request = activeRequestRef.current
        if (request) activateRef.current?.(request, true)
      }

      canvas.addEventListener('pointerdown', updatePointer)
      canvas.addEventListener('pointermove', updatePointer)
      canvas.addEventListener('pointerup', updatePointer)
      canvas.addEventListener('pointercancel', updatePointer)
      canvas.addEventListener('webglcontextlost', lost)
      canvas.addEventListener('webglcontextrestored', restored)
      let observer: ResizeObserver | null = null
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(resize)
        observer.observe(canvas)
      } else {
        window.addEventListener('resize', resize)
      }
      resize()

      return () => {
        observer?.disconnect()
        window.removeEventListener('resize', resize)
        canvas.removeEventListener('pointerdown', updatePointer)
        canvas.removeEventListener('pointermove', updatePointer)
        canvas.removeEventListener('pointerup', updatePointer)
        canvas.removeEventListener('pointercancel', updatePointer)
        canvas.removeEventListener('webglcontextlost', lost)
        canvas.removeEventListener('webglcontextrestored', restored)
      }
    }

    const activate: Activation = (request, forceNew = false) => {
      if (closed) return
      const current = runtimeRef.current
      if (current && current.profile === request.profile && !forceNew) {
        const result = current.replaceSource(request.source)
        compileCallbackRef.current(result)
        if (result.ok) {
          activeRequestRef.current = request
          setStatus(playingRef.current ? 'running' : 'paused')
          setRuntimeGeneration((value) => value + 1)
        } else {
          setStatus('error')
        }
        return
      }

      const candidate = document.createElement('canvas')
      candidate.setAttribute('aria-label', ariaLabelRef.current)
      candidate.tabIndex = 0
      candidate.dataset.shaderProfile = request.profile
      try {
        const nextRuntime = createShaderRuntime(candidate, request.profile)
        const result = nextRuntime.replaceSource(request.source)
        compileCallbackRef.current(result)
        if (!result.ok) {
          nextRuntime.dispose()
          setStatus(current ? 'error' : 'unavailable')
          return
        }
        canvasCleanupRef.current?.()
        host.replaceChildren(candidate)
        runtimeRef.current = nextRuntime
        activeRequestRef.current = request
        canvasCleanupRef.current = attachCanvas(candidate, nextRuntime)
        if (current) current.dispose()
        contextLostRef.current = false
        setStatus(playingRef.current ? 'running' : 'paused')
        setRuntimeGeneration((value) => value + 1)
      } catch (error) {
        const result: ShaderCompileResult = {
          ok: false,
          profile: request.profile,
          diagnostics: [{
            severity: 'error',
            stage: 'runtime',
            profile: request.profile,
            message: error instanceof Error ? error.message : String(error),
            raw: String(error),
          }],
        }
        compileCallbackRef.current(result)
        setStatus(current ? 'error' : 'unavailable')
      }
    }

    activateRef.current = activate
    return () => {
      closed = true
      activateRef.current = null
      canvasCleanupRef.current?.()
      canvasCleanupRef.current = null
      elapsedCallbackRef.current(clockRef.current.time)
      runtimeRef.current?.dispose()
      runtimeRef.current = null
      host.replaceChildren()
    }
  }, [])

  useEffect(() => {
    activateRef.current?.(options.request)
  }, [options.request])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime || contextLostRef.current) return
    let frame = 0
    if (!options.playing) {
      clockRef.current = tickShaderClock(clockRef.current, performance.now(), false)
      runtime.resize(options.quality)
      runtime.draw(clockRef.current, mouseRef.current, options.uniforms)
      setStatus((current) => current === 'error' ? current : 'paused')
      return
    }
    const draw = (now: number) => {
      if (contextLostRef.current) return
      clockRef.current = tickShaderClock(clockRef.current, now, true)
      runtime.resize(qualityRef.current)
      runtime.draw(clockRef.current, mouseRef.current, uniformsRef.current)
      frame = requestAnimationFrame(draw)
    }
    setStatus((current) => current === 'error' ? current : 'running')
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [options.playing, options.quality, options.uniforms, runtimeGeneration])

  return { hostRef, status }
}

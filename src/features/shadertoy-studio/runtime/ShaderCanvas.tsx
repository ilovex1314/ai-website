import { useShaderCanvas, type ShaderCanvasOptions } from './useShaderCanvas'

export type { ShaderCanvasOptions }

export function ShaderCanvas(props: ShaderCanvasOptions) {
  const { hostRef, status } = useShaderCanvas(props)
  return (
    <div className="shader-canvas-shell" data-runtime-status={status}>
      <div className="shader-canvas-host" ref={hostRef} data-testid="shader-canvas-host" />
      {status === 'unavailable' ? (
        <p className="shader-canvas-fallback">当前浏览器无法创建 WebGL 画布。</p>
      ) : null}
    </div>
  )
}

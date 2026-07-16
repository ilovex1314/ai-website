import { analyzeShaderCompatibility, type CompatibilityReport } from '../runtime/shaderCompatibility'
import type {
  ShaderHandoff,
  ShaderProfilePreference,
  UniformBinding,
  UniformKind,
} from '../runtime/shaderTypes'

export type PortingProvenance = ShaderHandoff['provenance'] & {
  origin?: ShaderHandoff['origin']
}

export type PortingState = {
  source: string
  sourceRevision: number
  verifiedRevision: number | null
  profilePreference: ShaderProfilePreference
  report: CompatibilityReport | null
  customUniforms: Record<string, UniformBinding>
  provenance?: PortingProvenance
  title: string
}

export type IntegrationRecipeSection = {
  id: 'source' | 'bindings' | 'lifecycle' | 'requirements' | 'provenance'
  title: string
  body: string
  code?: string
}

export type IntegrationRecipeModel = {
  title: string
  sections: IntegrationRecipeSection[]
}

const starterSource = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  fragColor = vec4(uv, 0.55 + 0.45 * sin(iTime), 1.0);
}`

export function defaultValue(type: UniformKind): UniformBinding {
  if (type === 'bool') return { type, value: false }
  if (type === 'vec2') return { type, value: [0, 0] }
  if (type === 'vec3') return { type, value: [0, 0, 0] }
  if (type === 'vec4') return { type, value: [0, 0, 0, 0] }
  return { type, value: 0 }
}

export function createInitialPortingState(): PortingState {
  return {
    source: starterSource,
    sourceRevision: 1,
    verifiedRevision: null,
    profilePreference: 'auto',
    report: null,
    customUniforms: {},
    title: '未命名 Shader',
  }
}

export function applyAnalysis(state: PortingState): PortingState {
  const report = analyzeShaderCompatibility(state.source, state.profilePreference)
  return {
    ...state,
    report,
    verifiedRevision: null,
    customUniforms: Object.fromEntries(
      report.customUniforms.map(({ name, type }) => [name, defaultValue(type)]),
    ),
  }
}

export function acceptHandoff(state: PortingState, handoff: ShaderHandoff): PortingState {
  return {
    ...state,
    source: handoff.source,
    sourceRevision: state.sourceRevision + 1,
    verifiedRevision: null,
    profilePreference: handoff.profile,
    report: null,
    customUniforms: {},
    title: handoff.title,
    provenance: { ...handoff.provenance, origin: handoff.origin },
  }
}

export const reactLifecycleRecipe = `useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const runtime = createShaderRuntime(canvas, profile)
  const compiled = runtime.replaceSource(fragmentSource)
  if (!compiled.ok) throw new Error(compiled.diagnostics.map((item) => item.message).join('\\n'))

  let frame = 0
  let clock = createShaderClock()
  let currentMouse: [number, number, number, number] = [0, 0, 0, 0]
  const resize = () => runtime.resize(1)
  const pointer = (event: PointerEvent) => {
    const phase = event.type === 'pointerdown' ? 'down' : event.type === 'pointerup' ? 'up' : 'move'
    currentMouse = mapPointerToShader(
      canvas.getBoundingClientRect(),
      { width: canvas.width, height: canvas.height },
      event,
      phase,
      currentMouse,
    )
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  canvas.addEventListener('pointerdown', pointer)
  canvas.addEventListener('pointermove', pointer)
  canvas.addEventListener('pointerup', pointer)

  const draw = (now: number) => {
    clock = tickShaderClock(clock, now, true)
    runtime.draw(clock, currentMouse, customUniforms)
    frame = requestAnimationFrame(draw)
  }
  resize()
  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    canvas.removeEventListener('pointerdown', pointer)
    canvas.removeEventListener('pointermove', pointer)
    canvas.removeEventListener('pointerup', pointer)
    runtime.dispose()
  }
}, [fragmentSource, profile])`

export function createIntegrationRecipe(state: PortingState): IntegrationRecipeModel | null {
  if (state.verifiedRevision !== state.sourceRevision || !state.report?.canRun) return null

  const bindings = JSON.stringify(state.customUniforms, null, 2)
  const provenance = state.provenance?.sourceUrl
    ? `复核原作者、许可和来源：${state.provenance.sourceUrl}`
    : '粘贴的 Shader 仍需人工复核原作者、许可和来源链接。'

  return {
    title: `${state.title} React 接入配方`,
    sections: [
      { id: 'source', title: '1. Fragment source', body: '把已验证的 mainImage 源码保存为独立模块。', code: state.source },
      { id: 'bindings', title: '2. Uniform bindings', body: '宿主用同一结构持续写入自定义输入。', code: `const customUniforms = ${bindings}` },
      { id: 'lifecycle', title: '3. React lifecycle', body: '建立、编译、缩放、指针、逐帧绘制和完整清理。', code: reactLifecycleRecipe },
      { id: 'requirements', title: '4. 平台要求', body: `使用 ${state.report.profile}；需要 ResizeObserver、Pointer Events、requestAnimationFrame 和 WebGL。` },
      { id: 'provenance', title: '5. 来源复核', body: provenance },
    ],
  }
}

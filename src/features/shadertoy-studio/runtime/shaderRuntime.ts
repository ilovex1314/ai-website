import { adaptShaderSource } from './shaderAdapters'
import { compileProgram } from './shaderCompiler'
import type { ShaderClock } from './shaderClock'
import type {
  ShaderCompileResult,
  ShaderProfile,
  UniformBinding,
  UniformValue,
} from './shaderTypes'

type GlContext = WebGLRenderingContext | WebGL2RenderingContext
type ShaderMouse = [number, number, number, number]
export type ShaderQuality = 0.5 | 0.75 | 1

export type ShaderRuntime = {
  canvas: HTMLCanvasElement
  profile: ShaderProfile
  precision: 'highp' | 'mediump'
  replaceSource: (source: string) => ShaderCompileResult
  resize: (quality: ShaderQuality) => void
  draw: (
    clock: ShaderClock,
    mouse: ShaderMouse,
    uniforms: Record<string, UniformBinding>,
  ) => void
  dispose: () => void
}

const vertices = new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1,
])

function runtimeError(profile: ShaderProfile, message: string, raw = message): ShaderCompileResult {
  return {
    ok: false,
    profile,
    diagnostics: [{ severity: 'error', stage: 'runtime', profile, message, raw }],
  }
}

function setUniform(gl: GlContext, program: WebGLProgram, name: string, binding: UniformBinding) {
  const location = gl.getUniformLocation(program, name)
  if (location === null) return
  const value = binding.value as UniformValue
  if (binding.type === 'float') gl.uniform1f(location, value as number)
  else if (binding.type === 'int') gl.uniform1i(location, value as number)
  else if (binding.type === 'bool') gl.uniform1i(location, value ? 1 : 0)
  else if (binding.type === 'vec2') gl.uniform2f(location, ...(value as [number, number]))
  else if (binding.type === 'vec3') gl.uniform3f(location, ...(value as [number, number, number]))
  else gl.uniform4f(location, ...(value as [number, number, number, number]))
}

export function createShaderRuntime(
  canvas: HTMLCanvasElement,
  profile: ShaderProfile,
): ShaderRuntime {
  const contextName = profile === 'webgl2' ? 'webgl2' : 'webgl'
  const gl = canvas.getContext(contextName, {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  }) as GlContext | null
  if (!gl) throw new Error(`无法创建 ${profile === 'webgl2' ? 'WebGL 2' : 'WebGL 1'} context`)

  const precisionInfo = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
  const precision: 'highp' | 'mediump' = precisionInfo && precisionInfo.precision > 0
    ? 'highp'
    : 'mediump'
  const positionBuffer = gl.createBuffer()
  if (!positionBuffer) throw new Error('无法创建全屏几何缓冲区')
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  let activeProgram: WebGLProgram | null = null
  let disposed = false

  const replaceSource = (source: string): ShaderCompileResult => {
    if (disposed) return runtimeError(profile, 'Shader runtime 已释放。')
    if (precision === 'mediump' && /\bprecision\s+highp\s+float\s*;/u.test(source)) {
      return runtimeError(profile, '当前设备的 fragment shader 不支持 highp，请改用 mediump。')
    }
    try {
      const adapted = adaptShaderSource(source, profile, precision)
      const compiled = compileProgram(gl, adapted)
      if (!compiled.ok) return { ok: false, profile, diagnostics: compiled.diagnostics }

      const previous = activeProgram
      activeProgram = compiled.program
      gl.useProgram(activeProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      const position = gl.getAttribLocation(activeProgram, 'aPosition')
      if (position >= 0) {
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      }
      if (previous) gl.deleteProgram(previous)
      return { ok: true, profile }
    } catch (error) {
      return runtimeError(profile, error instanceof Error ? error.message : String(error))
    }
  }

  const resize = (quality: ShaderQuality) => {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality
    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    gl.viewport(0, 0, width, height)
  }

  const draw = (
    clock: ShaderClock,
    mouse: ShaderMouse,
    uniforms: Record<string, UniformBinding>,
  ) => {
    if (!activeProgram || disposed) return
    gl.useProgram(activeProgram)
    const now = new Date()
    const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000
    const builtIns: Record<string, UniformBinding> = {
      iResolution: { type: 'vec3', value: [canvas.width, canvas.height, 1] },
      iTime: { type: 'float', value: clock.time },
      iTimeDelta: { type: 'float', value: clock.delta },
      iFrame: { type: 'int', value: clock.frame },
      iFrameRate: { type: 'float', value: clock.frameRate },
      iMouse: { type: 'vec4', value: mouse },
      iDate: { type: 'vec4', value: [now.getFullYear(), now.getMonth() + 1, now.getDate(), seconds] },
      iSampleRate: { type: 'float', value: 44100 },
    }
    for (const [name, binding] of Object.entries({ ...builtIns, ...uniforms })) {
      setUniform(gl, activeProgram, name, binding)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (activeProgram) gl.deleteProgram(activeProgram)
    gl.deleteBuffer(positionBuffer)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { canvas, profile, precision, replaceSource, resize, draw, dispose }
}

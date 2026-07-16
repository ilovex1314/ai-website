import { parseShaderLog } from './shaderDiagnostics'
import type { AdaptedShader, ShaderDiagnostic } from './shaderTypes'

type GlContext = WebGLRenderingContext | WebGL2RenderingContext

export type ProgramCompileResult =
  | { ok: true; program: WebGLProgram }
  | { ok: false; diagnostics: ShaderDiagnostic[] }

export function compileProgram(gl: GlContext, adapted: AdaptedShader): ProgramCompileResult {
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return {
      ok: false,
      diagnostics: [{
        severity: 'error',
        stage: 'runtime',
        profile: adapted.profile,
        message: '浏览器无法创建 Shader 对象。',
        raw: 'createShader returned null',
      }],
    }
  }

  const compile = (shader: WebGLShader, source: string, stage: 'vertex' | 'fragment') => {
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return []
    const raw = gl.getShaderInfoLog(shader) || `${stage} shader compile failed`
    return parseShaderLog(raw, stage, adapted.profile, stage === 'fragment' ? adapted.userLineOffset : 0)
  }

  const vertexErrors = compile(vertex, adapted.vertexSource, 'vertex')
  const fragmentErrors = vertexErrors.length === 0
    ? compile(fragment, adapted.fragmentSource, 'fragment')
    : []
  if (vertexErrors.length || fragmentErrors.length) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return { ok: false, diagnostics: [...vertexErrors, ...fragmentErrors] }
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return {
      ok: false,
      diagnostics: [{
        severity: 'error',
        stage: 'link',
        profile: adapted.profile,
        message: '浏览器无法创建 WebGL Program。',
        raw: 'createProgram returned null',
      }],
    }
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const raw = gl.getProgramInfoLog(program) || 'program link failed'
    gl.deleteProgram(program)
    return {
      ok: false,
      diagnostics: parseShaderLog(raw, 'link', adapted.profile, adapted.userLineOffset),
    }
  }
  return { ok: true, program }
}

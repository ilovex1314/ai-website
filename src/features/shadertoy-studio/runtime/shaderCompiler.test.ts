import { describe, expect, it, vi } from 'vitest'
import { adaptShaderSource } from './shaderAdapters'
import { compileProgram } from './shaderCompiler'

function fakeGl(fragmentCompiles: boolean) {
  const vertex = { type: 1 }
  const fragment = { type: 2 }
  const program = { id: 'candidate' }
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    createShader: (type: number) => type === 1 ? vertex : fragment,
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: (shader: { type: number }) => shader.type === 1 || fragmentCompiles,
    getShaderInfoLog: () => "ERROR: 0:12: 'bad' : syntax error",
    deleteShader: vi.fn(),
    createProgram: () => program,
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    deleteProgram: vi.fn(),
  }
  return gl as unknown as WebGLRenderingContext
}

describe('compileProgram', () => {
  it('cleans temporary handles after a failed fragment compile', () => {
    const gl = fakeGl(false)
    const result = compileProgram(gl, adaptShaderSource(
      'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'webgl1',
    ))
    expect(result.ok).toBe(false)
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  })

  it('returns a linked candidate and deletes attached shader handles', () => {
    const gl = fakeGl(true)
    const result = compileProgram(gl, adaptShaderSource(
      'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'webgl1',
    ))
    expect(result.ok).toBe(true)
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  })
})

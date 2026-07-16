import { describe, expect, it, vi } from 'vitest'
import { createShaderRuntime } from './shaderRuntime'

function createFakeGl() {
  let fragmentCompiles = true
  const programs: Array<{ id: number }> = []
  const gl = {
    ARRAY_BUFFER: 1,
    STATIC_DRAW: 2,
    FLOAT: 3,
    TRIANGLES: 4,
    FRAGMENT_SHADER: 5,
    VERTEX_SHADER: 6,
    HIGH_FLOAT: 7,
    COMPILE_STATUS: 8,
    LINK_STATUS: 9,
    createBuffer: () => ({}),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getShaderPrecisionFormat: () => ({ precision: 23 }),
    createShader: (type: number) => ({ type }),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: (shader: { type: number }) => shader.type !== 5 || fragmentCompiles,
    getShaderInfoLog: () => 'ERROR: 0:14: invalid source',
    deleteShader: vi.fn(),
    createProgram: () => {
      const program = { id: programs.length + 1 }
      programs.push(program)
      return program
    },
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    deleteProgram: vi.fn(),
    getAttribLocation: () => 0,
    useProgram: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: () => null,
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
    getExtension: () => null,
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    setFragmentCompiles(value: boolean) { fragmentCompiles = value },
    programs,
  }
  return gl
}

describe('createShaderRuntime', () => {
  it('keeps the last successful program after a failed replacement', () => {
    const canvas = document.createElement('canvas')
    const gl = createFakeGl()
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext)
    const runtime = createShaderRuntime(canvas, 'webgl1')

    expect(runtime.replaceSource('void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }').ok).toBe(true)
    const activeProgram = gl.programs[0]
    gl.setFragmentCompiles(false)
    expect(runtime.replaceSource('void mainImage(out vec4 c, in vec2 p) { broken }').ok).toBe(false)
    expect(gl.deleteProgram).not.toHaveBeenCalledWith(activeProgram)
    expect(runtime.precision).toBe('highp')
  })
})

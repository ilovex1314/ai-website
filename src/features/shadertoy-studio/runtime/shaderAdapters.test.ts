import { describe, expect, it } from 'vitest'
import { adaptShaderSource, detectShaderProfile } from './shaderAdapters'

const source = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(fragCoord / iResolution.xy, 0.0, 1.0);
}`

describe('shaderAdapters', () => {
  it('wraps WebGL 1 mainImage without duplicating declared built-ins', () => {
    const adapted = adaptShaderSource(`uniform float iTime;\n${source}`, 'webgl1')
    expect(adapted.vertexSource).toContain('attribute vec2 aPosition')
    expect(adapted.fragmentSource.match(/uniform float iTime;/g)).toHaveLength(1)
    expect(adapted.fragmentSource).toContain('mainImage(gl_FragColor, gl_FragCoord.xy)')
    expect(adapted.userLineOffset).toBeGreaterThan(0)
  })

  it('keeps #version 300 es first and uses an explicit WebGL 2 output', () => {
    const adapted = adaptShaderSource(`#version 300 es\n${source}`, 'webgl2')
    expect(adapted.fragmentSource.startsWith('#version 300 es\n')).toBe(true)
    expect(adapted.fragmentSource).toContain('out vec4 runtimeFragColor;')
    expect(adapted.fragmentSource).toContain('mainImage(runtimeFragColor, gl_FragCoord.xy)')
  })

  it('detects WebGL 2 only when source or preference requires it', () => {
    expect(detectShaderProfile(source, 'auto')).toBe('webgl1')
    expect(detectShaderProfile(`#version 300 es\n${source}`, 'auto')).toBe('webgl2')
    expect(detectShaderProfile(source, 'webgl2')).toBe('webgl2')
  })
})

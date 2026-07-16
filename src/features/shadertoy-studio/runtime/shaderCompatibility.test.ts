import { describe, expect, it } from 'vitest'
import { analyzeShaderCompatibility } from './shaderCompatibility'

describe('analyzeShaderCompatibility', () => {
  it('accepts a self-contained single-pass shader', () => {
    const report = analyzeShaderCompatibility(
      'void mainImage(out vec4 color, in vec2 coord) { color = vec4(coord.xy, 0.0, 1.0); }',
      'auto',
    )
    expect(report.status).toBe('ready')
    expect(report.profile).toBe('webgl1')
    expect(report.canRun).toBe(true)
  })

  it.each([
    'void mainImage(out vec4 c, in vec2 p) { c = texture2D(iChannel0, p); }',
    'vec2 mainSound(int sample, float time) { return vec2(0.0); } void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
    'void mainVR(out vec4 c, in vec2 p, in vec3 o, in vec3 d) { c = vec4(1.0); } void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
    'uniform sampler2D sourceTexture; void mainImage(out vec4 c, in vec2 p) { c = texture2D(sourceTexture, p); }',
  ])('blocks unsupported dependency %s', (shader) => {
    const report = analyzeShaderCompatibility(shader, 'auto')
    expect(report.canRun).toBe(false)
    expect(report.issues.some((issue) => issue.level === 'blocker')).toBe(true)
  })

  it('extracts supported custom uniforms and warns', () => {
    const report = analyzeShaderCompatibility(
      'uniform float glow; uniform vec3 tint; void mainImage(out vec4 c, in vec2 p) { c = vec4(tint * glow, 1.0); }',
      'auto',
    )
    expect(report.status).toBe('warning')
    expect(report.customUniforms.map((item) => [item.name, item.type])).toEqual([
      ['glow', 'float'],
      ['tint', 'vec3'],
    ])
  })

  it('reports iChannel as an unknown external input instead of guessing', () => {
    const report = analyzeShaderCompatibility(
      'void mainImage(out vec4 c, in vec2 p) { c = texture2D(iChannel0, p); }',
      'webgl1',
    )
    expect(report.issues[0].detail).toMatch(/外部输入来源未知/)
  })

  it('ignores unsupported names that only appear in comments', () => {
    const report = analyzeShaderCompatibility(
      '// iChannel0 and mainSound are discussed here\nvoid mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'auto',
    )
    expect(report.canRun).toBe(true)
  })

  it('blocks arrays and an explicit WebGL 1 downgrade of GLSL ES 3.00', () => {
    expect(analyzeShaderCompatibility(
      'uniform float weights[4]; void mainImage(out vec4 c, in vec2 p) { c = vec4(weights[0]); }',
      'auto',
    ).canRun).toBe(false)
    expect(analyzeShaderCompatibility(
      '#version 300 es\nvoid mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
      'webgl1',
    ).canRun).toBe(false)
  })
})

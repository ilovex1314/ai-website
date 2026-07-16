import type { AdaptedShader, ShaderProfile, ShaderProfilePreference } from './shaderTypes'

const builtIns = [
  ['vec3', 'iResolution'],
  ['float', 'iTime'],
  ['float', 'iTimeDelta'],
  ['int', 'iFrame'],
  ['float', 'iFrameRate'],
  ['vec4', 'iMouse'],
  ['vec4', 'iDate'],
  ['float', 'iSampleRate'],
] as const

const webgl1Vertex = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const webgl2Vertex = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

export function detectShaderProfile(
  source: string,
  preference: ShaderProfilePreference,
): ShaderProfile {
  if (preference !== 'auto') return preference
  return /#version\s+300\s+es|\btexture\s*\(|\btexelFetch\s*\(|\blayout\s*\(/u.test(source)
    ? 'webgl2'
    : 'webgl1'
}

function extractVersion(source: string) {
  const match = source.match(/^\s*#version\s+300\s+es\s*\n?/u)
  return {
    source: match ? source.slice(match[0].length) : source,
    version: match ? '#version 300 es' : undefined,
  }
}

function extractPrecision(source: string, defaultPrecision: 'highp' | 'mediump') {
  const pattern = /\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/u
  const match = source.match(pattern)
  return {
    source: match ? source.replace(pattern, '') : source,
    precision: match?.[0] ?? `precision ${defaultPrecision} float;`,
  }
}

function declares(source: string, name: string) {
  return new RegExp(`\\buniform\\s+\\w+\\s+${name}\\s*;`, 'u').test(source)
}

export function adaptShaderSource(
  source: string,
  profile: ShaderProfile,
  defaultPrecision: 'highp' | 'mediump' = 'highp',
): AdaptedShader {
  const extracted = extractVersion(source)
  if (extracted.version && profile !== 'webgl2') {
    throw new Error('GLSL ES 3.00 source requires the webgl2 profile')
  }
  const normalized = extractPrecision(extracted.source, defaultPrecision)
  const version = profile === 'webgl2' ? '#version 300 es' : undefined
  const uniforms = builtIns
    .filter(([, name]) => !declares(normalized.source, name))
    .map(([type, name]) => `uniform ${type} ${name};`)
    .join('\n')
  const output = profile === 'webgl2' ? 'out vec4 runtimeFragColor;' : ''
  const prefix = [version, normalized.precision, uniforms, output].filter(Boolean).join('\n')
  const call = profile === 'webgl2'
    ? 'mainImage(runtimeFragColor, gl_FragCoord.xy);'
    : 'mainImage(gl_FragColor, gl_FragCoord.xy);'
  const fragmentSource = `${prefix}\n${normalized.source.trim()}\nvoid main() {\n  ${call}\n}`
  const prefixLines = prefix.split('\n').length

  return {
    profile,
    vertexSource: profile === 'webgl2' ? webgl2Vertex : webgl1Vertex,
    fragmentSource,
    userLineOffset: prefixLines - (extracted.version ? 1 : 0),
  }
}

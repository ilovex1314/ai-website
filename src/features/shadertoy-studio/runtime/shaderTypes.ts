export type ShaderProfile = 'webgl1' | 'webgl2'
export type ShaderProfilePreference = 'auto' | ShaderProfile
export type UniformKind = 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4'
export type UniformValue =
  | number
  | boolean
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]

export type UniformBinding = {
  type: UniformKind
  value: UniformValue
}

export type ShaderStage = 'analysis' | 'vertex' | 'fragment' | 'link' | 'runtime'
export type ShaderRuntimeStatus =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'error'
  | 'unavailable'
  | 'context-lost'

export type ShaderDiagnostic = {
  severity: 'warning' | 'error'
  stage: ShaderStage
  profile: ShaderProfile
  line?: number
  message: string
  raw: string
}

export type AdaptedShader = {
  profile: ShaderProfile
  vertexSource: string
  fragmentSource: string
  userLineOffset: number
}

export type ShaderCompileRequest = {
  source: string
  profile: ShaderProfile
  revision: number
}

export type ShaderCompileResult =
  | { ok: true; profile: ShaderProfile }
  | { ok: false; profile: ShaderProfile; diagnostics: ShaderDiagnostic[] }

export type TeachingUniformValues = {
  uSpeed: number
  uScale: number
  uIntensity: number
  uPrimaryColor: [number, number, number]
  uSecondaryColor: [number, number, number]
}

export type ShaderHandoff = {
  source: string
  origin: 'gallery' | 'lab'
  title: string
  profile: ShaderProfile
  uniformValues: TeachingUniformValues
  provenance?: {
    sourceUrl?: string
    author?: string
    licenseNote?: string
  }
}

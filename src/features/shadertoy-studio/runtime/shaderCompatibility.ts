import { detectShaderProfile } from './shaderAdapters'
import type { ShaderProfile, ShaderProfilePreference, UniformKind } from './shaderTypes'

export type CompatibilityIssue = {
  id: string
  level: 'ready' | 'warning' | 'blocker'
  title: string
  detail: string
  action: string
}

export type CustomUniformDefinition = { name: string; type: UniformKind }

export type CompatibilityReport = {
  status: 'ready' | 'warning' | 'blocker'
  canRun: boolean
  profile: ShaderProfile
  issues: CompatibilityIssue[]
  customUniforms: CustomUniformDefinition[]
}

const builtInNames = new Set([
  'iResolution',
  'iTime',
  'iTimeDelta',
  'iFrame',
  'iFrameRate',
  'iMouse',
  'iDate',
  'iSampleRate',
])
const supportedTypes = new Set<UniformKind>(['float', 'int', 'bool', 'vec2', 'vec3', 'vec4'])

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/.*$/gmu, '')
}

export function analyzeShaderCompatibility(
  source: string,
  preference: ShaderProfilePreference,
): CompatibilityReport {
  const profile = detectShaderProfile(source, preference)
  const analyzedSource = stripComments(source)
  const issues: CompatibilityIssue[] = []
  const uniformPattern = /\buniform\s+(\w+)\s+(\w+)(\s*\[[^\]]+\])?\s*;/gu
  const uniforms = [...analyzedSource.matchAll(uniformPattern)]
  const customUniforms: CustomUniformDefinition[] = []

  const block = (id: string, title: string, detail: string, action: string) =>
    issues.push({ id, level: 'blocker', title, detail, action } as const)

  if (!/\bvoid\s+mainImage\s*\(/u.test(analyzedSource)) {
    block('missing-main-image', '缺少 mainImage', '源码没有 Shadertoy Image 入口。', '保留 Image tab 的 mainImage 函数。')
  }
  if (/\bvoid\s+main\s*\(/u.test(analyzedSource)) {
    block('host-main', '包含宿主 main', '本地 adapter 会生成 main，重复入口无法安全包装。', '移除 main，只保留 mainImage。')
  }
  if (/\biChannel(?:Time|Resolution|[0-3])\b/u.test(analyzedSource)) {
    block(
      'external-channel',
      '发现 Channel 依赖',
      '外部输入来源未知，可能来自图片、视频、音频、键盘、Cubemap 或 Buffer。',
      '确认来源并建立 texture/framebuffer 管线。',
    )
  }
  if (/\bmainSound\s*\(/u.test(analyzedSource)) {
    block('sound-pipeline', '发现声音入口', '当前 runtime 不提供音频合成管线。', '把声音迁移为独立 Web Audio 实现。')
  }
  if (/\bmainVR\s*\(/u.test(analyzedSource)) {
    block('vr-pipeline', '发现 VR 入口', '当前 runtime 不提供 VR 视图参数。', '改用 WebXR 渲染管线。')
  }
  if (preference === 'webgl1' && /#version\s+300\s+es/u.test(analyzedSource)) {
    block('profile-downgrade', 'WebGL profile 不匹配', 'GLSL ES 3.00 不能静默降级为 WebGL 1。', '选择自动或 WebGL 2。')
  }

  for (const [, rawType, name, arraySuffix] of uniforms) {
    if (builtInNames.has(name)) continue
    if (arraySuffix) {
      block(`uniform-${name}`, '不支持的 uniform 数组', `${name} 使用数组输入。`, '把数组拆成受支持的标量或向量输入。')
    } else if (rawType.startsWith('sampler')) {
      block(`sampler-${name}`, '发现外部纹理', `${name} 需要 ${rawType} 资源。`, '创建并绑定对应 texture 后再迁移。')
    } else if (!supportedTypes.has(rawType as UniformKind)) {
      block(`uniform-${name}`, '不支持的 uniform 类型', `${name} 使用 ${rawType}。`, '把输入拆成 float/int/bool/vec2/vec3/vec4。')
    } else {
      customUniforms.push({ name, type: rawType as UniformKind })
    }
  }

  if (customUniforms.length > 0) {
    issues.push({
      id: 'custom-uniforms',
      level: 'warning',
      title: '需要宿主输入',
      detail: `发现 ${customUniforms.map((item) => item.name).join('、')}。`,
      action: '在运行前设置初始值，并把同一组值写入 React 配方。',
    })
  }
  if (issues.length === 0) {
    issues.push({
      id: 'single-pass-ready',
      level: 'ready',
      title: '单 Pass 可运行',
      detail: '没有发现外部输入。',
      action: '尝试编译并验证画面。',
    })
  }

  const status = issues.some((issue) => issue.level === 'blocker')
    ? 'blocker'
    : issues.some((issue) => issue.level === 'warning')
      ? 'warning'
      : 'ready'
  return { status, canRun: status !== 'blocker', profile, issues, customUniforms }
}

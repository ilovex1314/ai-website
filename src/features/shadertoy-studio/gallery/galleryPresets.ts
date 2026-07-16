import type {
  ShaderHandoff,
  TeachingUniformValues,
  UniformBinding,
} from '../runtime/shaderTypes'
import type { ShaderQuality } from '../runtime/shaderRuntime'

export const teachingUniformHeader = `uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;`

export const gallerySources = {
  'aurora-orbit': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float t = iTime * uSpeed;
  float angle = t * 0.18;
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  p = rotation * p * (0.7 + uScale * 0.12);
  float orbit = abs(length(p) - (0.48 + 0.06 * sin(t)));
  float ring = 1.0 - smoothstep(0.015, 0.08, orbit);
  float wash = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 4.0 + t);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, wash);
  fragColor = vec4(color * (0.08 + ring * uIntensity), 1.0);
}`,
  'liquid-grid': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float t = iTime * uSpeed;
  p *= 1.4 + uScale * 0.35;
  p.x += sin(p.y * 1.8 + t) * 0.28;
  p.y += cos(p.x * 1.5 - t * 0.8) * 0.22;
  vec2 cell = abs(fract(p) - 0.5);
  float grid = 1.0 - smoothstep(0.42, 0.5, min(cell.x, cell.y));
  float pulse = 0.5 + 0.5 * sin((p.x + p.y) * 2.0 - t * 1.4);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, pulse);
  fragColor = vec4(color * grid * uIntensity + color * 0.06, 1.0);
}`,
  'pulse-rings': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  vec2 pointer = iMouse.z > 0.0
    ? (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y
    : vec2(0.0);
  float distanceToPointer = length(p - pointer);
  float wave = 0.5 + 0.5 * cos(distanceToPointer * (12.0 + uScale * 4.0) - iTime * uSpeed * 4.0);
  float rings = smoothstep(0.58, 0.92, wave) * (1.0 - smoothstep(0.2, 1.3, distanceToPointer));
  vec3 color = mix(uPrimaryColor, uSecondaryColor, distanceToPointer);
  fragColor = vec4(color * (0.06 + rings * uIntensity), 1.0);
}`,
  'neon-threads': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float glow = 0.0;
  for (int index = 0; index < 5; index++) {
    float lineIndex = float(index) - 2.0;
    float y = lineIndex * 0.13 + sin(p.x * (uScale + lineIndex * 0.16) + iTime * uSpeed + lineIndex) * 0.12;
    glow += 1.0 - smoothstep(0.01, 0.055, abs(p.y - y));
  }
  float blend = 0.5 + 0.5 * sin(p.x * 2.0 + iTime * 0.25);
  vec3 color = mix(uPrimaryColor, uSecondaryColor, blend);
  fragColor = vec4(color * glow * uIntensity + color * 0.04, 1.0);
}`,
} as const

export type GalleryPresetId = keyof typeof gallerySources
export type GalleryContainer = 'background' | 'hero' | 'card'

export type GalleryPreset = {
  id: GalleryPresetId
  title: string
  eyebrow: string
  description: string
  usage: string
  source: string
  poster: string
}

export const galleryPresets: GalleryPreset[] = [
  { id: 'aurora-orbit', title: 'Aurora Orbit', eyebrow: '旋转 · 距离场', description: '一圈会呼吸的极光轨道，用距离和颜色混合展示像素计算。', usage: '适合 Hero 背景和产品开场。', source: gallerySources['aurora-orbit'], poster: '/images/shadertoy-studio/aurora-orbit.webp' },
  { id: 'liquid-grid', title: 'Liquid Grid', eyebrow: '网格 · 扭曲', description: '让规则网格被正弦波持续扭曲，形成流体般的秩序感。', usage: '适合数据产品背景和章节转场。', source: gallerySources['liquid-grid'], poster: '/images/shadertoy-studio/liquid-grid.webp' },
  { id: 'pulse-rings', title: 'Pulse Rings', eyebrow: '交互 · 波纹', description: '鼠标按下时把指针变成波纹中心，直接观察 iMouse。', usage: '适合交互卡片与操作反馈。', source: gallerySources['pulse-rings'], poster: '/images/shadertoy-studio/pulse-rings.webp' },
  { id: 'neon-threads', title: 'Neon Threads', eyebrow: '循环 · 发光线', description: '五条函数曲线叠加为霓虹丝线，展示循环和软边缘。', usage: '适合音乐、创意工具和品牌视觉。', source: gallerySources['neon-threads'], poster: '/images/shadertoy-studio/neon-threads.webp' },
]

export const galleryDefaults: TeachingUniformValues = {
  uSpeed: 1,
  uScale: 3,
  uIntensity: 1,
  uPrimaryColor: [0.12, 0.74, 1],
  uSecondaryColor: [0.88, 0.18, 0.96],
}

export type GalleryState = {
  presetId: GalleryPresetId
  uniforms: TeachingUniformValues
  container: GalleryContainer
  playing: boolean
  quality: ShaderQuality
  elapsed: number
  compileRevision: number
}

export function createGalleryState(): GalleryState {
  return {
    presetId: 'aurora-orbit',
    uniforms: { ...galleryDefaults },
    container: 'background',
    playing: true,
    quality: 0.75,
    elapsed: 0,
    compileRevision: 1,
  }
}

export function getGalleryPreset(id: GalleryPresetId) {
  return galleryPresets.find((preset) => preset.id === id) ?? galleryPresets[0]
}

export function galleryUniformBindings(state: GalleryState): Record<string, UniformBinding> {
  return {
    uSpeed: { type: 'float', value: state.uniforms.uSpeed },
    uScale: { type: 'float', value: state.uniforms.uScale },
    uIntensity: { type: 'float', value: state.uniforms.uIntensity },
    uPrimaryColor: { type: 'vec3', value: state.uniforms.uPrimaryColor },
    uSecondaryColor: { type: 'vec3', value: state.uniforms.uSecondaryColor },
  }
}

export function galleryHandoff(state: GalleryState): ShaderHandoff {
  const preset = getGalleryPreset(state.presetId)
  return {
    source: preset.source,
    origin: 'gallery',
    title: preset.title,
    profile: 'webgl1',
    uniformValues: state.uniforms,
    provenance: { author: 'AI Creative Lab', licenseNote: 'Original project shader' },
  }
}

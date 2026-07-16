import {
  galleryDefaults,
  gallerySources,
  teachingUniformHeader,
} from '../gallery/galleryPresets'
import type { ShaderQuality } from '../runtime/shaderRuntime'
import type {
  ShaderHandoff,
  TeachingUniformValues,
  UniformBinding,
} from '../runtime/shaderTypes'

const lessonSources = {
  'pixel-color': `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  fragColor = vec4(uv.x, uv.y, 0.35, 1.0);
}`,
  'normalized-circle': `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float circle = 1.0 - smoothstep(0.38, 0.4, length(p));
  vec3 color = mix(vec3(0.03, 0.08, 0.16), vec3(0.2, 0.85, 1.0), circle);
  fragColor = vec4(color, 1.0);
}`,
  'breathing-shape': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  float radius = 0.34 + sin(iTime * uSpeed) * 0.08;
  float shape = 1.0 - smoothstep(radius, radius + 0.035, length(p));
  vec3 color = mix(uSecondaryColor, uPrimaryColor, shape);
  fragColor = vec4(color * (0.08 + shape * uIntensity), 1.0);
}`,
  'mouse-input': `${teachingUniformHeader}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
  vec2 pointer = iMouse.z > 0.0
    ? (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y
    : vec2(0.0);
  float distanceToPointer = length(p - pointer);
  float glow = 1.0 - smoothstep(0.04, 0.5 / max(uScale, 0.5), distanceToPointer);
  vec3 color = mix(uSecondaryColor, uPrimaryColor, glow);
  fragColor = vec4(color * (0.05 + glow * uIntensity), 1.0);
}`,
  'aurora-breakdown': gallerySources['aurora-orbit'],
} as const

export type LessonId = keyof typeof lessonSources
export type LessonConcept = 'fragCoord' | 'iResolution' | 'shape-math' | 'iTime' | 'iMouse-uniforms'

export type PredictionOption = { id: string; label: string }
export type ShaderLesson = {
  id: LessonId
  number: number
  title: string
  concept: LessonConcept
  summary: string
  source: string
  predictionQuestion: string
  predictionOptions: [PredictionOption, PredictionOption, PredictionOption]
  correctPredictionId: string
  explanation: string
  defaultUniforms: TeachingUniformValues
}

export const shaderLessons: ShaderLesson[] = [
  {
    id: 'pixel-color', number: 1, title: '每个像素都有坐标', concept: 'fragCoord',
    summary: 'mainImage 会为画布上的每一个像素执行一次，fragCoord 就是当前像素位置。',
    source: lessonSources['pixel-color'],
    predictionQuestion: '右上角最接近哪种颜色？',
    predictionOptions: [{ id: 'dark', label: '深蓝' }, { id: 'yellow', label: '亮黄' }, { id: 'magenta', label: '洋红' }],
    correctPredictionId: 'yellow',
    explanation: '右上角 uv.x 和 uv.y 都接近 1，所以红、绿通道同时较高。',
    defaultUniforms: { ...galleryDefaults },
  },
  {
    id: 'normalized-circle', number: 2, title: '把分辨率差异消掉', concept: 'iResolution',
    summary: '用 iResolution 把像素坐标归一化，并以画布高度校正宽高比。',
    source: lessonSources['normalized-circle'],
    predictionQuestion: '改变画布宽度后，中心形状会怎样？',
    predictionOptions: [{ id: 'circle', label: '保持圆形' }, { id: 'ellipse', label: '拉成长椭圆' }, { id: 'vanish', label: '消失' }],
    correctPredictionId: 'circle',
    explanation: '坐标除以 iResolution.y，X/Y 使用同一尺度，因此宽屏也保持圆形。',
    defaultUniforms: { ...galleryDefaults },
  },
  {
    id: 'breathing-shape', number: 3, title: '用距离画出软边形状', concept: 'shape-math',
    summary: 'length 计算到中心的距离，smoothstep 把硬边缘变成抗锯齿过渡。',
    source: lessonSources['breathing-shape'],
    predictionQuestion: '提高 uIntensity 主要改变什么？',
    predictionOptions: [{ id: 'size', label: '圆的半径' }, { id: 'brightness', label: '形状亮度' }, { id: 'speed', label: '呼吸速度' }],
    correctPredictionId: 'brightness',
    explanation: '半径由 sin(iTime * uSpeed) 决定，uIntensity 只乘在形状亮度上。',
    defaultUniforms: { ...galleryDefaults },
  },
  {
    id: 'mouse-input', number: 4, title: '让时间与交互进入 Shader', concept: 'iTime',
    summary: 'iTime 持续驱动画面，iMouse 把按下位置映射为和像素一致的坐标。',
    source: lessonSources['mouse-input'],
    predictionQuestion: '没有按下鼠标时，发光中心在哪里？',
    predictionOptions: [{ id: 'center', label: '画布中心' }, { id: 'corner', label: '左下角' }, { id: 'hidden', label: '完全隐藏' }],
    correctPredictionId: 'center',
    explanation: 'iMouse.z 不为正时，pointer 回退到 vec2(0.0)，也就是归一化坐标中心。',
    defaultUniforms: { ...galleryDefaults },
  },
  {
    id: 'aurora-breakdown', number: 5, title: '拆解完整的 Aurora Orbit', concept: 'iMouse-uniforms',
    summary: '把坐标、时间、形状函数和宿主自定义 uniforms 组合成可复用的视觉。',
    source: lessonSources['aurora-breakdown'],
    predictionQuestion: 'uScale 增大后，轨道在画面中看起来怎样？',
    predictionOptions: [{ id: 'smaller', label: '更收紧' }, { id: 'larger', label: '更扩张' }, { id: 'same', label: '不变' }],
    correctPredictionId: 'smaller',
    explanation: 'p 被更大的系数缩放，同一个轨道半径映射到更靠近画面中心的位置。',
    defaultUniforms: { ...galleryDefaults },
  },
]

export type LabDraft = {
  source: string
  uniforms: TeachingUniformValues
  predictionId: string | null
  explanationRevealed: boolean
  compileRevision: number
  lastSuccessfulSource: string
  elapsed: number
}

export type LabState = {
  activeLessonId: LessonId
  drafts: Record<LessonId, LabDraft>
  playing: boolean
  quality: ShaderQuality
}

export function createLabState(): LabState {
  return {
    activeLessonId: 'pixel-color',
    drafts: Object.fromEntries(shaderLessons.map((lesson) => [lesson.id, {
      source: lesson.source,
      uniforms: { ...lesson.defaultUniforms },
      predictionId: null,
      explanationRevealed: false,
      compileRevision: 1,
      lastSuccessfulSource: lesson.source,
      elapsed: 0,
    }])) as Record<LessonId, LabDraft>,
    playing: true,
    quality: 0.75,
  }
}

export function updateLessonDraft(
  state: LabState,
  lessonId: LessonId,
  patch: Partial<LabDraft>,
): LabState {
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [lessonId]: { ...state.drafts[lessonId], ...patch },
    },
  }
}

export function lessonUniformBindings(draft: LabDraft): Record<string, UniformBinding> {
  return {
    uSpeed: { type: 'float', value: draft.uniforms.uSpeed },
    uScale: { type: 'float', value: draft.uniforms.uScale },
    uIntensity: { type: 'float', value: draft.uniforms.uIntensity },
    uPrimaryColor: { type: 'vec3', value: draft.uniforms.uPrimaryColor },
    uSecondaryColor: { type: 'vec3', value: draft.uniforms.uSecondaryColor },
  }
}

export function labHandoff(state: LabState): ShaderHandoff {
  const lesson = shaderLessons.find((item) => item.id === state.activeLessonId) ?? shaderLessons[0]
  const draft = state.drafts[lesson.id]
  return {
    source: draft.source,
    origin: 'lab',
    title: lesson.title,
    profile: 'webgl1',
    uniformValues: draft.uniforms,
    provenance: { author: 'AI Creative Lab', licenseNote: 'Original project shader' },
  }
}

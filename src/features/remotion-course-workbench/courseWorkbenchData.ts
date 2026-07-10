import { demoAnimationActions } from './animationLibraryModel'
import type {
  AnimationAction,
  CourseAsset,
  CourseProject,
  CourseStage,
  CourseWorkbenchState,
  DetectedHyperframesAnimation,
  TimelineSegment,
} from './workbenchTypes'

function bakedRef(ref: TimelineSegment['actionRefs'][number]): TimelineSegment['actionRefs'][number] {
  return {
    ...ref,
    exportRole: 'background-only',
    renderedInBackground: true,
    exportableOverlay: false,
  }
}

const demoProject: CourseProject = {
  id: 'codex-keyframes-tutorial',
  title: 'Codex Keyframes Tutorial',
  platform: '抖音竖屏课程复盘 / Codex 实战',
  aspectRatio: '9:16',
  fps: 30,
  style: '竖屏、深蓝科技感、橙色强调、教程复盘',
  localBridgeMode: 'handoff-only',
}

const demoAssets: CourseAsset[] = [
  {
    id: 'asset-hyperframes-project',
    type: 'export',
    name: 'Codex Keyframes Tutorial HyperFrames Project',
    path: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial',
    status: 'ready',
  },
  {
    id: 'asset-speaker',
    type: 'speaker-video',
    name: 'codex-keyframes-tutorial.mp4',
    path: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    status: 'ready',
  },
  { id: 'asset-slide-001', type: 'slide', name: '001.png', path: 'assets/slides/001.png', status: 'ready' },
  { id: 'asset-slide-002', type: 'slide', name: '002.png', path: 'assets/slides/002.png', status: 'ready' },
  { id: 'asset-slide-003', type: 'slide', name: '003.png', path: 'assets/slides/003.png', status: 'ready' },
  { id: 'asset-slide-004', type: 'slide', name: '004.png', path: 'assets/slides/004.png', status: 'ready' },
  { id: 'asset-captions', type: 'caption', name: 'captions.json', path: 'assets/captions.json', status: 'ready' },
  { id: 'asset-script', type: 'script', name: 'script.md', path: 'assets/script.md', status: 'draft' },
]

const detectedHyperframesAnimations: DetectedHyperframesAnimation[] = [
  {
    id: 'hf-anim-code-highlight',
    compositionId: 'scene-03',
    selector: '#scene-03-code-block',
    actionSignature: 'code-line emphasis with amber background and y entrance',
    label: '代码区域行强调',
    from: 312,
    duration: 84,
    properties: ['opacity', 'y', 'backgroundColor'],
    suggestedActionId: 'code-line-highlight',
  },
  {
    id: 'hf-anim-marker-sweep',
    compositionId: 'scene-02',
    selector: '.metric-card-primary',
    actionSignature: 'marker sweep highlight background',
    label: '关键指标扫光',
    from: 162,
    duration: 64,
    properties: ['backgroundPosition', 'opacity'],
    suggestedActionId: 'marker-sweep',
  },
]

const hyperframesDraftActions: AnimationAction[] = [
  {
    id: 'marker-sweep',
    name: 'HyperFrames 标记扫光',
    category: 'highlight',
    source: 'hyperframes',
    selector: '.metric-card-primary',
    actionSignature: 'marker sweep highlight background',
    description: '由 HyperFrames 项目中的 marker sweep 动画补出的缺失动作草案。',
    status: 'draft',
    version: '0.1.0',
    defaultDurationFrames: 64,
    params: { x: 18, y: 34, width: 36, height: 12, color: '#f59e0b', label: '扫光强调' },
    presets: [
      {
        id: 'hyperframes-marker-sweep',
        label: 'HyperFrames 扫光',
        params: { x: 18, y: 34, width: 36, height: 12, color: '#f59e0b', label: '扫光强调' },
      },
    ],
    implementation: {
      mode: 'custom-component',
      intent: '复用 HyperFrames selector 和 tween 信息，把 marker sweep 沉淀为可绑定动作。',
      componentContract:
        'Read selector/actionSignature from the HyperFrames project manifest and render a reusable marker sweep overlay.',
      outputFiles: [
        'course-assembly/actions.json',
        'src/remotion-course/actions/marker-sweep.tsx',
        'course-assembly/handoff/capcut/overlays/marker-sweep-alpha.webm',
      ],
      acceptance: ['Action is visible in the library', 'Timeline refs can target HyperFrames element ids'],
    },
  },
]

const demoStage: CourseStage = {
  backgroundSource: {
    id: 'hf-codex-keyframes-tutorial',
    sourceKind: 'hyperframes-project',
    name: 'HyperFrames Project: Codex Keyframes Tutorial',
    projectPath: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial',
    entryHtml: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/index.html',
    designFile: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/DESIGN.md',
    assetsDir: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/assets',
    renderedPreview:
      '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    previewMode: 'video',
    sourceAspectRatio: '9:16',
    localPreviewUrl:
      '/@fs/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    structureStatus: {
      status: 'mock',
      scenesParsed: 12,
      elementsParsed: 8,
      animationsDetected: detectedHyperframesAnimations.length,
      missingActionsCreated: hyperframesDraftActions.length,
    },
    audioPolicy: 'muted',
  },
  foregroundSource: {
    id: 'foreground-speaker',
    sourceKind: 'foreground-speaker-video',
    name: '前台区口播视频 codex-keyframes-tutorial.mp4',
    path: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    localPreviewUrl:
      '/@fs/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    durationFrames: 4740,
    audioPolicy: 'primary',
  },
  foregroundWindow: {
    x: 65,
    y: 55,
    width: 20,
    height: 18,
    shape: 'rounded',
    opacity: 1,
  },
  canvasAspectRatio: '9:16',
  elements: [
    {
      id: 'element-video-title',
      source: 'hyperframes',
      compositionId: 's1',
      selector: '#s1 h1',
      kind: 'title',
      label: '视频标题',
      frameRange: [0, 210],
      box: { x: 12, y: 22, width: 74, height: 16 },
    },
    {
      id: 'element-video-eyebrow',
      source: 'hyperframes',
      compositionId: 's1',
      selector: '#s1 .eyebrow',
      kind: 'caption',
      label: '玩转 AI · Codex 实战',
      frameRange: [0, 210],
      box: { x: 12, y: 15, width: 48, height: 6 },
    },
    {
      id: 'element-flow-node',
      source: 'hyperframes',
      compositionId: 'scene-02',
      selector: '.metric-card-primary',
      kind: 'flow-node',
      label: '关键指标卡片',
      frameRange: [120, 270],
      box: { x: 18, y: 34, width: 36, height: 18 },
    },
    {
      id: 'element-code-sample',
      source: 'hyperframes',
      compositionId: 'scene-03',
      selector: '#scene-03-code-block',
      kind: 'code',
      label: '代码示例区域',
      frameRange: [900, 2700],
      box: { x: 12, y: 28, width: 58, height: 38 },
    },
  ],
}

const demoTimeline: TimelineSegment[] = [
  {
    id: 'seg-intro',
    title: '首屏标题：Codex 实战',
    from: 0,
    duration: 210,
    slide: 1,
    speaker: 'right-bottom',
    caption: '玩转 AI · Codex 实战：12 张分镜图怎么做成视频？',
    actionRefs: [
      {
        id: 'ref-title-circle-mark',
        actionId: 'circle-mark',
        presetId: 'warning-circle',
        elementId: 'element-video-title',
        from: 18,
        duration: 150,
        fadeInFrames: 8,
        fadeOutFrames: 10,
        exportRole: 'platform-overlay',
        renderedInBackground: false,
        exportableOverlay: true,
      },
      bakedRef({ id: 'ref-intro-lower-third', actionId: 'lower-third', presetId: 'course-title', from: 0, duration: 90 }),
      bakedRef({ id: 'ref-intro-progress', actionId: 'course-progress', presetId: 'bottom-progress', from: 0, duration: 210 }),
    ],
  },
  {
    id: 'seg-concept',
    title: '输入素材与问题定义',
    from: 210,
    duration: 690,
    slide: 2,
    speaker: 'right-half',
    caption: '不是视频，只有关键帧；核心是把静态分镜拆成可讲解的视频结构。',
    actionRefs: [
      bakedRef({ id: 'ref-concept-arrow', actionId: 'arrow-callout', presetId: 'teal-arrow', from: 12, duration: 90 }),
      bakedRef({ id: 'ref-concept-text-card', actionId: 'text-card', presetId: 'concept-card', from: 44, duration: 100 }),
      bakedRef({ id: 'ref-concept-spotlight', actionId: 'spotlight-mask', presetId: 'soft-spotlight', from: 24, duration: 96 }),
    ],
  },
  {
    id: 'seg-code-demo',
    title: '工具边界与实现演示',
    from: 900,
    duration: 1800,
    slide: 3,
    speaker: 'left-bottom',
    caption: 'HyperFrames 负责排版、配音、字幕和竖屏合成；动作标注负责讲解重点。',
    actionRefs: [
      bakedRef({ id: 'ref-code-cursor', actionId: 'cursor-click', presetId: 'click-ripple', from: 10, duration: 48 }),
      bakedRef({ id: 'ref-code-highlight', actionId: 'code-line-highlight', presetId: 'amber-code-line', from: 42, duration: 96 }),
      bakedRef({ id: 'ref-code-step', actionId: 'step-reveal', presetId: 'right-steps', from: 70, duration: 110 }),
    ],
  },
  {
    id: 'seg-wrap',
    title: '发布版与后续升级',
    from: 2700,
    duration: 2040,
    slide: 4,
    speaker: 'right-bottom',
    caption: '先做可发布版本，再把 I2V、关键动作帧和二次剪辑作为后续升级。',
    actionRefs: [
      bakedRef({ id: 'ref-wrap-before-after', actionId: 'before-after-wipe', presetId: 'horizontal-wipe', from: 8, duration: 110 }),
      bakedRef({ id: 'ref-wrap-transition', actionId: 'chapter-transition', presetId: 'clean-wipe', from: 112, duration: 75 }),
    ],
  },
]

export function createDefaultCourseWorkbenchState(): CourseWorkbenchState {
  return {
    project: demoProject,
    stage: demoStage,
    playback: {
      currentFrame: 0,
      totalFrames: 4740,
      isPlaying: false,
    },
    assets: demoAssets,
    timeline: demoTimeline,
    actions: [...demoAnimationActions, ...hyperframesDraftActions],
    detectedHyperframesAnimations,
    selectedSegmentId: 'seg-intro',
    selectedActionId: 'circle-mark',
    selectedElementId: undefined,
    categoryFilter: 'all',
    reviewNote: '',
    handoffRequests: [],
  }
}

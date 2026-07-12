import type {
  ActionParams,
  ActionAssetKind,
  AnimationAction,
  AnimationActionCategory,
  AnimationImplementation,
} from './workbenchTypes'

export const actionCategoryLabels: Record<AnimationActionCategory, string> = {
  highlight: '高亮框',
  arrow: '箭头',
  circle: '圈注',
  'text-card': '重点文字卡',
  'lower-third': '章节标题条',
  zoom: '局部聚焦',
  progress: '课程进度条',
  'step-reveal': '步骤揭示',
  cursor: '光标点击',
  code: '代码行高亮',
  comparison: '前后对比',
  spotlight: '遮罩聚光',
  transition: '章节转场',
}

export function createDefaultActionParams(category: AnimationActionCategory): ActionParams {
  switch (category) {
    case 'highlight':
      return { x: 16, y: 28, width: 42, height: 18, color: '#2563eb', label: '关键定义' }
    case 'arrow':
      return { fromX: 24, fromY: 66, toX: 58, toY: 42, color: '#0f766e', label: '看这里' }
    case 'circle':
      return { x: 14, y: 21, width: 58, height: 18, radius: 18, color: '#ef4444', label: '圈出标题' }
    case 'text-card':
      return { x: 12, y: 60, width: 34, height: 18, color: '#f59e0b', text: '先给结论，再解释原因' }
    case 'lower-third':
      return { x: 6, y: 76, width: 48, height: 14, color: '#0f766e', title: '第一章 核心概念', subtitle: '课程动画库 MVP' }
    case 'zoom':
      return { x: 48, y: 34, width: 34, height: 24, scale: 1.24, color: '#7c3aed', label: '局部放大' }
    case 'progress':
      return { x: 8, y: 90, width: 84, height: 3, progress: 36, color: '#2563eb', label: '学习进度' }
    case 'step-reveal':
      return { x: 58, y: 24, width: 30, height: 44, step: 2, totalSteps: 4, color: '#0f766e', label: '第 2 步' }
    case 'cursor':
      return { x: 52, y: 46, width: 12, height: 12, color: '#111827', label: '点击' }
    case 'code':
      return { x: 14, y: 34, width: 70, height: 8, line: 6, color: '#f59e0b', label: '关键代码行' }
    case 'comparison':
      return { x: 50, y: 18, width: 4, height: 68, direction: 'left-to-right', color: '#2563eb', label: 'Before / After' }
    case 'spotlight':
      return { x: 38, y: 30, width: 28, height: 24, scale: 1.08, color: '#0f172a', label: '聚光区域' }
    case 'transition':
      return { x: 0, y: 0, width: 100, height: 100, effect: 'wipe', color: '#2563eb', title: '下一章', subtitle: '案例拆解' }
  }
}

function defaultAssetKind(category: AnimationActionCategory): ActionAssetKind {
  if (['arrow', 'text-card', 'lower-third', 'progress', 'step-reveal', 'cursor', 'transition'].includes(category)) {
    return 'add-element-with-animation'
  }

  return 'animate-existing-element'
}

function createAction(
  action: Omit<AnimationAction, 'assetKind'> & { assetKind?: ActionAssetKind },
): AnimationAction {
  return { ...action, assetKind: action.assetKind ?? defaultAssetKind(action.category) }
}

function parametricImplementation(intent: string): AnimationImplementation {
  return {
    mode: 'parametric',
    intent,
    componentContract: 'Use existing Remotion action component and update params/presets only.',
    outputFiles: ['course-assembly/actions.json'],
    acceptance: ['Preview reflects params immediately', 'Timeline refs remain compatible'],
  }
}

function llmAssistedImplementation(intent: string): AnimationImplementation {
  return {
    mode: 'llm-assisted',
    intent,
    componentContract:
      'Codex 负责理解意图和生成实现：补全 schema、Remotion component contract、preview fixture 和 export strategy。',
    outputFiles: [
      'course-assembly/actions.json',
      'src/remotion-course/actions/<action-id>.tsx',
      'course-assembly/handoff/capcut/overlays/<action-id>-alpha.webm',
    ],
    acceptance: [
      '复杂动画可通过自然语言意图复现',
      '生成实现必须回写项目动作库',
      '仍能导出 Remotion/CapCut handoff',
    ],
  }
}

function customComponentImplementation(intent: string): AnimationImplementation {
  return {
    mode: 'custom-component',
    intent,
    componentContract:
      'Use a dedicated Remotion component with typed props, preview fixture, export test, and transparent overlay support.',
    outputFiles: [
      'course-assembly/actions.json',
      'src/remotion-course/actions/<action-id>.tsx',
      'src/remotion-course/actions/<action-id>.fixture.ts',
      'course-assembly/handoff/capcut/overlays/<action-id>-alpha.webm',
    ],
    acceptance: [
      'Component props are documented and versioned',
      'Preview fixture covers the default course scene',
      'Transparent overlay export remains aligned with timeline',
    ],
  }
}

export const demoAnimationActions: AnimationAction[] = [
  createAction({
    id: 'highlight-box',
    name: '蓝色定义高亮框',
    category: 'highlight',
    description: '强调 PPT 中的概念定义、公式或关键区域。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 90,
    params: createDefaultActionParams('highlight'),
    implementation: parametricImplementation('强调 PPT 中的概念定义、公式或关键区域。'),
    presets: [
      {
        id: 'blue-focus',
        label: '蓝色聚焦',
        params: createDefaultActionParams('highlight'),
      },
    ],
  }),
  createAction({
    id: 'pointing-arrow',
    name: '指向',
    category: 'arrow',
    assetKind: 'add-element-with-animation',
    description: '新增一个箭头元素，尖端锚定目标 DOM，尾部可在画布拖拽。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 90,
    params: {
      color: '#2563eb',
      label: '指向重点',
      arrowShape: 'straight',
      offsetX: -260,
      offsetY: 160,
      widthDelta: 0,
      heightDelta: 0,
      arrowTailAnchorX: 0.08,
      arrowTailAnchorY: 0.5,
      arrowTipAnchorX: 0.92,
      arrowTipAnchorY: 0.5,
    },
    implementation: customComponentImplementation('创建独立箭头覆盖元素，尖端持续锚定目标 DOM，尾部支持拖拽和缩放。'),
    presets: [
      { id: 'straight', label: '直线箭头', params: { arrowShape: 'straight', color: '#2563eb' } },
      { id: 'curve', label: '曲线箭头', params: { arrowShape: 'curve', color: '#2563eb' } },
      { id: 'elbow', label: '折线箭头', params: { arrowShape: 'elbow', color: '#2563eb' } },
    ],
  }),
  createAction({
    id: 'arrow-callout',
    name: '流程节点箭头',
    category: 'arrow',
    description: '指向流程图、表格或图片中的关键节点。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 75,
    params: createDefaultActionParams('arrow'),
    implementation: parametricImplementation('指向流程图、表格或图片中的关键节点。'),
    presets: [{ id: 'teal-arrow', label: '青色指向', params: createDefaultActionParams('arrow') }],
  }),
  createAction({
    id: 'circle-mark',
    name: '红色圈注',
    category: 'circle',
    description: '圈出错误点、重点数字或需要观众记住的位置。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 80,
    params: createDefaultActionParams('circle'),
    implementation: parametricImplementation('圈出错误点、重点数字或需要观众记住的位置。'),
    presets: [{ id: 'warning-circle', label: '警示圈注', params: createDefaultActionParams('circle') }],
  }),
  createAction({
    id: 'text-card',
    name: '重点文字卡片',
    category: 'text-card',
    description: '弹出一句解释、总结或记忆点。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 120,
    params: createDefaultActionParams('text-card'),
    implementation: parametricImplementation('弹出一句解释、总结或记忆点。'),
    presets: [{ id: 'concept-card', label: '概念卡', params: createDefaultActionParams('text-card') }],
  }),
  createAction({
    id: 'lower-third',
    name: '章节标题条',
    category: 'lower-third',
    description: '切换章节、讲师或当前概念标题。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 100,
    params: createDefaultActionParams('lower-third'),
    implementation: parametricImplementation('切换章节、讲师或当前概念标题。'),
    presets: [{ id: 'course-title', label: '课程标题', params: createDefaultActionParams('lower-third') }],
  }),
  createAction({
    id: 'slide-zoom',
    name: 'PPT 局部聚焦',
    category: 'zoom',
    description: '用缩放和裁切模拟 Remotion 中的局部聚焦镜头。',
    status: 'draft',
    version: '1.0.0',
    defaultDurationFrames: 100,
    params: createDefaultActionParams('zoom'),
    implementation: llmAssistedImplementation(
      '根据讲解重点识别需要放大的 PPT 区域，生成平移、缩放、遮罩和节奏更自然的局部聚焦动画。',
    ),
    presets: [{ id: 'soft-zoom', label: '柔和聚焦', params: createDefaultActionParams('zoom') }],
  }),
  createAction({
    id: 'course-progress',
    name: '课程进度条',
    category: 'progress',
    description: '在长教程中提示当前章节进度和学习完成度。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 180,
    params: createDefaultActionParams('progress'),
    implementation: parametricImplementation('在长教程中提示当前章节进度和学习完成度。'),
    presets: [{ id: 'bottom-progress', label: '底部细进度', params: createDefaultActionParams('progress') }],
  }),
  createAction({
    id: 'step-reveal',
    name: '步骤逐项揭示',
    category: 'step-reveal',
    description: '按讲解节奏逐步显示流程、清单或方法论步骤。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 120,
    params: createDefaultActionParams('step-reveal'),
    implementation: customComponentImplementation('按讲解节奏逐步显示流程、清单或方法论步骤。'),
    presets: [{ id: 'right-steps', label: '右侧步骤卡', params: createDefaultActionParams('step-reveal') }],
  }),
  createAction({
    id: 'cursor-click',
    name: '光标点击提示',
    category: 'cursor',
    description: '模拟软件教程中的鼠标移动、点击涟漪和按钮确认。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 60,
    params: createDefaultActionParams('cursor'),
    implementation: parametricImplementation('模拟软件教程中的鼠标移动、点击涟漪和按钮确认。'),
    presets: [{ id: 'click-ripple', label: '点击涟漪', params: createDefaultActionParams('cursor') }],
  }),
  createAction({
    id: 'code-line-highlight',
    name: '代码行高亮',
    category: 'code',
    description: '在编程课程中突出当前讲解的代码行、diff 或配置项。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 100,
    params: createDefaultActionParams('code'),
    implementation: customComponentImplementation('在编程课程中突出当前讲解的代码行、diff 或配置项。'),
    presets: [{ id: 'amber-code-line', label: '琥珀代码行', params: createDefaultActionParams('code') }],
  }),
  createAction({
    id: 'before-after-wipe',
    name: '前后对比擦除',
    category: 'comparison',
    description: '展示修改前后、错误与正确示例、优化前后效果。',
    status: 'draft',
    version: '0.9.0',
    defaultDurationFrames: 110,
    params: createDefaultActionParams('comparison'),
    implementation: llmAssistedImplementation('识别两个状态的对比重点，生成可控的左右擦除、分屏和说明标签。'),
    presets: [{ id: 'horizontal-wipe', label: '横向擦除', params: createDefaultActionParams('comparison') }],
  }),
  createAction({
    id: 'spotlight-mask',
    name: '遮罩聚光讲解',
    category: 'spotlight',
    description: '压暗无关区域，只保留当前讲解区域的视觉注意力。',
    status: 'draft',
    version: '0.9.0',
    defaultDurationFrames: 100,
    params: createDefaultActionParams('spotlight'),
    implementation: llmAssistedImplementation('根据字幕语义和 PPT 内容选择聚光区域，生成遮罩、羽化和跟随移动。'),
    presets: [{ id: 'soft-spotlight', label: '柔和遮罩', params: createDefaultActionParams('spotlight') }],
  }),
  createAction({
    id: 'chapter-transition',
    name: '章节转场卡',
    category: 'transition',
    description: '在课程章节之间加入短促、克制的标题转场。',
    status: 'ready',
    version: '1.0.0',
    defaultDurationFrames: 75,
    params: createDefaultActionParams('transition'),
    implementation: customComponentImplementation('在课程章节之间加入短促、克制的标题转场。'),
    presets: [{ id: 'clean-wipe', label: '干净擦入', params: createDefaultActionParams('transition') }],
  }),
]

export function createNewAnimationAction(category: AnimationActionCategory, index: number): AnimationAction {
  const label = actionCategoryLabels[category]
  const params = createDefaultActionParams(category)

  return {
    id: `custom-${category}-${index}`,
    name: `新建${label}动作`,
    category,
    assetKind: defaultAssetKind(category),
    description: `用于课程视频中的${label}教学标注。`,
    status: 'draft',
    version: '0.1.0',
    defaultDurationFrames: 90,
    params,
    implementation: parametricImplementation(`用于课程视频中的${label}教学标注。`),
    presets: [{ id: `default-${category}`, label: '默认样式', params }],
  }
}

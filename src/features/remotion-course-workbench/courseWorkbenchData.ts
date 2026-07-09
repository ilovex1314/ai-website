import { demoAnimationActions } from './animationLibraryModel'
import type { CourseAsset, CourseProject, CourseWorkbenchState, TimelineSegment } from './workbenchTypes'

const demoProject: CourseProject = {
  id: 'course-template-demo',
  title: '知识课程口播动画库 Demo',
  platform: 'B 站课程 / 训练营录播',
  aspectRatio: '16:9',
  fps: 30,
  style: '干净、清晰、信息密度适中',
  localBridgeMode: 'handoff-only',
}

const demoAssets: CourseAsset[] = [
  { id: 'asset-speaker', type: 'speaker-video', name: 'speaker.mp4', path: 'assets/speaker.mp4', status: 'ready' },
  { id: 'asset-slide-001', type: 'slide', name: '001.png', path: 'assets/slides/001.png', status: 'ready' },
  { id: 'asset-slide-002', type: 'slide', name: '002.png', path: 'assets/slides/002.png', status: 'ready' },
  { id: 'asset-slide-003', type: 'slide', name: '003.png', path: 'assets/slides/003.png', status: 'ready' },
  { id: 'asset-slide-004', type: 'slide', name: '004.png', path: 'assets/slides/004.png', status: 'ready' },
  { id: 'asset-captions', type: 'caption', name: 'captions.json', path: 'assets/captions.json', status: 'ready' },
  { id: 'asset-script', type: 'script', name: 'script.md', path: 'assets/script.md', status: 'draft' },
]

const demoTimeline: TimelineSegment[] = [
  {
    id: 'seg-intro',
    title: '开场与课程目标',
    from: 0,
    duration: 120,
    slide: 1,
    speaker: 'right-bottom',
    caption: '今天我们把口播课程变成可复用的动画模板。',
    actionRefs: [
      { actionId: 'lower-third', presetId: 'course-title', from: 0, duration: 90 },
      { actionId: 'highlight-box', presetId: 'blue-focus', from: 24, duration: 80 },
      { actionId: 'course-progress', presetId: 'bottom-progress', from: 0, duration: 120 },
    ],
  },
  {
    id: 'seg-concept',
    title: '解释核心概念',
    from: 120,
    duration: 150,
    slide: 2,
    speaker: 'right-half',
    caption: '第一层是管理台，它让素材、动作和时间轴先被看懂。',
    actionRefs: [
      { actionId: 'arrow-callout', presetId: 'teal-arrow', from: 12, duration: 90 },
      { actionId: 'text-card', presetId: 'concept-card', from: 44, duration: 100 },
      { actionId: 'spotlight-mask', presetId: 'soft-spotlight', from: 24, duration: 96 },
    ],
  },
  {
    id: 'seg-code-demo',
    title: '软件操作与代码演示',
    from: 270,
    duration: 180,
    slide: 3,
    speaker: 'left-bottom',
    caption: '第二个场景是软件教程，光标点击、代码行高亮和步骤揭示都应该能复用。',
    actionRefs: [
      { actionId: 'cursor-click', presetId: 'click-ripple', from: 10, duration: 48 },
      { actionId: 'code-line-highlight', presetId: 'amber-code-line', from: 42, duration: 96 },
      { actionId: 'step-reveal', presetId: 'right-steps', from: 70, duration: 110 },
    ],
  },
  {
    id: 'seg-before-after',
    title: '优化前后对比',
    from: 450,
    duration: 150,
    slide: 4,
    speaker: 'right-bottom',
    caption: '最后用前后对比和章节转场，把人工确认过的动画沉淀成下一次自动生成的样例。',
    actionRefs: [
      { actionId: 'before-after-wipe', presetId: 'horizontal-wipe', from: 8, duration: 110 },
      { actionId: 'chapter-transition', presetId: 'clean-wipe', from: 112, duration: 75 },
    ],
  },
]

export function createDefaultCourseWorkbenchState(): CourseWorkbenchState {
  return {
    project: demoProject,
    assets: demoAssets,
    timeline: demoTimeline,
    actions: demoAnimationActions,
    selectedSegmentId: 'seg-intro',
    selectedActionId: 'highlight-box',
    categoryFilter: 'all',
    reviewNote: '',
    handoffRequests: [],
  }
}

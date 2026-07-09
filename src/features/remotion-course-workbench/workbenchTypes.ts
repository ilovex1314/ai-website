export type AnimationActionCategory =
  | 'highlight'
  | 'arrow'
  | 'circle'
  | 'text-card'
  | 'lower-third'
  | 'zoom'
  | 'progress'
  | 'step-reveal'
  | 'cursor'
  | 'code'
  | 'comparison'
  | 'spotlight'
  | 'transition'

export type AnimationActionStatus = 'draft' | 'ready' | 'deprecated'

export type SpeakerLayout = 'right-bottom' | 'left-bottom' | 'right-half' | 'left-half'

export type ActionParams = {
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  scale?: number
  color?: string
  label?: string
  text?: string
  title?: string
  subtitle?: string
  fromX?: number
  fromY?: number
  toX?: number
  toY?: number
  progress?: number
  step?: number
  totalSteps?: number
  line?: number
  direction?: string
  effect?: string
}

export type AnimationPreset = {
  id: string
  label: string
  params: ActionParams
}

export type AnimationImplementationMode = 'parametric' | 'llm-assisted' | 'custom-component'

export type AnimationImplementation = {
  mode: AnimationImplementationMode
  intent: string
  componentContract: string
  outputFiles: string[]
  acceptance: string[]
}

export type AnimationAction = {
  id: string
  name: string
  category: AnimationActionCategory
  description: string
  status: AnimationActionStatus
  version: string
  defaultDurationFrames: number
  params: ActionParams
  presets: AnimationPreset[]
  implementation: AnimationImplementation
}

export type CoursePackageFile = {
  path: string
  kind: 'json' | 'media' | 'caption' | 'guide' | 'csv'
  description: string
}

export type AnimationActionRef = {
  actionId: string
  presetId?: string
  from: number
  duration: number
  params?: ActionParams
}

export type TimelineSegment = {
  id: string
  title: string
  from: number
  duration: number
  slide: number
  speaker: SpeakerLayout
  caption: string
  actionRefs: AnimationActionRef[]
}

export type CourseProject = {
  id: string
  title: string
  platform: string
  aspectRatio: '16:9' | '9:16'
  fps: number
  style: string
  localBridgeMode: 'handoff-only' | 'bridge-ready'
}

export type CourseAsset = {
  id: string
  type: 'speaker-video' | 'slide' | 'caption' | 'script' | 'export'
  name: string
  path: string
  status: 'ready' | 'missing' | 'draft'
}

export type CodexHandoffRequest = {
  id: string
  environment: 'local-only'
  projectPath: string
  createdAt: string
  action: AnimationAction
  segment: TimelineSegment
  reviewNote: string
  prompt: string
}

export type CourseProjectPackage = {
  root: 'course-project/'
  files: CoursePackageFile[]
  manifest: {
    primarySource: 'project-files'
    renderTargets: Array<'remotion' | 'hyperframes' | 'ffmpeg'>
    capcutHandoff: string
    projectId: string
    actionCount: number
    segmentCount: number
  }
}

export type CapCutHandoffPackage = {
  root: 'course-project/exports/capcut-handoff/'
  files: CoursePackageFile[]
  guide: string
  manifest: {
    tracks: Array<'master' | 'clean-ppt' | 'speaker-pip' | 'overlays' | 'captions'>
    sourceProject: string
    overlayCount: number
  }
}

export type CourseWorkbenchState = {
  project: CourseProject
  assets: CourseAsset[]
  timeline: TimelineSegment[]
  actions: AnimationAction[]
  selectedSegmentId: string
  selectedActionId: string
  categoryFilter: AnimationActionCategory | 'all'
  reviewNote: string
  handoffRequests: CodexHandoffRequest[]
}

export type CourseWorkbenchAction =
  | { type: 'select-segment'; id: string }
  | { type: 'select-action'; id: string }
  | { type: 'set-category-filter'; category: AnimationActionCategory | 'all' }
  | { type: 'create-action'; category: AnimationActionCategory }
  | { type: 'update-action'; id: string; patch: Partial<Omit<AnimationAction, 'id' | 'category'>> }
  | { type: 'duplicate-action'; id: string }
  | { type: 'delete-action'; id: string }
  | { type: 'move-selected-action'; x: number; y: number }
  | { type: 'set-review-note'; note: string }
  | { type: 'generate-handoff' }

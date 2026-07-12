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
  borderRadius?: number
  scale?: number
  color?: string
  backgroundColor?: string
  backgroundOpacity?: number
  label?: string
  text?: string
  title?: string
  subtitle?: string
  fromX?: number
  fromY?: number
  toX?: number
  toY?: number
  offsetX?: number
  offsetY?: number
  widthDelta?: number
  heightDelta?: number
  progress?: number
  step?: number
  totalSteps?: number
  line?: number
  direction?: string
  effect?: string
  arrowShape?: PointingArrowShape
  arrowImageUrl?: string
  arrowImageAspectRatio?: number
  arrowTailAnchorX?: number
  arrowTailAnchorY?: number
  arrowTipAnchorX?: number
  arrowTipAnchorY?: number
}

export type AnimationPreset = {
  id: string
  label: string
  params: ActionParams
}

export type AnimationImplementationMode = 'parametric' | 'llm-assisted' | 'custom-component'

export type ActionAssetKind = 'animate-existing-element' | 'add-element-with-animation'

export type PointingArrowShape = 'straight' | 'curve' | 'elbow' | 'custom-image'

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
  assetKind: ActionAssetKind
  source?: 'manual' | 'hyperframes'
  selector?: string
  actionSignature?: string
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
  id?: string
  actionId: string
  presetId?: string
  from: number
  duration: number
  fadeInFrames?: number
  fadeOutFrames?: number
  exportRole?: 'platform-overlay' | 'hyperframes-internal' | 'background-only'
  renderedInBackground?: boolean
  exportableOverlay?: boolean
  elementId?: string
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
  aspectRatio: CanvasAspectRatio
  fps: number
  style: string
  localBridgeMode: 'handoff-only' | 'bridge-ready'
}

export type CanvasAspectRatio = '16:9' | '4:3' | '9:16'

export type HyperframesProjectSource = {
  id: string
  sourceKind: 'hyperframes-project'
  name: string
  projectPath: string
  entryHtml: string
  designFile?: string
  assetsDir: string
  renderedPreview?: string
  previewMode: 'video' | 'mock' | 'still'
  sourceAspectRatio: CanvasAspectRatio
  localPreviewUrl?: string
  posterUrl?: string
  structureStatus: {
    status: 'mock' | 'parsed' | 'missing'
    scenesParsed: number
    elementsParsed: number
    animationsDetected: number
    missingActionsCreated: number
  }
  audioPolicy: 'muted'
}

export type ForegroundVideoSource = {
  id: string
  sourceKind: 'foreground-speaker-video'
  name: string
  path: string
  localPreviewUrl?: string
  posterUrl?: string
  durationFrames: number
  audioPolicy: 'primary'
}

export type StageElementKind =
  | 'title'
  | 'paragraph'
  | 'code'
  | 'chart'
  | 'image'
  | 'flow-node'
  | 'caption'
  | 'unknown'

export type StageElement = {
  id: string
  source: 'hyperframes'
  compositionId: string
  selector: string
  kind: StageElementKind
  label: string
  frameRange: [number, number]
  box: { x: number; y: number; width: number; height: number }
  boxesByAspect?: Partial<Record<CanvasAspectRatio, { x: number; y: number; width: number; height: number }>>
}

export type HyperframesImportPayload = {
  project: {
    id: string
    title: string
    fps: number
    durationFrames: number
    activeAspectRatio: CanvasAspectRatio
    source: {
      background: {
        id: string
        projectPath: string
        entryHtml: string
        assetsDir: string
        sourceAspectRatio: CanvasAspectRatio
        durationFrames?: number
        mediaUrl?: string
      }
      foreground?: {
        id: string
        mediaUrl: string
        durationFrames: number
        audioPolicy: 'primary'
        window: ForegroundWindow
      }
    }
  }
  sourceDimensions: { width: number; height: number }
  sceneMap: Record<string, {
    id: string
    fromFrame: number
    durationFrames: number
  }>
  elementMap: Record<string, {
    id: string
    sceneId: string
    role: string
    selector: string
    text: string
    visibility: { fromFrame: number; toFrame: number }
    rectsByAspect: Partial<Record<CanvasAspectRatio, { x: number; y: number; width: number; height: number }>>
  }>
  bakedAnimationMap: Record<string, {
    id: string
    sceneId: string
    elementId: string
    fromFrame: number
    durationFrames: number
    kind: string
    properties: string[]
    ease?: string
    exportRole: 'baked-internal'
  }>
}

export type DetectedHyperframesAnimation = {
  id: string
  elementId: string
  compositionId: string
  selector: string
  actionSignature: string
  label: string
  from: number
  duration: number
  properties: string[]
  ease?: string
  suggestedActionId: string
}

export type HyperframesAnimationOverride = {
  animationId: string
  operation: 'modify' | 'disable'
  fromFrame?: number
  durationFrames?: number
  ease?: string
  fallback?: 'show-final-state-at-start' | 'keep-base-state'
}

export type ForegroundWindow = {
  x: number
  y: number
  width: number
  height: number
  shape: 'rounded' | 'circle' | 'portrait' | 'rect'
  opacity: number
}

export type CourseStage = {
  backgroundSource: HyperframesProjectSource
  foregroundSource: ForegroundVideoSource
  foregroundWindow: ForegroundWindow
  canvasAspectRatio: CanvasAspectRatio
  elements: StageElement[]
}

export type PlaybackState = {
  currentFrame: number
  totalFrames: number
  isPlaying: boolean
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

export type CourseAssemblyManifest = {
  root: 'course-assembly/'
  files: CoursePackageFile[]
  manifest: {
    scope: 'assembly-only'
    includes: Array<'inputs' | 'element-map' | 'actions' | 'timeline' | 'foreground-window' | 'handoff'>
    renderTargets: Array<'remotion' | 'hyperframes' | 'ffmpeg'>
    capcutHandoff: string
    projectId: string
    actionCount: number
    segmentCount: number
  }
}

export type CapCutHandoffPackage = {
  root: 'course-assembly/handoff/capcut/'
  files: CoursePackageFile[]
  guide: string
  manifest: {
    tracks: Array<'master' | 'background' | 'foreground' | 'overlays' | 'captions'>
    sourceProject: string
    overlayCount: number
  }
}

export type CourseWorkbenchState = {
  project: CourseProject
  stage: CourseStage
  playback: PlaybackState
  assets: CourseAsset[]
  timeline: TimelineSegment[]
  actions: AnimationAction[]
  detectedHyperframesAnimations: DetectedHyperframesAnimation[]
  hyperframesAnimationOverrides: Record<string, HyperframesAnimationOverride>
  animationConflict?: string
  selectedSegmentId: string
  selectedActionId: string
  selectedElementId?: string
  selectedActionRefId?: string
  categoryFilter: AnimationActionCategory | 'all'
  reviewNote: string
  handoffRequests: CodexHandoffRequest[]
}

export type CourseWorkbenchAction =
  | { type: 'hydrate-hyperframes-import'; payload: HyperframesImportPayload }
  | {
      type: 'hydrate-foreground-upload'
      payload: {
        name: string
        relativePath: string
        mediaUrl: string
        durationFrames: number
      }
    }
  | { type: 'select-segment'; id: string }
  | { type: 'select-action'; id: string }
  | { type: 'set-aspect-ratio'; aspectRatio: CanvasAspectRatio }
  | { type: 'seek-frame'; frame: number }
  | { type: 'set-playing'; isPlaying: boolean }
  | { type: 'select-stage-element'; id: string }
  | { type: 'select-action-ref'; id: string }
  | { type: 'start-new-element-binding' }
  | {
      type: 'bind-selected-action-to-element'
      from?: number
      duration?: number
      fadeInFrames?: number
      fadeOutFrames?: number
    }
  | {
      type: 'update-selected-action-ref'
      patch: Partial<Pick<AnimationActionRef, 'actionId' | 'from' | 'duration' | 'fadeInFrames' | 'fadeOutFrames' | 'params'>>
    }
  | { type: 'remove-selected-action-ref' }
  | {
      type: 'modify-hyperframes-animation'
      id: string
      patch: Pick<HyperframesAnimationOverride, 'fromFrame' | 'durationFrames' | 'ease'>
    }
  | { type: 'disable-hyperframes-animation'; id: string }
  | { type: 'restore-hyperframes-animation'; id: string }
  | { type: 'set-background-preview'; mediaUrl: string }
  | { type: 'set-foreground-window'; patch: Partial<ForegroundWindow> }
  | { type: 'set-category-filter'; category: AnimationActionCategory | 'all' }
  | { type: 'create-action'; category: AnimationActionCategory }
  | { type: 'update-action'; id: string; patch: Partial<Omit<AnimationAction, 'id' | 'category'>> }
  | { type: 'duplicate-action'; id: string }
  | { type: 'delete-action'; id: string }
  | { type: 'move-selected-action'; x: number; y: number }
  | { type: 'resize-selected-action'; width: number; height: number; radius?: number }
  | { type: 'set-review-note'; note: string }
  | { type: 'generate-handoff' }

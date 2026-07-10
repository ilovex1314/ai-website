import { parseCourseProject, type CourseProjectV2 } from './courseProjectSchema.js'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Legacy workbench ${label} is required`)
  }

  return value as UnknownRecord
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Legacy workbench ${label} must be a non-empty string`)
  }

  return value
}

function asPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Legacy workbench ${label} must be a positive integer`)
  }

  return value
}

function asNonnegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`Legacy workbench ${label} must be a non-negative integer`)
  }

  return value
}

function asAspectRatio(value: unknown, label: string): '16:9' | '4:3' | '9:16' {
  if (value === '16:9' || value === '4:3' || value === '9:16') {
    return value
  }

  throw new Error(`Legacy workbench ${label} must be a supported aspect ratio`)
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Legacy workbench ${label} must be an array`)
  }

  return value
}

function cloneParams(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  return structuredClone(value as Record<string, unknown>)
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function isBakedLegacyRef(ref: UnknownRecord): boolean {
  return (
    ref.exportRole === 'background-only' ||
    ref.exportRole === 'hyperframes-internal' ||
    ref.renderedInBackground === true ||
    ref.exportableOverlay === false
  )
}

export function migrateLegacyWorkbenchState(value: unknown): CourseProjectV2 {
  const state = asRecord(value, 'state')
  const legacyProject = asRecord(state.project, 'project')
  const legacyStage = asRecord(state.stage, 'stage')
  const legacyBackground = asRecord(legacyStage.backgroundSource, 'stage.backgroundSource')
  const legacyForeground = typeof legacyStage.foregroundSource === 'object' && legacyStage.foregroundSource !== null
    ? asRecord(legacyStage.foregroundSource, 'stage.foregroundSource')
    : undefined
  const legacyTimeline = asArray(state.timeline, 'timeline')
  const legacyActions = asArray(state.actions, 'actions').map((action, index) => {
    const legacyAction = asRecord(action, `actions[${index}]`)

    return {
      id: asString(legacyAction.id, `actions[${index}].id`),
      name: asString(legacyAction.name, `actions[${index}].name`),
      category: asString(legacyAction.category, `actions[${index}].category`),
      source: legacyAction.source,
      selector: legacyAction.selector,
      actionSignature: legacyAction.actionSignature,
      description: asString(legacyAction.description, `actions[${index}].description`),
      status: legacyAction.status,
      version: asString(legacyAction.version, `actions[${index}].version`),
      defaultDurationFrames: asPositiveInteger(
        legacyAction.defaultDurationFrames,
        `actions[${index}].defaultDurationFrames`,
      ),
      params: cloneParams(legacyAction.params),
      presets: legacyAction.presets,
      implementation: legacyAction.implementation,
    }
  })

  const actionInstances: UnknownRecord[] = []
  const bakedAnimations: UnknownRecord[] = []

  legacyTimeline.forEach((segment, segmentIndex) => {
    const legacySegment = asRecord(segment, `timeline[${segmentIndex}]`)
    const segmentId = asString(legacySegment.id, `timeline[${segmentIndex}].id`)
    const segmentFrom = asNonnegativeInteger(legacySegment.from, `timeline[${segmentIndex}].from`)

    asArray(legacySegment.actionRefs, `timeline[${segmentIndex}].actionRefs`).forEach((actionRef, refIndex) => {
      const legacyRef = asRecord(actionRef, `timeline[${segmentIndex}].actionRefs[${refIndex}]`)
      const id =
        typeof legacyRef.id === 'string' && legacyRef.id.length > 0
          ? legacyRef.id
          : `${segmentId}-action-${refIndex + 1}`
      const fromFrame = segmentFrom + asNonnegativeInteger(legacyRef.from, `${id}.from`)
      const durationFrames = asPositiveInteger(legacyRef.duration, `${id}.duration`)

      if (isBakedLegacyRef(legacyRef)) {
        bakedAnimations.push({
          id,
          elementId:
            typeof legacyRef.elementId === 'string' && legacyRef.elementId.length > 0
              ? legacyRef.elementId
              : asString(legacyRef.actionId, `${id}.actionId`),
          fromFrame,
          durationFrames,
          exportRole: 'baked-internal',
        })
        return
      }

      actionInstances.push({
        id,
        templateId: asString(legacyRef.actionId, `${id}.actionId`),
        fromFrame,
        durationFrames,
        fadeInFrames: typeof legacyRef.fadeInFrames === 'number' ? legacyRef.fadeInFrames : 0,
        fadeOutFrames: typeof legacyRef.fadeOutFrames === 'number' ? legacyRef.fadeOutFrames : 0,
        exportRole: 'platform-overlay',
        params: cloneParams(legacyRef.params),
        layoutByAspect: {},
      })
    })
  })

  const playback = typeof state.playback === 'object' && state.playback !== null
    ? asRecord(state.playback, 'playback')
    : undefined
  const durationFrames =
    typeof playback?.totalFrames === 'number' && Number.isInteger(playback.totalFrames) && playback.totalFrames > 0
      ? playback.totalFrames
      : Math.max(
          1,
          ...[...actionInstances, ...bakedAnimations].map((entry) =>
            Number(entry.fromFrame) + Number(entry.durationFrames),
          ),
        )
  const backgroundMediaUrl = stringOrUndefined(legacyBackground.localPreviewUrl)
  const foregroundMediaUrl = stringOrUndefined(legacyForeground?.localPreviewUrl)
  const foreground = legacyForeground && foregroundMediaUrl
    ? {
        id: asString(legacyForeground.id, 'stage.foregroundSource.id'),
        mediaUrl: foregroundMediaUrl,
        durationFrames: asPositiveInteger(
          legacyForeground.durationFrames,
          'stage.foregroundSource.durationFrames',
        ),
        audioPolicy: 'primary',
        window: legacyStage.foregroundWindow,
      }
    : undefined

  return parseCourseProject({
    version: 2,
    id: asString(legacyProject.id, 'project.id'),
    title: asString(legacyProject.title, 'project.title'),
    fps: asPositiveInteger(legacyProject.fps, 'project.fps'),
    durationFrames,
    activeAspectRatio: asAspectRatio(legacyProject.aspectRatio, 'project.aspectRatio'),
    source: {
      background: {
        id: asString(legacyBackground.id, 'stage.backgroundSource.id'),
        projectPath: asString(legacyBackground.projectPath, 'stage.backgroundSource.projectPath'),
        entryHtml: asString(legacyBackground.entryHtml, 'stage.backgroundSource.entryHtml'),
        assetsDir: asString(legacyBackground.assetsDir, 'stage.backgroundSource.assetsDir'),
        sourceAspectRatio: asAspectRatio(
          legacyBackground.sourceAspectRatio,
          'stage.backgroundSource.sourceAspectRatio',
        ),
        ...(backgroundMediaUrl ? { mediaUrl: backgroundMediaUrl } : {}),
      },
      ...(foreground ? { foreground } : {}),
      bakedAnimations,
    },
    actionTemplates: legacyActions,
    actionInstances,
  })
}

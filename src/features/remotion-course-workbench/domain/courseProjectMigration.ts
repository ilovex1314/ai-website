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

  return { ...(value as Record<string, unknown>) }
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
  const legacyActions = asArray(state.actions, 'actions').map((action, index) => {
    const legacyAction = asRecord(action, `actions[${index}]`)
    const { params, ...legacyTemplate } = legacyAction

    return {
      ...legacyTemplate,
      id: asString(legacyAction.id, `actions[${index}].id`),
      version: asString(legacyAction.version, `actions[${index}].version`),
      name: asString(legacyAction.name, `actions[${index}].name`),
      category: asString(legacyAction.category, `actions[${index}].category`),
      defaultDurationFrames: asPositiveInteger(
        legacyAction.defaultDurationFrames,
        `actions[${index}].defaultDurationFrames`,
      ),
      defaultParams: cloneParams(params),
    }
  })

  const actionInstances: UnknownRecord[] = []
  const bakedAnimations: UnknownRecord[] = []

  asArray(state.timeline, 'timeline').forEach((segment, segmentIndex) => {
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
        exportRole: 'platform-overlay',
        params: cloneParams(legacyRef.params),
        layoutByAspect: {},
      })
    })
  })

  return parseCourseProject({
    version: 2,
    id: asString(legacyProject.id, 'project.id'),
    title: asString(legacyProject.title, 'project.title'),
    fps: asPositiveInteger(legacyProject.fps, 'project.fps'),
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
      },
      bakedAnimations,
    },
    actionTemplates: legacyActions,
    actionInstances,
  })
}

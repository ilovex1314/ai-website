import type { CSSProperties, ReactNode } from 'react'
import { useCurrentFrame } from 'remotion'
import type {
  ActionInstance,
  ActionTemplate,
  CourseProjectV2,
} from '../domain/courseProjectSchema'
import type { CanvasAspectRatio } from '../workbenchTypes'

type NumericParams = Record<string, unknown>

type PixelRect = {
  x: number
  y: number
  width: number
  height: number
}

type RuntimeElement = {
  rectsByAspect?: Partial<Record<CanvasAspectRatio, PixelRect>>
}

type ProjectWithElementMap = CourseProjectV2 & {
  elementMap?: Record<string, RuntimeElement>
}

type ResolvedActionOverlay = {
  instance: ActionInstance
  template: ActionTemplate
  params: NumericParams
  style: CSSProperties
  anchorKind: 'canvas' | 'element' | 'params'
}

type ActionOverlayLayerProps = {
  project: CourseProjectV2
  aspectRatio: CanvasAspectRatio
}

function numeric(params: NumericParams, key: string, fallback: number): number {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function text(params: NumericParams, template: ActionTemplate): string {
  const value = params.label ?? params.text ?? params.title
  return typeof value === 'string' && value.length > 0 ? value : template.name
}

function color(params: NumericParams): string {
  return typeof params.color === 'string' ? params.color : '#2563eb'
}

function backgroundColor(params: NumericParams): string {
  if (typeof params.backgroundColor !== 'string') {
    return 'transparent'
  }

  const opacity = numeric(params, 'backgroundOpacity', 0)
  const hex = params.backgroundColor.replace('#', '')

  if (!/^[0-9a-f]{6}$/iu.test(hex)) {
    return params.backgroundColor
  }

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function parametricRect(params: NumericParams, template: ActionTemplate): CSSProperties {
  const circle = template.category === 'circle'
  return {
    left: `${numeric(params, 'x', 16)}%`,
    top: `${numeric(params, 'y', 28)}%`,
    width: `${numeric(params, 'width', circle ? 18 : 42)}%`,
    height: `${numeric(params, 'height', template.category === 'lower-third' ? 14 : 18)}%`,
  }
}

function elementRect(
  project: ProjectWithElementMap,
  elementId: string,
  aspectRatio: CanvasAspectRatio,
): PixelRect | undefined {
  return project.elementMap?.[elementId]?.rectsByAspect?.[aspectRatio]
}

function layoutStyle(
  project: ProjectWithElementMap,
  instance: ActionInstance,
  aspectRatio: CanvasAspectRatio,
  params: NumericParams,
  template: ActionTemplate,
): Pick<ResolvedActionOverlay, 'style' | 'anchorKind'> {
  const layout = instance.layoutByAspect[aspectRatio]

  if (!layout) {
    return { style: parametricRect(params, template), anchorKind: 'params' }
  }

  if (layout.anchor.kind === 'canvas') {
    return {
      anchorKind: 'canvas',
      style: {
        top: `${layout.inset.top}px`,
        right: `${layout.inset.right}px`,
        bottom: `${layout.inset.bottom}px`,
        left: `${layout.inset.left}px`,
      },
    }
  }

  const target = elementRect(project, layout.anchor.elementId, aspectRatio)

  if (!target) {
    return { style: parametricRect(params, template), anchorKind: 'element' }
  }

  return {
    anchorKind: 'element',
    style: {
      left: `${target.x + layout.inset.left}px`,
      top: `${target.y + layout.inset.top}px`,
      width: `${target.width - layout.inset.left - layout.inset.right}px`,
      height: `${target.height - layout.inset.top - layout.inset.bottom}px`,
    },
  }
}

export function resolveActionOverlay(
  project: CourseProjectV2,
  instance: ActionInstance,
  aspectRatio: CanvasAspectRatio,
): ResolvedActionOverlay | undefined {
  if (instance.exportRole !== 'platform-overlay') {
    return undefined
  }

  const template = project.actionTemplates.find((candidate) => candidate.id === instance.templateId)

  if (!template) {
    return undefined
  }

  const params = { ...template.params, ...instance.params }
  const layout = layoutStyle(project, instance, aspectRatio, params, template)
  const overlayColor = color(params)

  return {
    instance,
    template,
    params,
    anchorKind: layout.anchorKind,
    style: {
      ...layout.style,
      borderColor: overlayColor,
      borderRadius: `${numeric(params, 'borderRadius', numeric(params, 'radius', 10))}px`,
      backgroundColor: backgroundColor(params),
      color: overlayColor,
      '--action-color': overlayColor,
      '--action-progress': `${numeric(params, 'progress', 64)}%`,
      '--action-scale': numeric(params, 'scale', 1.12),
    } as CSSProperties,
  }
}

function actionBody(action: ResolvedActionOverlay): ReactNode {
  const label = text(action.params, action.template)

  switch (action.template.category) {
    case 'progress':
      return <><span>{label}</span><i aria-hidden="true" /></>
    case 'step-reveal':
      return <><span>{label}</span><small>{numeric(action.params, 'step', 1)}/{numeric(action.params, 'totalSteps', 4)}</small></>
    case 'cursor':
      return <><span aria-hidden="true" /><strong>{label}</strong></>
    case 'code':
      return <><span>line {numeric(action.params, 'line', 1)}</span><strong>{label}</strong></>
    case 'comparison':
      return <><span>Before</span><strong>{label}</strong><span>After</span></>
    case 'transition':
      return <><strong>{label}</strong><span>{typeof action.params.subtitle === 'string' ? action.params.subtitle : 'Next section'}</span></>
    default:
      return label
  }
}

export function ActionOverlayLayer({ project, aspectRatio }: ActionOverlayLayerProps) {
  const frame = useCurrentFrame()
  const active = project.actionInstances.filter(
    (instance) =>
      instance.exportRole === 'platform-overlay' &&
      frame >= instance.fromFrame &&
      frame < instance.fromFrame + instance.durationFrames,
  )

  return (
    <div className="course-action-overlay-layer" data-testid="action-overlay-layer">
      {active.map((instance) => {
        const action = resolveActionOverlay(project, instance, aspectRatio)

        if (!action) {
          return null
        }

        return (
          <div
            className={`preview-action preview-action--${action.template.category} course-action-overlay`}
            data-action-instance-id={instance.id}
            data-layout-anchor={action.anchorKind}
            data-testid={`action-overlay-${instance.id}`}
            key={instance.id}
            style={action.style}
          >
            {actionBody(action)}
          </div>
        )
      })}
    </div>
  )
}

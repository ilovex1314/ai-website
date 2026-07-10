import { z } from 'zod'

export const aspectRatioSchema = z.enum(['16:9', '4:3', '9:16'])

export const exportRoleSchema = z.enum([
  'baked-internal',
  'platform-overlay',
  'editor-only',
  'background-only',
])

const insetSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
})

const layoutAnchorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('element'), elementId: z.string().min(1) }),
  z.object({ kind: z.literal('canvas') }),
])

export const layoutOverrideSchema = z.object({
  anchor: layoutAnchorSchema,
  inset: insetSchema,
})

export const layoutVariantSchema = z.object({
  '16:9': layoutOverrideSchema.optional(),
  '4:3': layoutOverrideSchema.optional(),
  '9:16': layoutOverrideSchema.optional(),
})

const templateInstanceOnlyFields = new Set([
  'fromFrame',
  'durationFrames',
  'dragX',
  'dragY',
  'x',
  'y',
  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',
  'position',
  'layoutByAspect',
  'layoutOverride',
  'layoutOverrides',
  'anchor',
  'inset',
  'offset',
])

function isTemplateInstanceOnlyField(key: string): boolean {
  return templateInstanceOnlyFields.has(key) || /^(drag|position|layout|anchor|inset|offset)/.test(key)
}

export const actionTemplateSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  defaultDurationFrames: z.number().int().positive(),
  defaultParams: z.record(z.string(), z.unknown()).default({}),
})
  .passthrough()
  .superRefine((template, context) => {
    Object.keys(template).forEach((key) => {
      if (isTemplateInstanceOnlyField(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} belongs to action instances, not templates`,
        })
      }
    })
  })

export const actionInstanceSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  fromFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
  exportRole: z.literal('platform-overlay', {
    error: (issue) => `${String(issue.input)} action instances must use platform-overlay`,
  }),
  params: z.record(z.string(), z.unknown()).default({}),
  layoutByAspect: layoutVariantSchema,
})

const bakedAnimationSchema = z.object({
  id: z.string().min(1),
  elementId: z.string().min(1),
  fromFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
  exportRole: z.literal('baked-internal'),
})

const courseProjectSchema = z
  .object({
    version: z.literal(2),
    id: z.string().min(1),
    title: z.string().min(1),
    fps: z.number().int().positive(),
    activeAspectRatio: aspectRatioSchema,
    source: z.object({
      background: z.object({
        id: z.string().min(1),
        projectPath: z.string().min(1),
        entryHtml: z.string().min(1),
        assetsDir: z.string().min(1),
        sourceAspectRatio: aspectRatioSchema,
      }),
      bakedAnimations: z.array(bakedAnimationSchema).default([]),
    }),
    actionTemplates: z.array(actionTemplateSchema),
    actionInstances: z.array(actionInstanceSchema),
  })
  .superRefine((project, context) => {
    const reportDuplicateIds = (items: Array<{ id: string }>, path: 'actionTemplates' | 'actionInstances', label: string) => {
      const seen = new Set<string>()

      items.forEach((item, index) => {
        if (seen.has(item.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path, index, 'id'],
            message: `duplicate ${label} id: ${item.id}`,
          })
        } else {
          seen.add(item.id)
        }
      })
    }

    reportDuplicateIds(project.actionTemplates, 'actionTemplates', 'action template')
    reportDuplicateIds(project.actionInstances, 'actionInstances', 'action instance')
  })

export type ActionTemplate = z.infer<typeof actionTemplateSchema>
export type LayoutOverride = z.infer<typeof layoutOverrideSchema>
export type LayoutVariant = z.infer<typeof layoutVariantSchema>
export type ActionInstance = z.infer<typeof actionInstanceSchema>
export type CourseProjectV2 = Omit<z.infer<typeof courseProjectSchema>, 'actionInstances'> & {
  actionInstances: ActionInstance[]
}

export function parseCourseProject(value: unknown): CourseProjectV2 {
  return courseProjectSchema.parse(value) as CourseProjectV2
}

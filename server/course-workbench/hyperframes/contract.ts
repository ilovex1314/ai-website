import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { z } from 'zod'

export type HyperframesHtmlElement = {
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  querySelectorAll(selector: string): ArrayLike<HyperframesHtmlElement>
  tagName: string
  textContent: string | null
  outerHTML: string
  parentElement: HyperframesHtmlElement | null
  children: ArrayLike<HyperframesHtmlElement>
}

export type HyperframesHtmlDocument = {
  querySelectorAll(selector: string): ArrayLike<HyperframesHtmlElement>
}

type JsdomConstructor = new (html: string) => {
  window: {
    document: HyperframesHtmlDocument
  }
}

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom') as { JSDOM: JsdomConstructor }
const positiveInteger = z.number().int().positive()
const nonnegativeInteger = z.number().int().nonnegative()

const sceneSchema = z.object({
  id: z.string().min(1),
  fromFrame: nonnegativeInteger,
  durationFrames: positiveInteger,
})

const animationSchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  targetElementId: z.string().min(1),
  fromFrame: nonnegativeInteger,
  durationFrames: positiveInteger,
  kind: z.string().min(1),
  exportRole: z
    .string()
    .refine((value) => value === 'baked-internal', 'HyperFrames animations cannot use platform-overlay'),
  properties: z.array(z.string().min(1)).min(1),
})

export const animationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  fps: positiveInteger,
  durationInFrames: positiveInteger,
  scenes: z.array(sceneSchema).min(1),
  animations: z.array(animationSchema),
})

export type AnimationManifest = z.infer<typeof animationManifestSchema>

export type HyperframesContractReport = {
  valid: boolean
  errors: string[]
  sceneIds: string[]
  elementIds: string[]
  manifest?: AnimationManifest
}

function duplicateErrors(ids: string[], label: string): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  ids.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(id)
    } else {
      seen.add(id)
    }
  })

  return [...duplicates].sort().map((id) => 'duplicate ' + label + ': ' + id)
}

function zodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => (issue.path.join('.') || 'manifest') + ': ' + issue.message)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return undefined
}

function stringValues(items: unknown[], field: string): string[] {
  return items
    .map((item) => asRecord(item)?.[field])
    .filter((value): value is string => typeof value === 'string')
}

export function parseHyperframesHtml(html: string): HyperframesHtmlDocument {
  return new JSDOM(html).window.document
}

export async function validateHyperframesContract(root: string): Promise<HyperframesContractReport> {
  const errors: string[] = []
  const [htmlResult, manifestResult] = await Promise.allSettled([
    readFile(join(root, 'index.html'), 'utf8'),
    readFile(join(root, 'animation-manifest.json'), 'utf8'),
  ])

  if (htmlResult.status === 'rejected') {
    return {
      valid: false,
      errors: ['Unable to read index.html: ' + String(htmlResult.reason)],
      sceneIds: [],
      elementIds: [],
    }
  }

  const document = parseHyperframesHtml(htmlResult.value)
  const sceneIds = Array.from(document.querySelectorAll('[data-hf-scene-id]')).map(
    (element) => element.getAttribute('data-hf-scene-id')?.trim() ?? '',
  )
  const elementIds = Array.from(document.querySelectorAll('[data-hf-element-id]')).map(
    (element) => element.getAttribute('data-hf-element-id')?.trim() ?? '',
  )

  if (sceneIds.length === 0) {
    errors.push('HTML must declare at least one data-hf-scene-id')
  }

  if (elementIds.length === 0) {
    errors.push('HTML must declare at least one data-hf-element-id')
  }

  if (sceneIds.some((id) => id.length === 0)) {
    errors.push('HTML data-hf-scene-id values must be non-empty')
  }

  if (elementIds.some((id) => id.length === 0)) {
    errors.push('HTML data-hf-element-id values must be non-empty')
  }

  errors.push(...duplicateErrors(sceneIds, 'scene id'))
  errors.push(...duplicateErrors(elementIds, 'element id'))

  if (manifestResult.status === 'rejected') {
    errors.push('Unable to read animation-manifest.json: ' + String(manifestResult.reason))
    return { valid: false, errors, sceneIds, elementIds }
  }

  let rawManifest: unknown

  try {
    rawManifest = JSON.parse(manifestResult.value)
  } catch (error) {
    errors.push('animation-manifest.json must contain valid JSON: ' + String(error))
    return { valid: false, errors, sceneIds, elementIds }
  }

  const parsedManifest = animationManifestSchema.safeParse(rawManifest)

  if (!parsedManifest.success) {
    errors.push(...zodErrors(parsedManifest.error))
    const rawManifestRecord = asRecord(rawManifest)
    const rawScenes = Array.isArray(rawManifestRecord?.scenes) ? rawManifestRecord.scenes : []
    const rawAnimations = Array.isArray(rawManifestRecord?.animations) ? rawManifestRecord.animations : []
    const rawSceneIds = stringValues(rawScenes, 'id')
    errors.push(...duplicateErrors(rawSceneIds, 'manifest scene id'))
    errors.push(...duplicateErrors(stringValues(rawAnimations, 'id'), 'animation id'))

    rawAnimations.forEach((rawAnimation) => {
      const animation = asRecord(rawAnimation)
      const animationId = typeof animation?.id === 'string' ? animation.id : '<unknown>'
      const targetElementId = animation?.targetElementId

      if (typeof targetElementId === 'string' && !elementIds.includes(targetElementId)) {
        errors.push('animation ' + animationId + ' targetElementId ' + targetElementId + ' is missing from HTML')
      }
    })

    return { valid: false, errors, sceneIds, elementIds }
  }

  const manifest = parsedManifest.data
  const manifestSceneIds = manifest.scenes.map((scene) => scene.id)
  const animationIds = manifest.animations.map((animation) => animation.id)
  errors.push(...duplicateErrors(manifestSceneIds, 'manifest scene id'))
  errors.push(...duplicateErrors(animationIds, 'animation id'))

  manifest.scenes.forEach((scene) => {
    if (!sceneIds.includes(scene.id)) {
      errors.push('scene id ' + scene.id + ' is missing from HTML')
    }

    if (scene.fromFrame + scene.durationFrames > manifest.durationInFrames) {
      errors.push('scene ' + scene.id + ' exceeds durationInFrames')
    }
  })

  manifest.animations.forEach((animation) => {
    if (!manifestSceneIds.includes(animation.sceneId)) {
      errors.push('animation ' + animation.id + ' references unknown sceneId ' + animation.sceneId)
    }

    if (!elementIds.includes(animation.targetElementId)) {
      errors.push('animation ' + animation.id + ' targetElementId ' + animation.targetElementId + ' is missing from HTML')
    }

    if (animation.fromFrame + animation.durationFrames > manifest.durationInFrames) {
      errors.push('animation ' + animation.id + ' exceeds durationInFrames')
    }
  })

  return { valid: errors.length === 0, errors, sceneIds, elementIds, manifest }
}

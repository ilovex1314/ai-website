import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  animationManifestSchema,
  parseHyperframesHtml,
  validateHyperframesContract,
  type AnimationManifest,
  type HyperframesHtmlDocument,
  type HyperframesHtmlElement,
} from './contract.js'

type MetadataPatch = {
  selector: string
  attribute: 'data-hf-scene-id' | 'data-hf-element-id' | 'data-hf-role'
  value: string
}

export type HyperframesMigrationPlan = {
  root: string
  htmlPath: string
  manifestPath: string
  html: string
  manifest: AnimationManifest
  manifestChanged: boolean
  patches: MetadataPatch[]
  summary: {
    recognized: number
    needsMetadata: number
    unresolved: number
  }
}

export type AppliedHyperframesMigration = {
  backupPath: string
  validation: Awaited<ReturnType<typeof validateHyperframesContract>>
}

export type HyperframesMigrationDependencies = {
  writeFile?: (path: string, data: string) => Promise<void>
}

export class HyperframesMigrationError extends Error {
  readonly code:
    | 'HYPERFRAMES_MIGRATION_UNRESOLVED'
    | 'HYPERFRAMES_MIGRATION_VALIDATION_FAILED'
    | 'HYPERFRAMES_MIGRATION_APPLY_FAILED'
  readonly summary?: HyperframesMigrationPlan['summary']
  readonly backupPath?: string
  readonly validation?: Awaited<ReturnType<typeof validateHyperframesContract>>
  rollbackErrors?: string[]

  constructor(input: {
    code: HyperframesMigrationError['code']
    message: string
    summary?: HyperframesMigrationPlan['summary']
    backupPath?: string
    validation?: Awaited<ReturnType<typeof validateHyperframesContract>>
    rollbackErrors?: string[]
  }) {
    super(input.message)
    this.name = 'HyperframesMigrationError'
    this.code = input.code
    this.summary = input.summary
    this.backupPath = input.backupPath
    this.validation = input.validation
    this.rollbackErrors = input.rollbackErrors
  }
}

const elementSelector = 'h1,h2,h3,h4,h5,h6,p,button,a,img,video,svg,[data-hf-role]'

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8)
}

function semanticRole(element: HyperframesHtmlElement): string {
  const declaredRole = element.getAttribute('data-hf-role')?.trim()

  if (declaredRole !== undefined && declaredRole.length > 0) {
    return declaredRole
  }

  if (/^h[1-6]$/.test(element.tagName.toLowerCase())) {
    return 'title'
  }

  if (element.tagName.toLowerCase() === 'p') {
    return 'body'
  }

  if (element.tagName.toLowerCase() === 'img') {
    return 'image'
  }

  if (element.tagName.toLowerCase() === 'video') {
    return 'video'
  }

  return element.tagName.toLowerCase()
}

function sceneCandidates(document: HyperframesHtmlDocument): HyperframesHtmlElement[] {
  return [...new Set(Array.from(document.querySelectorAll('section, [class~="scene"], [data-hf-scene-id]')))]
}

function elementSelectorFor(element: HyperframesHtmlElement): string {
  const siblings = Array.from(element.parentElement?.children ?? []).filter((sibling) => sibling.tagName === element.tagName)
  return element.tagName.toLowerCase() + ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')'
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function numericAttribute(element: HyperframesHtmlElement, name: string): number | undefined {
  const raw = element.getAttribute(name)
  if (raw === null || raw.trim().length === 0) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export async function planHyperframesMigration(root: string): Promise<HyperframesMigrationPlan> {
  const htmlPath = join(root, 'index.html')
  const manifestPath = join(root, 'animation-manifest.json')
  const html = await readFile(htmlPath, 'utf8')
  const document = parseHyperframesHtml(html)
  const patches: MetadataPatch[] = []
  let recognized = 0
  let needsMetadata = 0
  let unresolved = 0
  const scenes = sceneCandidates(document)
  const manifestScenes: AnimationManifest['scenes'] = []

  if (scenes.length === 0) {
    unresolved = 1
  }

  scenes.forEach((scene, sceneIndex) => {
    const order = sceneIndex + 1
    const existingSceneId = scene.getAttribute('data-hf-scene-id')?.trim()
    const sceneId =
      (existingSceneId !== undefined && existingSceneId.length > 0 ? existingSceneId : undefined) ||
      'scene-' + String(order).padStart(2, '0') + '-scene-' + stableHash(String(order) + '|scene|' + (scene.textContent ?? ''))

    if (existingSceneId !== undefined && existingSceneId.length > 0) {
      recognized += 1
    } else {
      needsMetadata += 1
      patches.push({
        selector: elementSelectorFor(scene),
        attribute: 'data-hf-scene-id',
        value: sceneId,
      })
    }

    scene.setAttribute('data-hf-scene-id', sceneId)
    manifestScenes.push({ id: sceneId, fromFrame: sceneIndex * 90, durationFrames: 90 })

    const roleCounts = new Map<string, number>()
    const candidates = Array.from(scene.querySelectorAll(elementSelector)).filter(
      (element) => !element.hasAttribute('data-hf-scene-id'),
    )

    candidates.forEach((element) => {
      const role = semanticRole(element)
      const roleIndex = (roleCounts.get(role) ?? 0) + 1
      roleCounts.set(role, roleIndex)
      const currentId = element.getAttribute('data-hf-element-id')?.trim()

      if (currentId !== undefined && currentId.length > 0) {
        recognized += 1
        return
      }

      needsMetadata += 1
      const elementId =
        'scene-' +
        String(order).padStart(2, '0') +
        '-' +
        role +
        '-' +
        stableHash(String(order) + '|' + role + '|' + String(roleIndex) + '|' + (element.textContent ?? element.outerHTML))
      const selector = '[data-hf-scene-id="' + sceneId + '"] ' + elementSelectorFor(element)
      patches.push({ selector, attribute: 'data-hf-element-id', value: elementId })

      if (!element.hasAttribute('data-hf-role')) {
        patches.push({ selector, attribute: 'data-hf-role', value: role })
      }

      element.setAttribute('data-hf-element-id', elementId)
      element.setAttribute('data-hf-role', role)
    })
  })

  let manifest: AnimationManifest = {
    schemaVersion: 1,
    fps: 30,
    durationInFrames: Math.max(manifestScenes.length * 90, 1),
    scenes: manifestScenes,
    animations: [],
  }
  let manifestChanged = true

  try {
    const existingManifest = animationManifestSchema.safeParse(JSON.parse(await readFile(manifestPath, 'utf8')))

    if (existingManifest.success) {
      manifest = existingManifest.data
      manifestChanged = false
    }
  } catch {
    // Legacy projects without a parseable manifest receive deterministic metadata.
  }

  const timedScenes = scenes.map((scene, sceneIndex) => {
    const fallback = manifest.scenes[sceneIndex] ?? manifestScenes[sceneIndex]
    const startSeconds = numericAttribute(scene, 'data-start')
    const durationSeconds = numericAttribute(scene, 'data-duration')

    return {
      id: manifestScenes[sceneIndex].id,
      fromFrame: startSeconds === undefined ? fallback.fromFrame : Math.round(startSeconds * manifest.fps),
      durationFrames:
        durationSeconds === undefined ? fallback.durationFrames : Math.max(1, Math.round(durationSeconds * manifest.fps)),
    }
  })
  const timedDuration = Math.max(1, ...timedScenes.map((scene) => scene.fromFrame + scene.durationFrames))

  if (
    JSON.stringify(manifest.scenes) !== JSON.stringify(timedScenes)
    || manifest.durationInFrames !== timedDuration
  ) {
    manifest = {
      ...manifest,
      durationInFrames: timedDuration,
      scenes: timedScenes,
    }
    manifestChanged = true
  }

  return {
    root,
    htmlPath,
    manifestPath,
    html: patches.length === 0 ? html : '<!doctype html>\n' + document.querySelectorAll('html')[0].outerHTML,
    manifest,
    manifestChanged,
    patches,
    summary: { recognized, needsMetadata, unresolved },
  }
}

export async function applyHyperframesMigration(
  plan: HyperframesMigrationPlan,
  dependencies: HyperframesMigrationDependencies = {},
): Promise<AppliedHyperframesMigration> {
  if (plan.summary.unresolved > 0) {
    throw new HyperframesMigrationError({
      code: 'HYPERFRAMES_MIGRATION_UNRESOLVED',
      message: 'Migration plan has unresolved source structures',
      summary: plan.summary,
    })
  }

  const backupPath = join(plan.root, '.workbench-backup', timestamp())
  const htmlChanged = plan.html !== (await readFile(plan.htmlPath, 'utf8'))
  let manifestExisted = false

  await mkdir(backupPath, { recursive: true })

  if (htmlChanged) {
    await copyFile(plan.htmlPath, join(backupPath, 'index.html'))
  }

  if (plan.manifestChanged) {
    try {
      await copyFile(plan.manifestPath, join(backupPath, 'animation-manifest.json'))
      manifestExisted = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  const restore = async (): Promise<string[]> => {
    const rollbackErrors: string[] = []

    if (htmlChanged) {
      try {
        await copyFile(join(backupPath, 'index.html'), plan.htmlPath)
      } catch (error) {
        rollbackErrors.push('Unable to restore index.html: ' + String(error))
      }
    }

    if (plan.manifestChanged) {
      try {
        if (manifestExisted) {
          await copyFile(join(backupPath, 'animation-manifest.json'), plan.manifestPath)
        } else {
          await rm(plan.manifestPath, { force: true })
        }
      } catch (error) {
        rollbackErrors.push('Unable to restore animation-manifest.json: ' + String(error))
      }
    }

    return rollbackErrors
  }

  try {
    if (htmlChanged) {
      await (dependencies.writeFile ?? writeFile)(plan.htmlPath, plan.html)
    }

    if (plan.manifestChanged) {
      await (dependencies.writeFile ?? writeFile)(plan.manifestPath, JSON.stringify(plan.manifest, null, 2) + '\n')
    }

    const validation = await validateHyperframesContract(plan.root)

    if (!validation.valid) {
      throw new HyperframesMigrationError({
        code: 'HYPERFRAMES_MIGRATION_VALIDATION_FAILED',
        message: 'Migrated HyperFrames source failed validation: ' + validation.errors.join('; '),
        backupPath,
        validation,
      })
    }

    return { backupPath, validation }
  } catch (error) {
    const rollbackErrors = await restore()

    if (error instanceof HyperframesMigrationError) {
      error.rollbackErrors = rollbackErrors
      throw error
    }

    throw new HyperframesMigrationError({
      code: 'HYPERFRAMES_MIGRATION_APPLY_FAILED',
      message: 'Migrated HyperFrames source failed after backup: ' + String(error),
      backupPath,
      rollbackErrors,
    })
  }
}

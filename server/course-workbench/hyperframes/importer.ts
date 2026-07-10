import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import type { CanvasAspectRatio } from '../../../src/features/remotion-course-workbench/workbenchTypes.js'
import type { CourseProjectV2 } from '../../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'
import { probeMedia, type MediaMetadata } from '../mediaProbe.js'
import { resolveContainedPath, resolveProjectArtifactPath, writeFileNoFollow } from '../pathSafety.js'
import { createProjectRepository, WorkbenchServiceError } from '../projectRepository.js'
import { validateHyperframesContract, type AnimationManifest } from './contract.js'
import { applyHyperframesMigration, planHyperframesMigration } from './migrator.js'
import {
  inspectHyperframesRuntime,
  type RuntimeElement,
  type RuntimeScene,
} from './runtimeInspector.js'

export type HyperframesImportRequest = {
  sourcePath: string
  projectRoot: string
  allowedSourceRoots: string[]
  applyMetadata?: boolean
  aspects?: CanvasAspectRatio[]
}

export type HyperframesMigrationReport = {
  summary: {
    recognized: number
    needsMetadata: number
    unresolved: number
  }
  patches: Array<{
    selector: string
    attribute: 'data-hf-scene-id' | 'data-hf-element-id' | 'data-hf-role'
    value: string
  }>
  applied: boolean
  backupPath?: string
}

export type BakedAnimationMetadata = {
  id: string
  sceneId: string
  elementId: string
  fromFrame: number
  durationFrames: number
  kind: string
  properties: string[]
  exportRole: 'baked-internal'
}

type MigrationRequiredImport = {
  status: 'migration-required'
  migrationReport: HyperframesMigrationReport
}

type UnresolvedMigrationImport = {
  status: 'unresolved'
  migrationReport: HyperframesMigrationReport
}

export type ReadyHyperframesImport = {
  status: 'ready'
  project: CourseProjectV2
  migrationReport: HyperframesMigrationReport
  sourceDimensions: { width: number; height: number }
  sceneMap: Record<string, RuntimeScene>
  elementMap: Record<string, RuntimeElement>
  bakedAnimationMap: Record<string, BakedAnimationMetadata>
  fingerprints: Record<string, string>
  backgroundMedia?: {
    relativePath: string
    metadata: MediaMetadata
  }
}

export type HyperframesImportResult = MigrationRequiredImport | UnresolvedMigrationImport | ReadyHyperframesImport

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function readMetadata(root: string): Promise<{ id?: string; name?: string }> {
  const path = await resolveSourceChild(root, 'meta.json', true)

  if (!existsSync(path)) {
    return {}
  }

  try {
    return JSON.parse(await readFile(path, 'utf8')) as { id?: string; name?: string }
  } catch {
    return {}
  }
}

function resolveSourceChild(root: string, child: string, allowMissing = false): Promise<string> {
  return resolveContainedPath(root, child, {
    allowMissing,
    code: 'SOURCE_CHILD_NOT_ALLOWED',
    stage: 'import',
    message: 'Imported HyperFrames child path escapes the source project',
    recovery: 'Replace external symlinks with files contained inside the imported project.',
  })
}

async function validateSourceChildren(root: string): Promise<void> {
  await Promise.all([
    resolveSourceChild(root, 'index.html'),
    resolveSourceChild(root, 'animation-manifest.json', true),
    resolveSourceChild(root, 'meta.json', true),
    resolveSourceChild(root, 'hyperframes.json', true),
    resolveSourceChild(root, 'assets', true),
    resolveSourceChild(root, 'renders', true),
    resolveSourceChild(root, '.workbench-backup', true),
  ])
}

function projectId(root: string, declared?: string): string {
  const id = (declared ?? basename(root)).trim()

  if (id.length === 0 || id === '.' || id === '..' || id.includes('/') || id.includes('\\')) {
    throw new WorkbenchServiceError({
      code: 'SOURCE_CONTRACT_INVALID',
      stage: 'import',
      message: 'HyperFrames metadata id must be a single directory name',
      subject: declared,
      recovery: 'Set meta.json id to a non-empty value without path separators.',
    })
  }

  return id
}

function aspectFromDimensions(width: number, height: number): CanvasAspectRatio {
  const ratio = width / height

  if (Math.abs(ratio - 16 / 9) < 0.02) {
    return '16:9'
  }

  if (Math.abs(ratio - 4 / 3) < 0.02) {
    return '4:3'
  }

  return '9:16'
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function collectFingerprints(root: string, mediaPath?: string): Promise<Record<string, string>> {
  const candidates = ['index.html', 'animation-manifest.json', 'hyperframes.json']
  const fingerprints: Record<string, string> = {}

  for (const candidate of candidates) {
    const path = await resolveSourceChild(root, candidate, true)

    if (existsSync(path)) {
      fingerprints[candidate] = await sha256(path)
    }
  }

  if (mediaPath !== undefined) {
    fingerprints[relative(root, mediaPath)] = await sha256(mediaPath)
  }

  return fingerprints
}

async function findBackgroundMedia(root: string, id: string): Promise<string | undefined> {
  const renders = await resolveSourceChild(root, 'renders', true)

  if (!existsSync(renders)) {
    return undefined
  }

  const files = (await readdir(renders)).filter((file) => file.toLowerCase().endsWith('.mp4')).sort()
  const preferred = files.find((file) => file === `${id}.mp4`) ?? files[0]
  return preferred === undefined ? undefined : resolveSourceChild(root, join('renders', preferred))
}

function bakedAnimationMap(manifest: AnimationManifest): Record<string, BakedAnimationMetadata> {
  return Object.fromEntries(
    manifest.animations.map((animation) => [
      animation.id,
      {
        id: animation.id,
        sceneId: animation.sceneId,
        elementId: animation.targetElementId,
        fromFrame: animation.fromFrame,
        durationFrames: animation.durationFrames,
        kind: animation.kind,
        properties: animation.properties,
        exportRole: 'baked-internal' as const,
      },
    ]),
  )
}

async function persistImportArtifacts(
  projectDirectory: string,
  result: ReadyHyperframesImport,
): Promise<void> {
  const hyperframesDirectory = await resolveProjectArtifactPath(projectDirectory, 'hyperframes')
  const sourcesDirectory = await resolveProjectArtifactPath(projectDirectory, 'sources')
  await Promise.all([
    mkdir(hyperframesDirectory, { recursive: true }),
    mkdir(sourcesDirectory, { recursive: true }),
  ])
  const artifactPaths = await Promise.all([
    resolveProjectArtifactPath(projectDirectory, 'hyperframes/scene-map.json'),
    resolveProjectArtifactPath(projectDirectory, 'hyperframes/element-map.json'),
    resolveProjectArtifactPath(projectDirectory, 'hyperframes/baked-animation-map.json'),
    resolveProjectArtifactPath(projectDirectory, 'hyperframes/migration-report.json'),
    resolveProjectArtifactPath(projectDirectory, 'sources/source-manifest.json'),
    resolveProjectArtifactPath(projectDirectory, 'sources/media-manifest.json'),
  ])
  await Promise.all([
    writeFileNoFollow(artifactPaths[0], json(result.sceneMap)),
    writeFileNoFollow(artifactPaths[1], json(result.elementMap)),
    writeFileNoFollow(artifactPaths[2], json(result.bakedAnimationMap)),
    writeFileNoFollow(artifactPaths[3], json(result.migrationReport)),
    writeFileNoFollow(
      artifactPaths[4],
      json({
        background: result.project.source.background,
        sourceDimensions: result.sourceDimensions,
        fingerprints: result.fingerprints,
      }),
    ),
    writeFileNoFollow(artifactPaths[5], json({ background: result.backgroundMedia ?? null })),
  ])
}

async function validateArtifactDestinations(
  projectDirectory: string,
  aspects: CanvasAspectRatio[],
): Promise<void> {
  const paths = [
    'hyperframes',
    'hyperframes/thumbnails',
    'sources',
    'hyperframes/scene-map.json',
    'hyperframes/element-map.json',
    'hyperframes/baked-animation-map.json',
    'hyperframes/migration-report.json',
    'sources/source-manifest.json',
    'sources/media-manifest.json',
    ...aspects.map((aspect) => `hyperframes/thumbnails/${aspect.replace(':', 'x')}`),
  ]
  await Promise.all(paths.map((path) => resolveProjectArtifactPath(projectDirectory, path)))
}

export async function importHyperframesProject(
  request: HyperframesImportRequest,
): Promise<HyperframesImportResult> {
  const repository = createProjectRepository(request.projectRoot, request.allowedSourceRoots)
  const root = await repository.importPath(request.sourcePath)
  await validateSourceChildren(root)
  const migration = await planHyperframesMigration(root)
  const requiresWriteback = migration.patches.length > 0 || migration.manifestChanged
  const report: HyperframesMigrationReport = {
    summary: migration.summary,
    patches: migration.patches,
    applied: false,
  }

  if (migration.summary.unresolved > 0) {
    return { status: 'unresolved', migrationReport: report }
  }

  if (requiresWriteback && request.applyMetadata !== true) {
    return { status: 'migration-required', migrationReport: report }
  }

  if (requiresWriteback) {
    await validateSourceChildren(root)
    const applied = await applyHyperframesMigration(migration)
    report.applied = true
    report.backupPath = applied.backupPath
  }

  await validateSourceChildren(root)
  const contract = await validateHyperframesContract(root)

  if (!contract.valid || contract.manifest === undefined) {
    throw new WorkbenchServiceError({
      code: 'SOURCE_CONTRACT_INVALID',
      stage: 'import',
      message: `HyperFrames source contract is invalid: ${contract.errors.join('; ')}`,
      subject: root,
      recovery: 'Run the HyperFrames course source validator and fix the reported metadata.',
    })
  }

  const aspects: CanvasAspectRatio[] = request.aspects?.length
    ? [...new Set(request.aspects)]
    : ['16:9', '4:3', '9:16']
  const metadata = await readMetadata(root)
  const id = projectId(root, metadata.id)
  const requestedProjectDirectory = await resolveContainedPath(request.projectRoot, id, {
    allowMissing: true,
    rejectSymlinks: true,
    code: 'PROJECT_OUTPUT_NOT_ALLOWED',
    stage: 'save',
    message: 'Course project output path must stay inside the project root without symlinks',
    recovery: 'Remove the conflicting project symlink or choose a different project id.',
  })
  await mkdir(requestedProjectDirectory, { recursive: true })
  const projectDirectory = await resolveContainedPath(request.projectRoot, id, {
    rejectSymlinks: true,
    code: 'PROJECT_OUTPUT_NOT_ALLOWED',
    stage: 'save',
    message: 'Course project output path must stay inside the project root without symlinks',
    recovery: 'Remove the conflicting project symlink or choose a different project id.',
  })
  await validateArtifactDestinations(projectDirectory, aspects)
  const runtime = await inspectHyperframesRuntime(
    root,
    contract.manifest,
    aspects,
    projectDirectory,
  )
  const mediaPath = await findBackgroundMedia(root, id)
  const backgroundMedia = mediaPath === undefined
    ? undefined
    : { relativePath: relative(root, mediaPath), metadata: await probeMedia(mediaPath) }
  const bakedMap = bakedAnimationMap(contract.manifest)
  const project: CourseProjectV2 = {
    version: 2,
    id,
    title: metadata.name?.trim() || id,
    fps: contract.manifest.fps,
    activeAspectRatio: aspectFromDimensions(runtime.sourceDimensions.width, runtime.sourceDimensions.height),
    source: {
      background: {
        id: `hf-${id}`,
        projectPath: root,
        entryHtml: 'index.html',
        assetsDir: 'assets',
        sourceAspectRatio: aspectFromDimensions(runtime.sourceDimensions.width, runtime.sourceDimensions.height),
      },
      bakedAnimations: Object.values(bakedMap).map((animation) => ({
        id: animation.id,
        elementId: animation.elementId,
        fromFrame: animation.fromFrame,
        durationFrames: animation.durationFrames,
        exportRole: animation.exportRole,
      })),
    },
    actionTemplates: [],
    actionInstances: [],
  }
  await repository.save(project)
  const result: ReadyHyperframesImport = {
    status: 'ready',
    project,
    migrationReport: report,
    sourceDimensions: runtime.sourceDimensions,
    sceneMap: runtime.sceneMap,
    elementMap: runtime.elementMap,
    bakedAnimationMap: bakedMap,
    fingerprints: await collectFingerprints(root, mediaPath),
    backgroundMedia,
  }
  await persistImportArtifacts(projectDirectory, result)
  return result
}

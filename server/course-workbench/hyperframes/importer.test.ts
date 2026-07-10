import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { probeMedia } from '../mediaProbe.js'
import { importHyperframesProject } from './importer.js'

const execFileAsync = promisify(execFile)
const realFixture = '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial'
const temporaryPaths: string[] = []

async function temporaryDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix))
  temporaryPaths.push(path)
  return path
}

async function copyRealFixture(): Promise<{ fixture: string; sourceRoot: string }> {
  const sourceRoot = await temporaryDirectory('course-workbench-real-source-')
  const fixture = join(sourceRoot, basename(realFixture))
  await execFileAsync('cp', ['-cR', realFixture, fixture])
  return { fixture, sourceRoot }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe.skipIf(!existsSync(realFixture))('real HyperFrames import', () => {
  it('reports migration before writeback, then imports only declared runtime IDs for every aspect', async () => {
    const { fixture, sourceRoot } = await copyRealFixture()
    const projectRoot = await temporaryDirectory('course-workbench-projects-')
    const htmlBefore = await readFile(join(fixture, 'index.html'), 'utf8')

    const scan = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
    })

    expect(scan.status).toBe('migration-required')
    expect(scan.migrationReport.summary).toMatchObject({
      recognized: 0,
      unresolved: 0,
    })
    expect(scan.migrationReport.summary.needsMetadata).toBeGreaterThan(0)
    expect(await readFile(join(fixture, 'index.html'), 'utf8')).toBe(htmlBefore)
    expect(existsSync(join(fixture, 'animation-manifest.json'))).toBe(false)

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      applyMetadata: true,
      aspects: ['9:16', '16:9', '4:3'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    expect(imported.sourceDimensions).toEqual({ width: 1080, height: 1920 })
    expect(Object.keys(imported.sceneMap)).toHaveLength(11)
    expect(Object.keys(imported.elementMap).length).toBeGreaterThan(20)
    expect(imported.bakedAnimationMap).toEqual({})
    expect(imported.project.source.bakedAnimations).toEqual([])
    expect(imported.project.actionInstances).toEqual([])
    expect(imported.backgroundMedia).toMatchObject({
      relativePath: 'renders/codex-keyframes-tutorial.mp4',
      metadata: {
        width: 1080,
        height: 1920,
        fps: 30,
        hasAudio: true,
        codec: 'h264',
      },
    })
    expect(imported.backgroundMedia?.metadata.durationSeconds).toBeCloseTo(157.55, 1)

    const migratedHtml = await readFile(join(fixture, 'index.html'), 'utf8')
    expect(migratedHtml).toContain('data-hf-element-id=')
    expect(migratedHtml).not.toBe(htmlBefore)

    Object.values(imported.elementMap).forEach((element) => {
      expect(migratedHtml).toContain(`data-hf-element-id="${element.id}"`)
      expect(element.selector).toBe(`[data-hf-element-id="${element.id}"]`)
      expect(element.visibility.toFrame).toBeGreaterThan(element.visibility.fromFrame)
      expect(Object.keys(element.rectsByAspect).sort()).toEqual(['16:9', '4:3', '9:16'])
      Object.values(element.rectsByAspect).forEach((rect) => {
        expect(rect.width).toBeGreaterThanOrEqual(0)
        expect(rect.height).toBeGreaterThanOrEqual(0)
      })
    })

    expect(imported.fingerprints['index.html']).toBe(sha256(migratedHtml))
    expect(imported.fingerprints['animation-manifest.json']).toMatch(/^[a-f0-9]{64}$/)

    const persistedBase = join(projectRoot, imported.project.id)
    await expect(readFile(join(persistedBase, 'project.json'), 'utf8')).resolves.toContain(imported.project.id)
    await expect(readFile(join(persistedBase, 'hyperframes', 'scene-map.json'), 'utf8')).resolves.toContain('scene-01')
    await expect(readFile(join(persistedBase, 'hyperframes', 'element-map.json'), 'utf8')).resolves.toContain('rectsByAspect')
    await expect(readFile(join(persistedBase, 'hyperframes', 'baked-animation-map.json'), 'utf8')).resolves.toContain('{}')
    await expect(readFile(join(persistedBase, 'hyperframes', 'migration-report.json'), 'utf8')).resolves.toContain('needsMetadata')
    await expect(readFile(join(persistedBase, 'sources', 'source-manifest.json'), 'utf8')).resolves.toContain('fingerprints')
    await expect(readFile(join(persistedBase, 'sources', 'media-manifest.json'), 'utf8')).resolves.toContain('hasAudio')
  }, 120_000)
})

describe('baked animation ownership', () => {
  it('keeps manifest animations in source metadata and never creates action instances', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-declared-source-')
    const fixture = join(sourceRoot, 'declared-course')
    const projectRoot = await temporaryDirectory('course-workbench-projects-')
    await mkdir(join(fixture, 'assets'), { recursive: true })
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro"><h1 data-hf-element-id="title" data-hf-role="title">Hello</h1></section></div></body></html>',
    )
    await writeFile(
      join(fixture, 'animation-manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        fps: 30,
        durationInFrames: 90,
        scenes: [{ id: 'intro', fromFrame: 0, durationFrames: 90 }],
        animations: [
          {
            id: 'title-in',
            sceneId: 'intro',
            targetElementId: 'title',
            fromFrame: 3,
            durationFrames: 18,
            kind: 'entrance',
            exportRole: 'baked-internal',
            properties: ['opacity', 'transform'],
          },
        ],
      }),
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    expect(imported.bakedAnimationMap['title-in']).toMatchObject({
      elementId: 'title',
      exportRole: 'baked-internal',
    })
    expect(imported.project.source.bakedAnimations).toEqual([
      {
        id: 'title-in',
        elementId: 'title',
        fromFrame: 3,
        durationFrames: 18,
        exportRole: 'baked-internal',
      },
    ])
    expect(imported.project.actionInstances).toEqual([])
  }, 30_000)
})

describe('media probe', () => {
  it.skipIf(!existsSync(realFixture))('maps FFprobe metadata from the real render', async () => {
    const media = join(realFixture, 'renders', 'codex-keyframes-tutorial.mp4')

    await expect(probeMedia(media)).resolves.toMatchObject({
      width: 1080,
      height: 1920,
      fps: 30,
      hasAudio: true,
      codec: 'h264',
    })
  })

  it('returns a structured recovery error for undecodable media', async () => {
    const root = await temporaryDirectory('course-workbench-bad-media-')
    const media = join(root, 'broken.mp4')
    await writeFile(media, 'not media')

    await expect(probeMedia(media)).rejects.toMatchObject({
      code: 'MEDIA_UNDECODABLE',
      stage: 'import',
      subject: media,
      recovery: expect.stringContaining('FFmpeg'),
    })
  })
})

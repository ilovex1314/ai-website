import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { probeMedia } from '../mediaProbe.js'
import { parseHyperframesHtml } from './contract.js'
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
  const htmlPath = join(fixture, 'index.html')
  const legacyHtml = (await readFile(htmlPath, 'utf8'))
    .replace(/\sdata-hf-scene-id="[^"]*"/gu, '')
    .replace(/\sdata-hf-element-id="[^"]*"/gu, '')
    .replace(/\sdata-hf-role="[^"]*"/gu, '')
  await writeFile(htmlPath, legacyHtml)
  await rm(join(fixture, 'animation-manifest.json'), { force: true })
  await rm(join(fixture, 'renders', 'workbench-background.mp4'), { force: true })
  const metaPath = join(fixture, 'meta.json')
  const metadata = JSON.parse(await readFile(metaPath, 'utf8')) as Record<string, unknown>
  delete metadata.renderedPreview
  await writeFile(metaPath, `${JSON.stringify(metadata, null, 2)}\n`)
  return { fixture, sourceRoot }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function createDeclaredFixture(sourceRoot: string, id = 'declared-course'): Promise<string> {
  const fixture = join(sourceRoot, id)
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
      animations: [],
    }),
  )
  return fixture
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
    expect(Object.keys(imported.bakedAnimationMap).length).toBeGreaterThan(30)
    expect(imported.project.source.bakedAnimations).toHaveLength(Object.keys(imported.bakedAnimationMap).length)
    Object.values(imported.bakedAnimationMap).forEach((animation) => {
      expect(imported.elementMap[animation.elementId]).toBeDefined()
      expect(animation.kind).not.toBe('runtime-entrance')
      expect(animation.durationFrames).toBeGreaterThan(0)
    })
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
    expect(imported.project.durationFrames).toBe(imported.backgroundMedia?.metadata.durationFrames)
    expect(imported.project.source.background.mediaUrl).toContain('/@fs/')
    expect(migratedHtml).toContain('data-hf-element-id=')
    expect(migratedHtml).not.toBe(htmlBefore)

    let visibleElementCount = 0

    Object.values(imported.elementMap).forEach((element) => {
      expect(migratedHtml).toContain(`data-hf-element-id="${element.id}"`)
      expect(element.selector).toBe(`[data-hf-element-id="${element.id}"]`)
      expect(element.visibility.toFrame).toBeGreaterThanOrEqual(element.visibility.fromFrame)

      if (element.visibility.toFrame > element.visibility.fromFrame) {
        visibleElementCount += 1
      }

      expect(Object.keys(element.rectsByAspect).sort()).toEqual(['16:9', '4:3', '9:16'])
      Object.values(element.rectsByAspect).forEach((rect) => {
        expect(rect.width).toBeGreaterThanOrEqual(0)
        expect(rect.height).toBeGreaterThanOrEqual(0)
      })
    })
    expect(visibleElementCount).toBeGreaterThan(0)

    expect(imported.fingerprints['index.html']).toBe(sha256(migratedHtml))
    expect(imported.fingerprints['animation-manifest.json']).toMatch(/^[a-f0-9]{64}$/)

    const persistedBase = join(projectRoot, imported.project.id)
    await expect(readFile(join(persistedBase, 'project.json'), 'utf8')).resolves.toContain(imported.project.id)
    await expect(readFile(join(persistedBase, 'hyperframes', 'scene-map.json'), 'utf8')).resolves.toContain('scene-01')
    await expect(readFile(join(persistedBase, 'hyperframes', 'element-map.json'), 'utf8')).resolves.toContain('rectsByAspect')
    await expect(readFile(join(persistedBase, 'hyperframes', 'baked-animation-map.json'), 'utf8')).resolves.toContain('runtime-scene-01')
    await expect(readFile(join(persistedBase, 'hyperframes', 'migration-report.json'), 'utf8')).resolves.toContain('needsMetadata')
    await expect(readFile(join(persistedBase, 'sources', 'source-manifest.json'), 'utf8')).resolves.toContain('fingerprints')
    await expect(readFile(join(persistedBase, 'sources', 'media-manifest.json'), 'utf8')).resolves.toContain('hasAudio')
  }, 120_000)
})

describe('baked animation ownership', () => {
  it('can declare the rendered teaching video as the temporary foreground source', async () => {
    const fixture = '/Users/happyboy/Documents/ai-website/videos/remotion-course-workbench-manifest-case'
    const projectRoot = await temporaryDirectory('course-workbench-manifest-case-projects-')

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: ['/Users/happyboy/Documents/ai-website/videos'],
      aspects: ['9:16'],
    })

    expect(imported.status).toBe('ready')
    if (imported.status !== 'ready') throw new Error('Expected ready import')
    expect(imported.project.source.foreground).toMatchObject({
      mediaUrl: expect.stringContaining('remotion-course-workbench-manifest-case.mp4'),
      durationFrames: imported.project.durationFrames,
      audioPolicy: 'primary',
    })
  }, 30_000)

  it('uses a declared element map directly instead of replacing it with runtime sampling', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-manifest-first-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'manifest-first-course')
    const projectRoot = await temporaryDirectory('course-workbench-projects-')
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro"><h1 data-hf-element-id="title" data-hf-role="title" style="display:none">Hello</h1></section></div></body></html>',
    )
    await mkdir(join(fixture, 'assets', 'thumbnails'), { recursive: true })
    await writeFile(join(fixture, 'assets', 'thumbnails', 'intro.png'), 'declared-thumbnail')
    await writeFile(
      join(fixture, 'element-map.json'),
      JSON.stringify({
        schemaVersion: 1,
        sourceDimensions: { width: 1920, height: 1080 },
        elements: {
          title: {
            id: 'title',
            sceneId: 'intro',
            role: 'title',
            selector: '[data-hf-element-id="title"]',
            text: 'Hello',
            depth: 1,
            visibility: { fromFrame: 0, toFrame: 90 },
            rectsByAspect: {
              '16:9': { x: 120, y: 160, width: 680, height: 120 },
            },
            thumbnailsByAspect: {
              '16:9': 'assets/thumbnails/intro.png',
            },
          },
        },
      }),
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')
    if (imported.status !== 'ready') throw new Error('Expected ready import')

    expect(imported.elementMap.title).toMatchObject({
      visibility: { fromFrame: 0, toFrame: 90 },
      rectsByAspect: {
        '16:9': { x: 120, y: 160, width: 680, height: 120 },
      },
      thumbnailsByAspect: {
        '16:9': 'hyperframes/thumbnails/16x9/intro.png',
      },
    })
    await expect(stat(join(projectRoot, 'manifest-first-course', 'hyperframes', 'thumbnails', '16x9', 'intro.png')))
      .resolves.toMatchObject({ size: 18 })
  }, 30_000)

  it('discovers element-owned GSAP tweens when the manifest has no animation declarations', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-runtime-animation-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'runtime-animation-course')
    const projectRoot = await temporaryDirectory('course-workbench-projects-')
    await writeFile(
      join(fixture, 'index.html'),
      `<!doctype html><html><body>
        <div data-composition-id="main" data-width="1920" data-height="1080">
          <section data-hf-scene-id="intro">
            <h1 data-hf-element-id="title" data-hf-role="title">Hello</h1>
          </section>
        </div>
        <script>
          const title = document.querySelector('[data-hf-element-id="title"]');
          window.__timelines = {
            main: {
              seek() {},
              getChildren() {
                return [
                  {
                    targets() { return [title]; },
                    startTime() { return 0.5; },
                    duration() { return 0.6; },
                    totalDuration() { return 0.6; },
                    vars: { y: 54, opacity: 0, scale: 0.98, ease: 'expo.out', runBackwards: true }
                  }
                ];
              }
            }
          };
        </script>
      </body></html>`,
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')
    if (imported.status !== 'ready') throw new Error('Expected ready import')

    expect(Object.values(imported.bakedAnimationMap)).toEqual([
      expect.objectContaining({
        elementId: 'title',
        sceneId: 'intro',
        fromFrame: 15,
        durationFrames: 18,
        kind: 'entrance',
        properties: expect.arrayContaining(['opacity', 'scale', 'translate']),
        ease: 'expo.out',
      }),
    ])
  }, 30_000)

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

  it('rejects an animation target owned by a different declared scene', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-scene-owner-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'scene-owner-course')
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro"><p data-hf-element-id="intro-body">Intro</p></section><section data-hf-scene-id="outro"><h1 data-hf-element-id="title">Title</h1></section></div></body></html>',
    )
    await writeFile(
      join(fixture, 'animation-manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        fps: 30,
        durationInFrames: 60,
        scenes: [
          { id: 'intro', fromFrame: 0, durationFrames: 30 },
          { id: 'outro', fromFrame: 30, durationFrames: 30 },
        ],
        animations: [
          {
            id: 'wrong-scene',
            sceneId: 'intro',
            targetElementId: 'title',
            fromFrame: 0,
            durationFrames: 10,
            kind: 'entrance',
            exportRole: 'baked-internal',
            properties: ['opacity'],
          },
        ],
      }),
    )

    await expect(importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })).rejects.toMatchObject({
      code: 'ANIMATION_TARGET_SCENE_MISMATCH',
      stage: 'import',
      subject: 'title',
    })
  }, 30_000)
})

describe('per-aspect thumbnails', () => {
  it('stores aspect-specific references and persists every referenced thumbnail', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-thumbnail-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'thumbnail-course')
    const projectRoot = await temporaryDirectory('course-workbench-projects-')
    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9', '4:3', '9:16'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    const references = new Set<string>()

    for (const entry of [...Object.values(imported.sceneMap), ...Object.values(imported.elementMap)]) {
      expect(entry).toHaveProperty('thumbnailsByAspect')
      const thumbnails = (entry as unknown as {
        thumbnailsByAspect: Record<'16:9' | '4:3' | '9:16', string>
      }).thumbnailsByAspect
      expect(Object.keys(thumbnails).sort()).toEqual(['16:9', '4:3', '9:16'])
      Object.values(thumbnails).forEach((reference) => references.add(reference))
    }

    expect(references.size).toBe(3)

    for (const reference of references) {
      const thumbnail = join(projectRoot, imported.project.id, reference)
      expect(existsSync(thumbnail)).toBe(true)
      expect((await stat(thumbnail)).size).toBeGreaterThan(0)
    }
  }, 30_000)
})

describe('project artifact destination containment', () => {
  const artifactPaths = [
    { path: 'hyperframes', directory: true },
    { path: 'hyperframes/thumbnails', directory: true },
    { path: 'hyperframes/thumbnails/16x9', directory: true },
    { path: 'sources', directory: true },
    { path: 'hyperframes/scene-map.json', directory: false },
    { path: 'hyperframes/element-map.json', directory: false },
    { path: 'hyperframes/baked-animation-map.json', directory: false },
    { path: 'hyperframes/migration-report.json', directory: false },
    { path: 'sources/source-manifest.json', directory: false },
    { path: 'sources/media-manifest.json', directory: false },
  ]

  it.each(artifactPaths)(
    'rejects symlinked artifact destination $path before writing',
    async ({ path, directory }) => {
      const sourceRoot = await temporaryDirectory('course-workbench-artifact-source-')
      const fixture = await createDeclaredFixture(sourceRoot, 'artifact-course')
      const projectRoot = await temporaryDirectory('course-workbench-projects-')
      const projectDirectory = join(projectRoot, 'artifact-course')
      const artifactPath = join(projectDirectory, path)
      const outside = await temporaryDirectory('course-workbench-artifact-escape-')
      await mkdir(dirname(artifactPath), { recursive: true })

      if (directory) {
        await symlink(outside, artifactPath)
      } else {
        const outsideFile = join(outside, 'sentinel.json')
        await writeFile(outsideFile, 'unchanged')
        await symlink(outsideFile, artifactPath)
      }

      await expect(importHyperframesProject({
        sourcePath: fixture,
        projectRoot,
        allowedSourceRoots: [sourceRoot],
        aspects: ['16:9'],
      })).rejects.toMatchObject({
        code: 'PROJECT_ARTIFACT_PATH_NOT_ALLOWED',
        stage: 'save',
        subject: expect.stringContaining(path),
      })

      if (directory) {
        await expect(readdir(outside)).resolves.toEqual([])
      } else {
        await expect(readFile(join(outside, 'sentinel.json'), 'utf8')).resolves.toBe('unchanged')
      }
    },
    30_000,
  )
})

describe('persisted element selectors', () => {
  it('escapes CSS-special data-hf-element-id values into a resolvable attribute selector', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-selector-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'selector-course')
    const elementId = 'title"slash\\colon:bracket[] space #dot.'
    const htmlElementId = elementId.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    await writeFile(
      join(fixture, 'index.html'),
      `<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro"><h1 data-hf-element-id="${htmlElementId}">Special</h1></section></div></body></html>`,
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    const selector = imported.elementMap[elementId].selector
    const document = parseHyperframesHtml(await readFile(join(fixture, 'index.html'), 'utf8'))
    const selectedIds = Array.from(document.querySelectorAll(selector)).map(
      (element) => element.getAttribute('data-hf-element-id'),
    )
    expect(selectedIds).toEqual([elementId])
  }, 30_000)
})

describe('imported child path containment', () => {
  it.each(['index.html', 'animation-manifest.json', 'meta.json'])(
    'rejects a %s symlink that escapes the imported project',
    async (childName) => {
      const sourceRoot = await temporaryDirectory('course-workbench-contained-source-')
      const fixture = await createDeclaredFixture(sourceRoot)
      const outsideRoot = await temporaryDirectory('course-workbench-outside-child-')
      const outsidePath = join(outsideRoot, childName)
      await rm(join(fixture, childName), { force: true })

      if (childName === 'index.html') {
        await writeFile(
          outsidePath,
          '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro"><h1 data-hf-element-id="title">Outside</h1></section></div></body></html>',
        )
      } else if (childName === 'animation-manifest.json') {
        await writeFile(
          outsidePath,
          JSON.stringify({
            schemaVersion: 1,
            fps: 30,
            durationInFrames: 90,
            scenes: [{ id: 'intro', fromFrame: 0, durationFrames: 90 }],
            animations: [],
          }),
        )
      } else {
        await writeFile(outsidePath, JSON.stringify({ id: 'outside-metadata', name: 'Outside metadata' }))
      }

      await symlink(outsidePath, join(fixture, childName))

      await expect(importHyperframesProject({
        sourcePath: fixture,
        projectRoot: await temporaryDirectory('course-workbench-projects-'),
        allowedSourceRoots: [sourceRoot],
        aspects: ['16:9'],
      })).rejects.toMatchObject({
        code: 'SOURCE_CHILD_NOT_ALLOWED',
        stage: 'import',
        subject: expect.stringContaining(childName),
      })
    },
    30_000,
  )

  it.skipIf(!existsSync(realFixture))('rejects selected render media that resolves outside the imported project', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-contained-source-')
    const fixture = await createDeclaredFixture(sourceRoot)
    await mkdir(join(fixture, 'renders'))
    await symlink(
      join(realFixture, 'renders', 'codex-keyframes-tutorial.mp4'),
      join(fixture, 'renders', 'declared-course.mp4'),
    )

    await expect(importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })).rejects.toMatchObject({
      code: 'SOURCE_CHILD_NOT_ALLOWED',
      subject: expect.stringContaining('renders/declared-course.mp4'),
    })
  }, 30_000)

  it('rejects a migration backup symlink before any outside write', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-contained-source-')
    const fixture = join(sourceRoot, 'legacy-course')
    const outsideBackup = await temporaryDirectory('course-workbench-outside-backup-')
    await mkdir(join(fixture, 'assets'), { recursive: true })
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1080" data-height="1920"><section><h1>Legacy</h1></section></div></body></html>',
    )
    await symlink(outsideBackup, join(fixture, '.workbench-backup'))

    await expect(importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      applyMetadata: true,
      aspects: ['9:16'],
    })).rejects.toMatchObject({
      code: 'SOURCE_CHILD_NOT_ALLOWED',
      subject: expect.stringContaining('.workbench-backup'),
    })
    await expect(readdir(outsideBackup)).resolves.toEqual([])
  }, 30_000)
})

describe('runtime visibility sampling', () => {
  it('derives first and last visible frames from computed runtime state and geometry', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-visibility-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'visibility-course')
    await writeFile(
      join(fixture, 'index.html'),
      `<!doctype html><html><body>
        <div data-composition-id="main" data-width="1920" data-height="1080">
          <section data-hf-scene-id="intro">
            <h1 id="window" data-hf-element-id="window" data-hf-role="title" style="width: 200px; height: 80px; opacity: 0">Window</h1>
            <div data-hf-element-id="display-none" data-hf-role="note" style="display: none; width: 100px; height: 40px">Hidden</div>
            <div data-hf-element-id="zero-geometry" data-hf-role="note" style="width: 0; height: 0">Zero</div>
          </section>
        </div>
        <script>
          window.__timelines = {
            main: {
              seek(time) {
                document.getElementById('window').style.opacity = time >= 0.5 && time < 0.8 ? '1' : '0';
              }
            }
          };
        </script>
      </body></html>`,
    )
    await writeFile(
      join(fixture, 'animation-manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        fps: 30,
        durationInFrames: 30,
        scenes: [{ id: 'intro', fromFrame: 0, durationFrames: 30 }],
        animations: [],
      }),
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    expect(imported.elementMap.window.visibility).toEqual({ fromFrame: 15, toFrame: 24 })
    expect(imported.elementMap['display-none'].visibility).toEqual({ fromFrame: 0, toFrame: 0 })
    expect(imported.elementMap['zero-geometry'].visibility).toEqual({ fromFrame: 0, toFrame: 0 })
  }, 30_000)

  it('preserves a target scene that is legitimately hidden by the source', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-hidden-scene-source-')
    const fixture = await createDeclaredFixture(sourceRoot, 'hidden-scene-course')
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><section data-hf-scene-id="intro" style="visibility: hidden"><h1 data-hf-element-id="title" style="width: 200px; height: 80px">Hidden scene</h1></section></div></body></html>',
    )

    const imported = await importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
      aspects: ['16:9'],
    })

    expect(imported.status).toBe('ready')

    if (imported.status !== 'ready') {
      throw new Error('Expected a ready import result')
    }

    expect(imported.elementMap.title.visibility).toEqual({ fromFrame: 0, toFrame: 0 })
  }, 30_000)
})

describe('unresolved migration reporting', () => {
  it('returns the migration report instead of throwing before the UI can render counts', async () => {
    const sourceRoot = await temporaryDirectory('course-workbench-unresolved-source-')
    const fixture = join(sourceRoot, 'unresolved-course')
    await mkdir(join(fixture, 'assets'), { recursive: true })
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main" data-width="1920" data-height="1080"><main>No stable scene</main></div></body></html>',
    )

    await expect(importHyperframesProject({
      sourcePath: fixture,
      projectRoot: await temporaryDirectory('course-workbench-projects-'),
      allowedSourceRoots: [sourceRoot],
    })).resolves.toEqual(expect.objectContaining({
      status: 'unresolved',
      migrationReport: expect.objectContaining({
        applied: false,
        summary: {
          recognized: 0,
          needsMetadata: 0,
          unresolved: 1,
        },
      }),
    }))
  })
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

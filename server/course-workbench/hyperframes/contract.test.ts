import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateHyperframesContract } from './contract.js'
import { applyHyperframesMigration, planHyperframesMigration } from './migrator.js'

const temporaryPaths: string[] = []

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix))
  temporaryPaths.push(path)
  return path
}

async function createLegacyFixture(): Promise<{ root: string; html: string }> {
  const root = await createTemporaryDirectory('hyperframes-contract-')
  const html = join(root, 'index.html')

  await writeFile(
    html,
    [
      '<!doctype html>',
      '<html><body>',
      '  <section class="scene"><h1>Build better courses</h1></section>',
      '</body></html>',
    ].join('\n'),
  )

  return { root, html }
}

async function writeManifest(root: string, manifest: unknown): Promise<void> {
  await writeFile(join(root, 'animation-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
}

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe('HyperFrames source contract', () => {
  it('reports missing scene and element ids without modifying source', async () => {
    const legacyFixture = await createLegacyFixture()
    const report = await planHyperframesMigration(legacyFixture.root)

    expect(report.summary).toEqual({ recognized: 0, needsMetadata: 2, unresolved: 0 })
    expect(await readFile(legacyFixture.html, 'utf8')).not.toContain('data-hf-element-id')
  })

  it('creates a backup and a manifest whose target exists in HTML', async () => {
    const legacyFixture = await createLegacyFixture()
    const result = await applyHyperframesMigration(await planHyperframesMigration(legacyFixture.root))

    expect(result.backupPath).toMatch(/\.workbench-backup\//)
    await expect(readFile(join(result.backupPath, 'index.html'), 'utf8')).resolves.toContain('<h1>Build better courses</h1>')
    await expect(validateHyperframesContract(legacyFixture.root)).resolves.toMatchObject({ valid: true })
  })

  it('preserves a valid manifest when a source already has complete metadata', async () => {
    const root = await createTemporaryDirectory('hyperframes-complete-contract-')
    await writeFile(
      join(root, 'index.html'),
      '<section data-hf-scene-id="scene-intro"><h1 data-hf-element-id="intro-title">Intro</h1></section>',
    )
    await writeManifest(root, {
      schemaVersion: 1,
      fps: 30,
      durationInFrames: 90,
      scenes: [{ id: 'scene-intro', fromFrame: 0, durationFrames: 90 }],
      animations: [
        {
          id: 'intro-title-enter',
          sceneId: 'scene-intro',
          targetElementId: 'intro-title',
          fromFrame: 0,
          durationFrames: 24,
          kind: 'slide-in',
          exportRole: 'baked-internal',
          properties: ['transform', 'opacity'],
        },
      ],
    })
    const originalManifest = await readFile(join(root, 'animation-manifest.json'), 'utf8')

    await applyHyperframesMigration(await planHyperframesMigration(root))

    await expect(readFile(join(root, 'animation-manifest.json'), 'utf8')).resolves.toBe(originalManifest)
  })

  it('rejects duplicate animation ids, invalid frame ranges, missing targets, and platform overlays', async () => {
    const root = await createTemporaryDirectory('hyperframes-invalid-contract-')
    await mkdir(root, { recursive: true })
    await writeFile(
      join(root, 'index.html'),
      '<section data-hf-scene-id="scene-intro"><h1 data-hf-element-id="intro-title">Intro</h1></section>',
    )
    await writeManifest(root, {
      schemaVersion: 1,
      fps: 30,
      durationInFrames: 90,
      scenes: [{ id: 'scene-intro', fromFrame: 0, durationFrames: 90 }],
      animations: [
        {
          id: 'duplicate',
          sceneId: 'scene-intro',
          targetElementId: 'missing-target',
          fromFrame: -1,
          durationFrames: 0,
          kind: 'slide-in',
          exportRole: 'platform-overlay',
          properties: ['opacity'],
        },
        {
          id: 'duplicate',
          sceneId: 'scene-intro',
          targetElementId: 'intro-title',
          fromFrame: 12,
          durationFrames: 12,
          kind: 'fade-in',
          exportRole: 'baked-internal',
          properties: ['opacity'],
        },
      ],
    })

    await expect(validateHyperframesContract(root)).resolves.toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.stringMatching(/duplicate animation id/i),
        expect.stringMatching(/targetElementId/i),
        expect.stringMatching(/fromFrame/i),
        expect.stringMatching(/durationFrames/i),
        expect.stringMatching(/platform-overlay/i),
      ]),
    })
  })
})

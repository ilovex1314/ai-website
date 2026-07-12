import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyAnimationOverrides,
  type HyperframesAnimationOverride,
} from './animationOverrides.js'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('HyperFrames animation overrides', () => {
  it('materializes a patched copy while preserving the upstream project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hf-overrides-'))
    temporaryPaths.push(root)
    const sourceRoot = join(root, 'source')
    const targetRoot = join(root, 'working-copy')
    await mkdir(sourceRoot)
    const sourceHtml = '<!doctype html><html><body><div data-composition-id="main"></div><script>window.__timelines={main:{}};</script></body></html>'
    await writeFile(join(sourceRoot, 'index.html'), sourceHtml)
    const overrides: HyperframesAnimationOverride[] = [
      {
        animationId: 'runtime-title-15-entrance-1',
        operation: 'disable',
        fallback: 'show-final-state-at-start',
      },
      {
        animationId: 'runtime-title-80-move-2',
        operation: 'modify',
        fromFrame: 100,
        durationFrames: 45,
        ease: 'power2.out',
      },
    ]

    const result = await applyAnimationOverrides({
      sourceRoot,
      targetRoot,
      fps: 30,
      overrides,
    })

    expect(await readFile(join(sourceRoot, 'index.html'), 'utf8')).toBe(sourceHtml)
    expect(await readFile(result.overridesPath, 'utf8')).toContain('show-final-state-at-start')
    const patchedHtml = await readFile(result.entryHtmlPath, 'utf8')
    expect(patchedHtml).toContain('__COURSE_WORKBENCH_ANIMATION_OVERRIDES__')
    expect(patchedHtml).toContain('runtime-title-15-entrance-1')
    expect(patchedHtml).toContain('tween.progress(1)')
    expect(patchedHtml).toContain('tween.startTime(override.fromFrame / FPS)')
    expect(patchedHtml).toContain('tween.duration(override.durationFrames / FPS)')
  })

  it('prefers the stable animation ID authored by HyperFrames over a generated runtime ID', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hf-stable-overrides-'))
    temporaryPaths.push(root)
    const sourceRoot = join(root, 'source')
    const targetRoot = join(root, 'working-copy')
    await mkdir(sourceRoot)
    await writeFile(
      join(sourceRoot, 'index.html'),
      '<!doctype html><html><body><div data-composition-id="main"></div></body></html>',
    )

    const result = await applyAnimationOverrides({
      sourceRoot,
      targetRoot,
      fps: 30,
      overrides: [{ animationId: 'result-title-enter', operation: 'disable' }],
    })
    const patchedHtml = await readFile(result.entryHtmlPath, 'utf8')

    expect(patchedHtml).toContain('vars.data?.hfAnimationId')
    expect(patchedHtml).toContain('stableAnimationId ||')
  })
})

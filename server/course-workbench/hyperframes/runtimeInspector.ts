/// <reference lib="dom" />

import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'
import type { CanvasAspectRatio } from '../../../src/features/remotion-course-workbench/workbenchTypes.js'
import { WorkbenchServiceError } from '../projectRepository.js'
import type { AnimationManifest } from './contract.js'

export type PixelRect = {
  x: number
  y: number
  width: number
  height: number
}

export type RuntimeScene = {
  id: string
  fromFrame: number
  durationFrames: number
  thumbnailRef: string
}

export type RuntimeElement = {
  id: string
  sceneId: string
  role: string
  selector: string
  text: string
  depth: number
  thumbnailRef: string
  visibility: {
    fromFrame: number
    toFrame: number
  }
  rectsByAspect: Partial<Record<CanvasAspectRatio, PixelRect>>
}

export type RuntimeInspection = {
  sourceDimensions: { width: number; height: number }
  sceneMap: Record<string, RuntimeScene>
  elementMap: Record<string, RuntimeElement>
}

const viewports: Record<CanvasAspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
}

function isContained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))
}

async function serveProject(root: string): Promise<{ server: Server; url: string }> {
  const canonicalRoot = await realpath(root)
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
      const requested = resolve(canonicalRoot, `.${pathname === '/' ? '/index.html' : pathname}`)
      const canonicalFile = await realpath(requested)

      if (!isContained(canonicalRoot, canonicalFile) || !(await stat(canonicalFile)).isFile()) {
        response.writeHead(404).end()
        return
      }

      response.writeHead(200, {
        'content-type': mimeTypes[extname(canonicalFile).toLowerCase()] ?? 'application/octet-stream',
      })
      createReadStream(canonicalFile).pipe(response)
    } catch {
      response.writeHead(404).end()
    }
  })

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolveListen()
    })
  })
  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('Runtime inspector did not receive a TCP port')
  }

  return { server, url: `http://127.0.0.1:${address.port}/index.html` }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()))
  })
}

function thumbnailRef(aspect: CanvasAspectRatio, sceneId: string): string {
  return `hyperframes/thumbnails/${aspect.replace(':', 'x')}/${sceneId}.png`
}

export async function inspectHyperframesRuntime(
  root: string,
  manifest: AnimationManifest,
  aspects: CanvasAspectRatio[],
): Promise<RuntimeInspection> {
  const { server, url } = await serveProject(root)
  const browser = await chromium.launch({ headless: true })
  const sceneMap: Record<string, RuntimeScene> = {}
  const elementMap: Record<string, RuntimeElement> = {}
  let sourceDimensions: RuntimeInspection['sourceDimensions'] | undefined

  try {
    for (const aspect of aspects) {
      const page = await browser.newPage({ viewport: viewports[aspect] })
      await page.goto(url, { waitUntil: 'load' })
      await page.waitForFunction(() => document.readyState === 'complete')

      const dimensions = await page.evaluate(() => {
        const composition = document.querySelector<HTMLElement>('[data-composition-id]')
        const width = Number(composition?.dataset.width) || composition?.offsetWidth || document.documentElement.scrollWidth
        const height = Number(composition?.dataset.height) || composition?.offsetHeight || document.documentElement.scrollHeight
        return { width, height }
      })
      sourceDimensions ??= dimensions

      for (const scene of manifest.scenes) {
        const sampleFrame = scene.fromFrame + Math.min(scene.durationFrames - 1, Math.floor(scene.durationFrames / 2))
        const sampled = await page.evaluate(
          ({ sceneId, seconds }) => {
            type SeekableTimeline = { seek(time: number, suppressEvents?: boolean): void }
            const timelines = (window as typeof window & { __timelines?: Record<string, SeekableTimeline> }).__timelines
            Object.values(timelines ?? {}).forEach((timeline) => timeline.seek(seconds, true))
            const sceneElement = document.querySelector<HTMLElement>(`[data-hf-scene-id="${CSS.escape(sceneId)}"]`)

            if (sceneElement === null) {
              return []
            }

            return Array.from(sceneElement.querySelectorAll<HTMLElement>('[data-hf-element-id]')).map((element) => {
              const rect = element.getBoundingClientRect()
              let depth = 0
              let parent = element.parentElement

              while (parent !== null && parent !== sceneElement) {
                depth += 1
                parent = parent.parentElement
              }

              return {
                id: element.dataset.hfElementId ?? '',
                role: element.dataset.hfRole ?? 'unknown',
                text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
                depth,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              }
            })
          },
          { sceneId: scene.id, seconds: sampleFrame / manifest.fps },
        )

        sceneMap[scene.id] ??= {
          id: scene.id,
          fromFrame: scene.fromFrame,
          durationFrames: scene.durationFrames,
          thumbnailRef: thumbnailRef(aspect, scene.id),
        }

        sampled.forEach((element) => {
          if (element.id.length === 0) {
            return
          }

          const existing = elementMap[element.id]
          elementMap[element.id] = {
            id: element.id,
            sceneId: scene.id,
            role: element.role,
            selector: `[data-hf-element-id="${element.id}"]`,
            text: element.text,
            depth: element.depth,
            thumbnailRef: thumbnailRef(aspect, scene.id),
            visibility: {
              fromFrame: scene.fromFrame,
              toFrame: scene.fromFrame + scene.durationFrames,
            },
            rectsByAspect: {
              ...existing?.rectsByAspect,
              [aspect]: element.rect,
            },
          }
        })
      }

      await page.close()
    }
  } finally {
    await browser.close()
    await closeServer(server)
  }

  for (const animation of manifest.animations) {
    if (elementMap[animation.targetElementId] === undefined) {
      throw new WorkbenchServiceError({
        code: 'ANIMATION_TARGET_MISSING',
        stage: 'import',
        message: `Animation ${animation.id} target is missing from the runtime DOM`,
        subject: animation.targetElementId,
        recovery: 'Add the declared data-hf-element-id to the runtime element or update animation-manifest.json.',
      })
    }
  }

  if (sourceDimensions === undefined) {
    throw new WorkbenchServiceError({
      code: 'SOURCE_CONTRACT_INVALID',
      stage: 'import',
      message: 'HyperFrames source dimensions could not be inspected',
      subject: join(root, 'index.html'),
      recovery: 'Declare data-width and data-height on the root data-composition-id element.',
    })
  }

  return { sourceDimensions, sceneMap, elementMap }
}

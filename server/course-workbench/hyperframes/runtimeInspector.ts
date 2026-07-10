/// <reference lib="dom" />

import { createReadStream } from 'node:fs'
import { mkdir, realpath, stat } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { chromium } from 'playwright'
import type { CanvasAspectRatio } from '../../../src/features/remotion-course-workbench/workbenchTypes.js'
import { resolveProjectArtifactPath, writeFileNoFollow } from '../pathSafety.js'
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
  thumbnailsByAspect: Partial<Record<CanvasAspectRatio, string>>
}

export type RuntimeElement = {
  id: string
  sceneId: string
  role: string
  selector: string
  text: string
  depth: number
  thumbnailsByAspect: Partial<Record<CanvasAspectRatio, string>>
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
  const safeSceneId = encodeURIComponent(sceneId).replaceAll('%', '_')
  return `hyperframes/thumbnails/${aspect.replace(':', 'x')}/${safeSceneId}.png`
}

function cssString(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0

    if (codePoint === 0) {
      return '\\fffd '
    }

    if ((codePoint >= 1 && codePoint <= 31) || codePoint === 127) {
      return `\\${codePoint.toString(16)} `
    }

    if (character === '"' || character === '\\') {
      return `\\${character}`
    }

    return character
  }).join('')
}

function elementSelector(elementId: string): string {
  return `[data-hf-element-id="${cssString(elementId)}"]`
}

export async function inspectHyperframesRuntime(
  root: string,
  manifest: AnimationManifest,
  aspects: CanvasAspectRatio[],
  projectDirectory: string,
): Promise<RuntimeInspection> {
  const { server, url } = await serveProject(root)
  const browser = await chromium.launch({ headless: true })
  const sceneMap: Record<string, RuntimeScene> = {}
  const elementMap: Record<string, RuntimeElement> = {}
  let sourceDimensions: RuntimeInspection['sourceDimensions'] | undefined

  try {
    for (const aspect of aspects) {
      const page = await browser.newPage({ viewport: viewports[aspect] })
      const aspectThumbnailReference = `hyperframes/thumbnails/${aspect.replace(':', 'x')}`
      const requestedAspectThumbnailDirectory = await resolveProjectArtifactPath(
        projectDirectory,
        aspectThumbnailReference,
      )
      await mkdir(requestedAspectThumbnailDirectory, { recursive: true })
      const aspectThumbnailDirectory = await resolveProjectArtifactPath(
        projectDirectory,
        aspectThumbnailReference,
        false,
      )
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
        const sampled = await page.evaluate(
          ({ sceneId, fromFrame, durationFrames, fps }) => {
            type SeekableTimeline = { seek(time: number, suppressEvents?: boolean): void }
            type SampledElement = {
              id: string
              role: string
              text: string
              depth: number
              rect: PixelRect
              firstVisibleFrame?: number
              lastVisibleFrame?: number
            }
            const timelines = (window as typeof window & { __timelines?: Record<string, SeekableTimeline> }).__timelines
            const sceneElement = document.querySelector<HTMLElement>(`[data-hf-scene-id="${CSS.escape(sceneId)}"]`)

            if (sceneElement === null) {
              return []
            }

            const elements = new Map<string, SampledElement>()

            for (let frame = fromFrame; frame < fromFrame + durationFrames; frame += 1) {
              Object.values(timelines ?? {}).forEach((timeline) => timeline.seek(frame / fps, true))

              Array.from(sceneElement.querySelectorAll<HTMLElement>('[data-hf-element-id]')).forEach((element) => {
                const id = element.dataset.hfElementId ?? ''

                if (id.length === 0) {
                  return
                }

                const bounds = element.getBoundingClientRect()
                const rect = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
                let depth = 0
                let parent = element.parentElement

                while (parent !== null && parent !== sceneElement) {
                  depth += 1
                  parent = parent.parentElement
                }

                let rendered = element.isConnected && rect.width > 0 && rect.height > 0
                let visibilityNode: HTMLElement | null = element

                while (rendered && visibilityNode !== null) {
                  const style = getComputedStyle(visibilityNode)
                  rendered = style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && style.visibility !== 'collapse'
                    && Number(style.opacity) > 0.001
                  visibilityNode = visibilityNode.parentElement
                }

                const existing = elements.get(id) ?? {
                  id,
                  role: element.dataset.hfRole ?? 'unknown',
                  text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
                  depth,
                  rect,
                }

                if (rendered) {
                  existing.firstVisibleFrame ??= frame
                  existing.lastVisibleFrame = frame
                  existing.rect = rect
                }

                elements.set(id, existing)
              })
            }

            return [...elements.values()]
          },
          {
            sceneId: scene.id,
            fromFrame: scene.fromFrame,
            durationFrames: scene.durationFrames,
            fps: manifest.fps,
          },
        )

        const reference = thumbnailRef(aspect, scene.id)
        const thumbnailPath = await resolveProjectArtifactPath(
          aspectThumbnailDirectory,
          reference.split('/').at(-1) ?? 'scene.png',
        )
        const thumbnailFrame = scene.fromFrame + Math.min(scene.durationFrames - 1, Math.floor(scene.durationFrames / 2))
        await page.evaluate(
          ({ seconds }) => {
            type SeekableTimeline = { seek(time: number, suppressEvents?: boolean): void }
            const timelines = (window as typeof window & { __timelines?: Record<string, SeekableTimeline> }).__timelines
            Object.values(timelines ?? {}).forEach((timeline) => timeline.seek(seconds, true))
          },
          { seconds: thumbnailFrame / manifest.fps },
        )
        await page.evaluate((sceneId) => {
          type InspectorWindow = typeof window & {
            __hfInspectorSceneVisibility?: Array<{ element: HTMLElement; visibility: string }>
          }
          const inspectorWindow = window as InspectorWindow
          const target = document.querySelector<HTMLElement>(`[data-hf-scene-id="${CSS.escape(sceneId)}"]`)
          inspectorWindow.__hfInspectorSceneVisibility = Array.from(
            document.querySelectorAll<HTMLElement>('[data-hf-scene-id]'),
          ).map((element) => ({ element, visibility: element.style.visibility }))
          inspectorWindow.__hfInspectorSceneVisibility.forEach(({ element }) => {
            if (element !== target) {
              element.style.visibility = 'hidden'
            }
          })
        }, scene.id)

        try {
          const thumbnail = await page.screenshot()
          await writeFileNoFollow(thumbnailPath, thumbnail)
        } finally {
          await page.evaluate(() => {
            type InspectorWindow = typeof window & {
              __hfInspectorSceneVisibility?: Array<{ element: HTMLElement; visibility: string }>
            }
            const inspectorWindow = window as InspectorWindow
            inspectorWindow.__hfInspectorSceneVisibility?.forEach(({ element, visibility }) => {
              element.style.visibility = visibility
            })
            delete inspectorWindow.__hfInspectorSceneVisibility
          })
        }

        const existingScene = sceneMap[scene.id]
        sceneMap[scene.id] = {
          id: scene.id,
          fromFrame: scene.fromFrame,
          durationFrames: scene.durationFrames,
          thumbnailsByAspect: {
            ...existingScene?.thumbnailsByAspect,
            [aspect]: reference,
          },
        }

        sampled.forEach((element) => {
          if (element.id.length === 0) {
            return
          }

          const existing = elementMap[element.id]
          const sampledVisibility = element.firstVisibleFrame === undefined
            ? { fromFrame: scene.fromFrame, toFrame: scene.fromFrame }
            : { fromFrame: element.firstVisibleFrame, toFrame: (element.lastVisibleFrame ?? element.firstVisibleFrame) + 1 }
          const existingIsVisible = existing !== undefined
            && existing.visibility.toFrame > existing.visibility.fromFrame
          const sampledIsVisible = sampledVisibility.toFrame > sampledVisibility.fromFrame
          const visibility = existingIsVisible && sampledIsVisible
            ? {
                fromFrame: Math.min(existing.visibility.fromFrame, sampledVisibility.fromFrame),
                toFrame: Math.max(existing.visibility.toFrame, sampledVisibility.toFrame),
              }
            : existingIsVisible
              ? existing.visibility
              : sampledVisibility
          elementMap[element.id] = {
            id: element.id,
            sceneId: scene.id,
            role: element.role,
            selector: elementSelector(element.id),
            text: element.text,
            depth: element.depth,
            thumbnailsByAspect: {
              ...existing?.thumbnailsByAspect,
              [aspect]: reference,
            },
            visibility,
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
    const target = elementMap[animation.targetElementId]

    if (target === undefined) {
      throw new WorkbenchServiceError({
        code: 'ANIMATION_TARGET_MISSING',
        stage: 'import',
        message: `Animation ${animation.id} target is missing from the runtime DOM`,
        subject: animation.targetElementId,
        recovery: 'Add the declared data-hf-element-id to the runtime element or update animation-manifest.json.',
      })
    }

    if (target.sceneId !== animation.sceneId) {
      throw new WorkbenchServiceError({
        code: 'ANIMATION_TARGET_SCENE_MISMATCH',
        stage: 'import',
        message: `Animation ${animation.id} target belongs to scene ${target.sceneId}, not ${animation.sceneId}`,
        subject: animation.targetElementId,
        recovery: 'Update animation-manifest.json so sceneId owns the declared target element.',
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

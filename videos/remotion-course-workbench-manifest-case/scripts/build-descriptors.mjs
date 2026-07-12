import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'

const root = resolve(import.meta.dirname, '..')
const fps = 30
const durationInFrames = 3300
const scenes = [
  { id: 'scene-result', fromFrame: 0, durationFrames: 420 },
  { id: 'scene-product-model', fromFrame: 420, durationFrames: 450 },
  { id: 'scene-workflow', fromFrame: 870, durationFrames: 450 },
  { id: 'scene-editor', fromFrame: 1320, durationFrames: 480 },
  { id: 'scene-manifest', fromFrame: 1800, durationFrames: 510 },
  { id: 'scene-edit-model', fromFrame: 2310, durationFrames: 510 },
  { id: 'scene-output', fromFrame: 2820, durationFrames: 480 },
]

const sceneElementIds = [
  ['result-eyebrow', 'result-title', 'result-preview', 'result-note'],
  ['model-eyebrow', 'model-title', 'model-architecture', 'model-note'],
  ['workflow-eyebrow', 'workflow-title', 'workflow-diagram', 'workflow-steps'],
  ['editor-eyebrow', 'editor-title', 'editor-workbench', 'editor-action-library', 'editor-steps'],
  ['manifest-eyebrow', 'manifest-title', 'manifest-workbench', 'manifest-contract'],
  ['edit-eyebrow', 'edit-title', 'edit-model', 'edit-note'],
  ['output-eyebrow', 'output-title', 'output-flow', 'output-note'],
]

const scenePassiveElementIds = [
  ['result-preview-image'],
  ['model-architecture-image'],
  ['workflow-diagram-image'],
  ['editor-workbench-image', 'editor-action-library-image'],
  ['manifest-workbench-image'],
  [],
  [],
]

const html = await readFile(resolve(root, 'index.html'), 'utf8')
const document = new JSDOM(html).window.document
const sceneByElement = new Map()

scenes.forEach((scene, index) => {
  ;[...sceneElementIds[index], ...scenePassiveElementIds[index]].forEach((elementId) => sceneByElement.set(elementId, scene))
})

const elements = Object.fromEntries(
  [...document.querySelectorAll('[data-hf-element-id]')].map((element) => {
    const id = element.getAttribute('data-hf-element-id')
    const scene = sceneByElement.get(id)
    if (!scene) throw new Error(`No scene timing declared for ${id}`)
    return [id, {
      id,
      sceneId: scene.id,
      role: element.getAttribute('data-hf-role') || 'unknown',
      selector: `[data-hf-element-id="${id}"]`,
      text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
      depth: 1,
      visibility: {
        fromFrame: scene.fromFrame,
        toFrame: scene.fromFrame + scene.durationFrames,
      },
      rectsByAspect: {},
      thumbnailsByAspect: {},
    }]
  }),
)

const animations = []
scenes.forEach((scene, sceneIndex) => {
  sceneElementIds[sceneIndex].forEach((elementId, elementIndex) => {
    const isEyebrow = elementIndex === 0
    const isTitle = elementIndex === 1
    animations.push({
      id: `${elementId}-enter`,
      sceneId: scene.id,
      targetElementId: elementId,
      fromFrame: scene.fromFrame + (isEyebrow ? 5 : isTitle ? 10 : 25 + (elementIndex - 2) * 6),
      durationFrames: isEyebrow ? 14 : isTitle ? 19 : 20,
      kind: isTitle ? 'title-enter' : isEyebrow ? 'label-enter' : 'content-enter',
      exportRole: 'baked-internal',
      properties: isTitle || isEyebrow ? ['opacity', 'transform.y'] : ['opacity', 'transform.y', 'transform.scale'],
    })
  })
})

animations.push(
  { id: 'result-preview-focus', sceneId: 'scene-result', targetElementId: 'result-preview-image', fromFrame: 42, durationFrames: 345, kind: 'slow-focus', exportRole: 'baked-internal', properties: ['transform.y', 'transform.scale'] },
  { id: 'model-architecture-focus', sceneId: 'scene-product-model', targetElementId: 'model-architecture-image', fromFrame: 462, durationFrames: 360, kind: 'slow-focus', exportRole: 'baked-internal', properties: ['transform.y', 'transform.scale'] },
  { id: 'workflow-diagram-focus', sceneId: 'scene-workflow', targetElementId: 'workflow-diagram-image', fromFrame: 912, durationFrames: 360, kind: 'slow-focus', exportRole: 'baked-internal', properties: ['transform.y', 'transform.scale'] },
  { id: 'editor-workbench-pan', sceneId: 'scene-editor', targetElementId: 'editor-workbench-image', fromFrame: 1362, durationFrames: 375, kind: 'pan-focus', exportRole: 'baked-internal', properties: ['transform.x', 'transform.scale'] },
  { id: 'manifest-workbench-focus', sceneId: 'scene-manifest', targetElementId: 'manifest-workbench-image', fromFrame: 1842, durationFrames: 405, kind: 'slow-focus', exportRole: 'baked-internal', properties: ['transform.y', 'transform.scale'] },
)

await writeFile(resolve(root, 'animation-manifest.json'), `${JSON.stringify({
  schemaVersion: 1,
  fps,
  durationInFrames,
  scenes,
  animations,
}, null, 2)}\n`)

await writeFile(resolve(root, 'element-map.json'), `${JSON.stringify({
  schemaVersion: 1,
  sourceDimensions: { width: 1080, height: 1920 },
  elements,
}, null, 2)}\n`)

console.log(`wrote ${Object.keys(elements).length} elements and ${animations.length} animations`)

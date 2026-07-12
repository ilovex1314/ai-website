import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const baseUrl = process.env.HF_CAPTURE_URL || 'http://127.0.0.1:8123/index.html'
const mapPath = resolve(root, 'element-map.json')
const map = JSON.parse(await readFile(mapPath, 'utf8'))
const manifest = JSON.parse(await readFile(resolve(root, 'animation-manifest.json'), 'utf8'))
const thumbnails = resolve(root, 'assets', 'thumbnails')
await mkdir(thumbnails, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
await page.goto(baseUrl, { waitUntil: 'networkidle' })

for (const scene of manifest.scenes) {
  const heroFrame = scene.fromFrame + Math.min(scene.durationFrames - 1, 75)
  await page.evaluate(({ seconds }) => {
    Object.values(window.__timelines || {}).forEach((timeline) => timeline.seek(seconds, true))
  }, { seconds: heroFrame / manifest.fps })

  const sceneElements = Object.values(map.elements).filter((element) => element.sceneId === scene.id)
  for (const element of sceneElements) {
    const rect = await page.locator(element.selector).evaluate((node) => {
      const bounds = node.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    })
    element.rectsByAspect['9:16'] = rect
    element.thumbnailsByAspect['9:16'] = `assets/thumbnails/${scene.id}.png`
  }

  await page.screenshot({ path: resolve(thumbnails, `${scene.id}.png`) })
}

await browser.close()
await writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`)
console.log(`captured 9:16 geometry for ${Object.keys(map.elements).length} elements`)

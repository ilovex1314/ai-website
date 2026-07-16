import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.SHADERTOY_BASE_URL ?? 'http://127.0.0.1:5173'
const presets = ['aurora-orbit', 'liquid-grid', 'pulse-rings', 'neon-threads']
const output = new URL('../public/images/shadertoy-studio/', import.meta.url)

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })

try {
  await page.goto(`${baseUrl}/topics/shadertoy?view=gallery`, { waitUntil: 'networkidle' })
  await page.locator('.shader-stage canvas').waitFor()

  for (const id of presets) {
    await page.locator(`[data-preset-id="${id}"]`).click()
    const pause = page.getByRole('button', { name: '暂停动画' })
    if (await pause.isVisible()) await pause.click()
    await page.getByRole('button', { name: '重置时间' }).click()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const dataUrl = await page.locator('.shader-stage canvas').evaluate((canvas) =>
      canvas.toDataURL('image/webp', 0.86),
    )
    await writeFile(new URL(`${id}.webp`, output), Buffer.from(dataUrl.split(',')[1], 'base64'))
  }
} finally {
  await browser.close()
}

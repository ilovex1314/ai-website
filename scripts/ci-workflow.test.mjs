import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflowPath = resolve(import.meta.dirname, '../.github/workflows/deploy-pages.yml')

describe('Cloudflare deployment workflow', () => {
  it('installs browser and media runtime dependencies before tests', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const playwrightInstallIndex = workflow.indexOf('npx playwright install --with-deps chromium')
    const ffmpegInstallIndex = workflow.indexOf('sudo apt-get install -y ffmpeg')
    const testIndex = workflow.indexOf('npm test')

    expect(playwrightInstallIndex).toBeGreaterThan(-1)
    expect(ffmpegInstallIndex).toBeGreaterThan(-1)
    expect(testIndex).toBeGreaterThan(playwrightInstallIndex)
    expect(testIndex).toBeGreaterThan(ffmpegInstallIndex)
  })
})

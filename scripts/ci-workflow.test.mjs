import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflowPath = resolve(import.meta.dirname, '../.github/workflows/deploy-pages.yml')

describe('Cloudflare deployment workflow', () => {
  it('installs Playwright Chromium before running runtime inspection tests', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const installIndex = workflow.indexOf('npx playwright install --with-deps chromium')
    const testIndex = workflow.indexOf('npm test')

    expect(installIndex).toBeGreaterThan(-1)
    expect(testIndex).toBeGreaterThan(installIndex)
  })
})

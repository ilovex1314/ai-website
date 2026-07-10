#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = process.argv[2]

if (root === undefined) {
  console.error('Usage: node tools/hyperframes-course-source/scripts/migrate.mjs <project-folder>')
  process.exitCode = 2
} else {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
  const migratorUrl = pathToFileURL(resolve(repositoryRoot, 'server/course-workbench/hyperframes/migrator.ts')).href
  const program =
    'import(' +
    JSON.stringify(migratorUrl) +
    ').then(async ({ planHyperframesMigration, applyHyperframesMigration }) => {' +
    'const plan = await planHyperframesMigration(' +
    JSON.stringify(resolve(root)) +
    ');' +
    'console.log(JSON.stringify({ summary: plan.summary, patches: plan.patches }, null, 2));' +
    'const result = await applyHyperframesMigration(plan);' +
    'console.log(JSON.stringify(result, null, 2));' +
    '})'
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', program], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  })

  process.exitCode = result.status ?? 1
}

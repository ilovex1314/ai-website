import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '..')

describe('Course Workbench quick-start script', () => {
  it('starts the existing supervised course service command from the repository root', async () => {
    const fakeBin = await mkdtemp(join(tmpdir(), 'course-workbench-bin-'))
    const invocationFile = join(fakeBin, 'npm-invocation.txt')
    const fakeNpm = join(fakeBin, 'npm')
    await writeFile(
      fakeNpm,
      `#!/usr/bin/env bash\nprintf '%s\\n' "$PWD|$*" > "${invocationFile}"\n`,
    )
    await chmod(fakeNpm, 0o755)

    await executeFile('bash', [join(repositoryRoot, 'start-course-workbench.sh')], {
      cwd: tmpdir(),
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` },
    })

    await expect(readFile(invocationFile, 'utf8')).resolves.toBe(`${repositoryRoot}|run dev:course\n`)
  })
})

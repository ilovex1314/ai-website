import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkbenchClient } from '../../src/features/remotion-course-workbench/api/workbenchClient.js'
import type { CourseProjectV2 } from '../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'
import { createWorkbenchServer, type WorkbenchErrorBody } from './app.js'
import { createProjectRepository } from './projectRepository.js'

const validProject: CourseProjectV2 = {
  version: 2,
  id: 'codex-keyframes-tutorial',
  title: 'Codex Keyframes Tutorial',
  fps: 30,
  activeAspectRatio: '9:16',
  source: {
    background: {
      id: 'hf-codex-keyframes-tutorial',
      projectPath: '/projects/codex-keyframes-tutorial',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
    },
    bakedAnimations: [],
  },
  actionTemplates: [],
  actionInstances: [],
}

const temporaryPaths: string[] = []

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix))
  temporaryPaths.push(path)
  return path
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('Expected workbench server to bind to a TCP port')
  }

  return `http://127.0.0.1:${address.port}`
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { force: true, recursive: true })))
})

describe('project repository', () => {
  it('writes project.json atomically and reloads it', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const repo = createProjectRepository(projectRoot)

    await repo.save(validProject)

    await expect(repo.load(validProject.id)).resolves.toEqual(validProject)
    expect(existsSync(join(projectRoot, validProject.id, 'project.json.tmp'))).toBe(false)
  })

  it('rejects a project path outside configured roots', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const allowedSourceRoot = await createTemporaryDirectory('course-workbench-sources-')
    const repo = createProjectRepository(projectRoot, [allowedSourceRoot])

    await expect(repo.importPath('/private/etc')).rejects.toMatchObject({
      code: 'SOURCE_NOT_ALLOWED',
    })
  })

  it('resolves an imported project path inside an allowed source root', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const allowedSourceRoot = await createTemporaryDirectory('course-workbench-sources-')
    const sourceProject = join(allowedSourceRoot, 'intro-course')
    await mkdir(sourceProject)
    await writeFile(join(sourceProject, 'index.html'), '<main>Course</main>')
    const repo = createProjectRepository(projectRoot, [allowedSourceRoot])

    await expect(repo.importPath(sourceProject)).resolves.toBe(await realpath(sourceProject))
  })
})

describe('workbench server', () => {
  it('serves JSON health and project routes through WorkbenchClient', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [projectRoot],
      port: 0,
      agentProvider: 'mock',
    })
    const baseUrl = await listen(server)

    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`)
      expect(healthResponse.headers.get('content-type')).toContain('application/json')
      await expect(healthResponse.json()).resolves.toEqual({ status: 'ok' })

      const client = new WorkbenchClient({ baseUrl: `${baseUrl}/api` })
      await expect(client.saveProject(validProject)).resolves.toEqual(validProject)
      await expect(client.listProjects()).resolves.toEqual([validProject])
      await expect(client.loadProject(validProject.id)).resolves.toEqual(validProject)
    } finally {
      await close(server)
    }
  })

  it('returns a structured error when the route id does not match the saved project', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [projectRoot],
      port: 0,
      agentProvider: 'mock',
    })
    const baseUrl = await listen(server)

    try {
      const response = await fetch(`${baseUrl}/api/projects/not-the-project-id`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validProject),
      })

      expect(response.status).toBe(400)
      const body = (await response.json()) as WorkbenchErrorBody
      expect(body).toEqual({
        code: 'PROJECT_ID_MISMATCH',
        stage: 'save',
        message: 'Route project id must match the submitted project id',
        subject: 'not-the-project-id',
        recovery: 'Save the project at the route matching its id.',
      })
    } finally {
      await close(server)
    }
  })
})

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, realpath, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { WorkbenchClient } from '../../src/features/remotion-course-workbench/api/workbenchClient.js'
import type { CourseProjectV2 } from '../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'
import { createWorkbenchServer, type WorkbenchErrorBody } from './app.js'
import { createProjectRepository } from './projectRepository.js'

const temporaryPaths: string[] = []
const execFileAsync = promisify(execFile)

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix))
  temporaryPaths.push(path)
  return path
}

async function createSourceProject(): Promise<string> {
  const sourceRoot = await createTemporaryDirectory('course-workbench-sources-')
  const sourceProject = join(sourceRoot, 'codex-keyframes-tutorial')
  await mkdir(join(sourceProject, 'assets'), { recursive: true })
  await mkdir(join(sourceProject, 'actions'), { recursive: true })
  await writeFile(join(sourceProject, 'index.html'), '<main>Course</main>')
  await writeFile(join(sourceProject, 'actions', 'circle.ts'), 'export {}')
  return realpath(sourceProject)
}

async function createLegacyHyperframesSource(): Promise<{ sourceProject: string; sourceRoot: string }> {
  const sourceRoot = await createTemporaryDirectory('course-workbench-hyperframes-')
  const sourceProject = join(sourceRoot, 'legacy-course')
  await mkdir(join(sourceProject, 'assets'), { recursive: true })
  await writeFile(
    join(sourceProject, 'index.html'),
    '<!doctype html><html><body><div data-composition-id="main" data-width="1080" data-height="1920"><section><h1>Legacy title</h1></section></div></body></html>',
  )
  return { sourceProject: await realpath(sourceProject), sourceRoot }
}

async function createForegroundMedia(): Promise<{ bytes: Buffer; name: string }> {
  const root = await createTemporaryDirectory('course-workbench-foreground-')
  const path = join(root, 'speaker.mp4')
  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=black:s=320x240:r=30:d=0.25',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=0.25',
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    path,
  ])
  return { bytes: await readFile(path), name: 'speaker.mp4' }
}

function createValidProject(sourceProject: string, title = 'Codex Keyframes Tutorial'): CourseProjectV2 {
  return {
    version: 2,
    id: 'codex-keyframes-tutorial',
    title,
    fps: 30,
    activeAspectRatio: '9:16',
    source: {
      background: {
        id: 'hf-codex-keyframes-tutorial',
        projectPath: sourceProject,
        entryHtml: 'index.html',
        assetsDir: 'assets',
        sourceAspectRatio: '9:16',
      },
      bakedAnimations: [],
    },
    actionTemplates: [
      {
        id: 'circle-mark',
        name: 'Red Circle',
        category: 'circle',
        description: 'Marks an important title.',
        status: 'ready',
        version: '1.0.0',
        defaultDurationFrames: 80,
        params: {},
        presets: [],
        implementation: {
          mode: 'custom-component',
          intent: 'Marks an important title.',
          componentContract: 'Render a circle from typed params.',
          outputFiles: ['actions/circle.ts'],
          acceptance: ['Preview reflects params immediately'],
        },
      },
    ],
    actionInstances: [],
  }
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
    const sourceProject = await createSourceProject()
    const validProject = createValidProject(sourceProject)
    const repo = createProjectRepository(projectRoot, [sourceProject])

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

  it('rejects saves when persisted source paths escape configured roots', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    const outsideRoot = await createTemporaryDirectory('course-workbench-outside-')
    await mkdir(join(outsideRoot, 'assets'))
    await mkdir(join(outsideRoot, 'actions'))
    await writeFile(join(outsideRoot, 'index.html'), '<main>Outside</main>')
    await writeFile(join(outsideRoot, 'actions', 'circle.ts'), 'export {}')
    const repo = createProjectRepository(projectRoot, [sourceProject])
    const illegalPaths = [
      (project: CourseProjectV2) => {
        project.source.background.projectPath = outsideRoot
      },
      (project: CourseProjectV2) => {
        project.source.background.entryHtml = join(outsideRoot, 'index.html')
      },
      (project: CourseProjectV2) => {
        project.source.background.assetsDir = join(outsideRoot, 'assets')
      },
      (project: CourseProjectV2) => {
        project.actionTemplates[0].implementation.outputFiles = [join(outsideRoot, 'actions', 'circle.ts')]
      },
      (project: CourseProjectV2) => {
        project.actionTemplates[0].params = { projectPath: outsideRoot }
      },
    ]

    for (const setIllegalPath of illegalPaths) {
      const project = createValidProject(sourceProject)
      setIllegalPath(project)

      await expect(repo.save(project)).rejects.toMatchObject({
        code: 'PERSISTED_PATH_NOT_ALLOWED',
      })
    }
  })

  it('removes its unique temporary file when rename fails', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    const repo = createProjectRepository(projectRoot, [sourceProject], {
      rename: async () => {
        throw new Error('simulated rename failure')
      },
    })

    await expect(repo.save(createValidProject(sourceProject))).rejects.toThrow('simulated rename failure')

    const projectDirectory = join(projectRoot, 'codex-keyframes-tutorial')
    await expect(readdir(projectDirectory)).resolves.not.toContainEqual(expect.stringMatching(/\.tmp$/))
  })

  it('removes its unique temporary file when write fails', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    const repo = createProjectRepository(projectRoot, [sourceProject], {
      writeFile: async (file, data) => {
        await writeFile(file, data)
        throw new Error('simulated write failure')
      },
    })

    await expect(repo.save(createValidProject(sourceProject))).rejects.toThrow('simulated write failure')

    const projectDirectory = join(projectRoot, 'codex-keyframes-tutorial')
    await expect(readdir(projectDirectory)).resolves.not.toContainEqual(expect.stringMatching(/\.tmp$/))
  })

  it('serializes concurrent saves for the same project', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    let releaseFirstWrite: (() => void) | undefined
    let signalFirstWrite: (() => void) | undefined
    const firstWriteReleased = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve
    })
    const firstWriteStarted = new Promise<void>((resolve) => {
      signalFirstWrite = resolve
    })
    const writeTitles: string[] = []
    const repo = createProjectRepository(projectRoot, [sourceProject], {
      writeFile: async (file, data) => {
        const content = String(data)
        writeTitles.push(content.includes('First save') ? 'first' : 'second')

        if (writeTitles.length === 1) {
          signalFirstWrite!()
          await firstWriteReleased
        }

        await writeFile(file, data)
      },
    })
    const firstSave = repo.save(createValidProject(sourceProject, 'First save'))

    await firstWriteStarted
    const secondSave = repo.save(createValidProject(sourceProject, 'Second save'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(writeTitles).toEqual(['first'])
    releaseFirstWrite!()
    await Promise.all([firstSave, secondSave])
    await expect(repo.load('codex-keyframes-tutorial')).resolves.toMatchObject({ title: 'Second save' })
  })
})

describe('workbench server', () => {
  it('serves JSON health and project routes through WorkbenchClient', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    const validProject = createValidProject(sourceProject)
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [sourceProject],
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
    const sourceProject = await createSourceProject()
    const validProject = createValidProject(sourceProject)
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [sourceProject],
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

  it('returns migration-required before applying metadata and persists the confirmed import', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const { sourceProject, sourceRoot } = await createLegacyHyperframesSource()
    const htmlBefore = await readFile(join(sourceProject, 'index.html'), 'utf8')
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [sourceRoot],
      port: 0,
      agentProvider: 'mock',
    })
    const baseUrl = await listen(server)

    try {
      const scanResponse = await fetch(`${baseUrl}/api/imports/hyperframes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourcePath: sourceProject }),
      })
      expect(scanResponse.status).toBe(200)
      await expect(scanResponse.json()).resolves.toMatchObject({
        status: 'migration-required',
        migrationReport: {
          applied: false,
          summary: { recognized: 0, unresolved: 0 },
        },
      })
      expect(await readFile(join(sourceProject, 'index.html'), 'utf8')).toBe(htmlBefore)

      const applyResponse = await fetch(`${baseUrl}/api/imports/hyperframes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourcePath: sourceProject, applyMetadata: true, aspects: ['9:16'] }),
      })
      expect(applyResponse.status).toBe(201)
      await expect(applyResponse.json()).resolves.toMatchObject({
        status: 'ready',
        project: { id: 'legacy-course', actionInstances: [] },
        migrationReport: { applied: true },
      })
      expect(await readFile(join(sourceProject, 'index.html'), 'utf8')).toContain('data-hf-element-id=')
      expect(existsSync(join(projectRoot, 'legacy-course', 'project.json'))).toBe(true)
    } finally {
      await close(server)
    }
  }, 30_000)

  it('contains and probes foreground uploads before updating source manifests', async () => {
    const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
    const sourceProject = await createSourceProject()
    const server = createWorkbenchServer({
      projectRoot,
      allowedSourceRoots: [sourceProject],
      port: 0,
      agentProvider: 'mock',
    })
    const baseUrl = await listen(server)

    try {
      const project = createValidProject(sourceProject)
      const createResponse = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(project),
      })
      expect(createResponse.status).toBe(201)
      const foreground = await createForegroundMedia()
      const uploadResponse = await fetch(`${baseUrl}/api/projects/${project.id}/foreground`, {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
          'x-file-name': foreground.name,
        },
        body: Uint8Array.from(foreground.bytes).buffer,
      })

      expect(uploadResponse.status).toBe(201)
      await expect(uploadResponse.json()).resolves.toMatchObject({
        foreground: {
          relativePath: 'sources/foreground/speaker.mp4',
          metadata: {
            width: 320,
            height: 240,
            fps: 30,
            hasAudio: true,
            codec: 'h264',
          },
        },
      })
      expect(existsSync(join(projectRoot, project.id, 'sources', 'foreground', foreground.name))).toBe(true)
      await expect(readFile(join(projectRoot, project.id, 'sources', 'source-manifest.json'), 'utf8')).resolves.toContain(
        'sources/foreground/speaker.mp4',
      )
      await expect(readFile(join(projectRoot, project.id, 'sources', 'media-manifest.json'), 'utf8')).resolves.toContain(
        '"hasAudio": true',
      )

      const rejectedResponse = await fetch(`${baseUrl}/api/projects/${project.id}/foreground`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/private/tmp/speaker.mp4' }),
      })
      expect(rejectedResponse.status).toBe(400)
      await expect(rejectedResponse.json()).resolves.toMatchObject({
        code: 'FILE_UPLOAD_REQUIRED',
        stage: 'import',
      })
    } finally {
      await close(server)
    }
  }, 30_000)

  it.each(['sources', 'sources/foreground'])(
    'rejects foreground upload through a symlinked %s ancestor',
    async (symlinkLocation) => {
      const projectRoot = await createTemporaryDirectory('course-workbench-projects-')
      const sourceProject = await createSourceProject()
      const project = createValidProject(sourceProject)
      const repository = createProjectRepository(projectRoot, [sourceProject])
      await repository.save(project)
      const outside = await createTemporaryDirectory('course-workbench-upload-escape-')
      const projectDirectory = join(projectRoot, project.id)

      if (symlinkLocation === 'sources') {
        await symlink(outside, join(projectDirectory, 'sources'))
      } else {
        await mkdir(join(projectDirectory, 'sources'))
        await symlink(outside, join(projectDirectory, 'sources', 'foreground'))
      }

      const server = createWorkbenchServer({
        projectRoot,
        allowedSourceRoots: [sourceProject],
        port: 0,
        agentProvider: 'mock',
      })
      const baseUrl = await listen(server)

      try {
        const foreground = await createForegroundMedia()
        const response = await fetch(`${baseUrl}/api/projects/${project.id}/foreground`, {
          method: 'POST',
          headers: {
            'content-type': 'application/octet-stream',
            'x-file-name': foreground.name,
          },
          body: Uint8Array.from(foreground.bytes).buffer,
        })

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toMatchObject({
          code: 'FOREGROUND_PATH_NOT_ALLOWED',
          stage: 'import',
        })
        await expect(readdir(outside)).resolves.toEqual([])
      } finally {
        await close(server)
      }
    },
    30_000,
  )
})

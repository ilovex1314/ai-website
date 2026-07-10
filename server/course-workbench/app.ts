import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { join, relative } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { ZodError } from 'zod'
import {
  DEFAULT_FOREGROUND_WINDOW,
  parseCourseProject,
  type CourseProjectV2,
} from '../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'
import type { WorkbenchConfig } from './config.js'
import { importHyperframesProject } from './hyperframes/importer.js'
import { probeMedia } from './mediaProbe.js'
import {
  resolveContainedPath,
  resolveProjectArtifactPath,
  writeFileNoFollow,
} from './pathSafety.js'
import {
  createProjectRepository,
  WorkbenchServiceError,
  type WorkbenchErrorStage,
} from './projectRepository.js'

export type WorkbenchErrorBody = {
  code: string
  stage: WorkbenchErrorStage
  message: string
  subject?: string
  recovery: string
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(value))
}

function sendError(response: ServerResponse, statusCode: number, body: WorkbenchErrorBody): void {
  sendJson(response, statusCode, body)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers['content-type']

  if (!contentType?.startsWith('application/json')) {
    throw new WorkbenchServiceError({
      code: 'JSON_REQUIRED',
      stage: 'save',
      message: 'Project requests must use application/json',
      recovery: 'Send the CourseProjectV2 JSON document with a JSON content type.',
    })
  }

  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > 1024 * 1024) {
      throw new WorkbenchServiceError({
        code: 'REQUEST_TOO_LARGE',
        stage: 'save',
        message: 'Project JSON exceeds the 1 MB request limit',
        recovery: 'Remove generated media and submit only the project JSON document.',
      })
    }

    chunks.push(buffer)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new WorkbenchServiceError({
      code: 'INVALID_JSON',
      stage: 'save',
      message: 'Request body is not valid JSON',
      recovery: 'Submit a valid CourseProjectV2 JSON document.',
    })
  }
}

function projectIdFromPath(pathname: string): string | undefined {
  const match = /^\/api\/projects\/([^/]+)$/.exec(pathname)

  if (!match) {
    return undefined
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return undefined
  }
}

function foregroundProjectIdFromPath(pathname: string): string | undefined {
  const match = /^\/api\/projects\/([^/]+)\/foreground$/.exec(pathname)

  if (!match) {
    return undefined
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return undefined
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function importRequest(value: unknown): {
  sourcePath: string
  applyMetadata?: boolean
  aspects?: Array<'16:9' | '4:3' | '9:16'>
} {
  const body = record(value)
  const sourcePath = body?.sourcePath
  const applyMetadata = body?.applyMetadata
  const aspects = body?.aspects
  const validAspects = ['16:9', '4:3', '9:16'] as const

  if (
    typeof sourcePath !== 'string'
    || (applyMetadata !== undefined && typeof applyMetadata !== 'boolean')
    || (aspects !== undefined && (
      !Array.isArray(aspects)
      || aspects.some((aspect) => !validAspects.includes(aspect as typeof validAspects[number]))
    ))
  ) {
    throw new WorkbenchServiceError({
      code: 'INVALID_IMPORT_REQUEST',
      stage: 'import',
      message: 'HyperFrames import request is invalid',
      recovery: 'Send sourcePath, optional applyMetadata, and declared 16:9, 4:3, or 9:16 aspects.',
    })
  }

  return {
    sourcePath,
    ...(applyMetadata === undefined ? {} : { applyMetadata }),
    ...(aspects === undefined ? {} : { aspects: aspects as Array<'16:9' | '4:3' | '9:16'> }),
  }
}

async function readManifest(path: string): Promise<Record<string, unknown>> {
  try {
    return record(JSON.parse(await readFile(path, 'utf8'))) ?? {}
  } catch {
    return {}
  }
}

function uploadFileName(request: IncomingMessage): string {
  const contentType = request.headers['content-type']
  const encodedValue = request.headers['x-file-name']
  let value: string | undefined

  try {
    value = typeof encodedValue === 'string' ? decodeURIComponent(encodedValue) : undefined
  } catch {
    value = undefined
  }

  if (
    (contentType !== 'application/octet-stream' && !contentType?.startsWith('video/'))
    || typeof value !== 'string'
    || value.length === 0
    || value === '.'
    || value === '..'
    || value.includes('/')
    || value.includes('\\')
  ) {
    throw new WorkbenchServiceError({
      code: 'FILE_UPLOAD_REQUIRED',
      stage: 'import',
      message: 'Foreground media must be uploaded as binary file content',
      recovery: 'Choose a local video file in the intake UI instead of submitting a filesystem path.',
    })
  }

  return value
}

async function receiveForeground(
  request: IncomingMessage,
  config: WorkbenchConfig,
  project: CourseProjectV2,
): Promise<{
  manifest: { relativePath: string; metadata: Awaited<ReturnType<typeof probeMedia>> }
  source: NonNullable<CourseProjectV2['source']['foreground']>
}> {
  const fileName = uploadFileName(request)
  const pathOptions = {
    allowMissing: true,
    rejectSymlinks: true,
    code: 'FOREGROUND_PATH_NOT_ALLOWED',
    stage: 'import' as const,
    message: 'Foreground upload path must stay inside the course project without symlink ancestors',
    recovery: 'Remove symlinks from the project sources directory and upload the file again.',
  }
  const projectDirectory = await resolveContainedPath(config.projectRoot, project.id, {
    ...pathOptions,
    allowMissing: false,
  })
  const requestedUploadDirectory = await resolveContainedPath(
    projectDirectory,
    join('sources', 'foreground'),
    pathOptions,
  )
  await Promise.all([
    resolveProjectArtifactPath(projectDirectory, 'sources/source-manifest.json'),
    resolveProjectArtifactPath(projectDirectory, 'sources/media-manifest.json'),
  ])
  await mkdir(requestedUploadDirectory, { recursive: true })
  const uploadDirectory = await resolveContainedPath(
    projectDirectory,
    join('sources', 'foreground'),
    { ...pathOptions, allowMissing: false },
  )
  const destination = await resolveContainedPath(
    uploadDirectory,
    fileName,
    pathOptions,
  )
  const pathFromProject = relative(projectDirectory, destination)

  if (pathFromProject.startsWith('..')) {
    throw new WorkbenchServiceError({
      code: 'FOREGROUND_PATH_NOT_ALLOWED',
      stage: 'import',
      message: 'Foreground upload destination escaped the course project',
      subject: fileName,
      recovery: 'Upload a file with a plain filename and supported video extension.',
    })
  }

  const temporary = `${destination}.${randomUUID()}.tmp`
  let size = 0
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length

      if (size > 2 * 1024 * 1024 * 1024) {
        callback(new Error('Foreground upload exceeds 2 GB'))
        return
      }

      callback(null, chunk)
    },
  })

  try {
    await pipeline(request, limiter, createWriteStream(temporary, { flags: 'wx' }))

    if (size === 0) {
      throw new WorkbenchServiceError({
        code: 'FILE_UPLOAD_REQUIRED',
        stage: 'import',
        message: 'Foreground media upload was empty',
        recovery: 'Choose a non-empty local video file and upload it again.',
      })
    }

    const metadata = await probeMedia(temporary)
    await rename(temporary, destination)
    const relativePath = pathFromProject.replaceAll('\\', '/')
    const [sourceManifestPath, mediaManifestPath] = await Promise.all([
      resolveProjectArtifactPath(projectDirectory, 'sources/source-manifest.json'),
      resolveProjectArtifactPath(projectDirectory, 'sources/media-manifest.json'),
    ])
    const sourceManifest = await readManifest(sourceManifestPath)
    const mediaManifest = await readManifest(mediaManifestPath)
    const foreground = { relativePath, metadata }
    await Promise.all([
      writeFileNoFollow(
        sourceManifestPath,
        `${JSON.stringify({ ...sourceManifest, background: project.source.background, foreground }, null, 2)}\n`,
      ),
      writeFileNoFollow(
        mediaManifestPath,
        `${JSON.stringify({ ...mediaManifest, foreground }, null, 2)}\n`,
      ),
    ])
    return {
      manifest: foreground,
      source: {
        id: project.source.foreground?.id ?? 'foreground-speaker',
        mediaUrl: `/@fs${destination}`,
        durationFrames: metadata.durationFrames,
        audioPolicy: 'primary',
        window: project.source.foreground?.window ?? DEFAULT_FOREGROUND_WINDOW,
      },
    }
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

function errorResponse(error: unknown): { statusCode: number; body: WorkbenchErrorBody } {
  if (error instanceof WorkbenchServiceError) {
    return {
      statusCode: error.code === 'PROJECT_NOT_FOUND' ? 404 : 400,
      body: {
        code: error.code,
        stage: error.stage,
        message: error.message,
        ...(error.subject === undefined ? {} : { subject: error.subject }),
        recovery: error.recovery,
      },
    }
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        code: 'INVALID_PROJECT',
        stage: 'save',
        message: 'Project JSON does not satisfy the CourseProjectV2 schema',
        recovery: 'Fix the reported project fields and submit the complete V2 project document.',
      },
    }
  }

  return {
    statusCode: 500,
    body: {
      code: 'INTERNAL_ERROR',
      stage: 'config',
      message: 'Workbench service encountered an unexpected error',
      recovery: 'Check the local Workbench Service logs and try again.',
    },
  }
}

export function createWorkbenchServer(config: WorkbenchConfig): Server {
  const repository = createProjectRepository(config.projectRoot, config.allowedSourceRoots)

  return createServer(async (request, response) => {
    const method = request.method ?? 'GET'
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const projectId = projectIdFromPath(url.pathname)
    const foregroundProjectId = foregroundProjectIdFromPath(url.pathname)

    try {
      if (method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok' })
        return
      }

      if (method === 'GET' && url.pathname === '/api/projects') {
        sendJson(response, 200, { projects: await repository.list() })
        return
      }

      if (method === 'POST' && url.pathname === '/api/imports/hyperframes') {
        const body = importRequest(await readJson(request))
        const result = await importHyperframesProject({
          ...body,
          projectRoot: config.projectRoot,
          allowedSourceRoots: config.allowedSourceRoots,
        })
        sendJson(response, result.status === 'ready' ? 201 : 200, result)
        return
      }

      if (method === 'POST' && foregroundProjectId !== undefined) {
        const project = await repository.load(foregroundProjectId)
        const foreground = await receiveForeground(request, config, project)
        await repository.save({
          ...project,
          source: {
            ...project.source,
            foreground: foreground.source,
          },
        })
        sendJson(response, 201, { foreground: foreground.manifest, source: foreground.source })
        return
      }

      if (method === 'GET' && projectId !== undefined) {
        sendJson(response, 200, await repository.load(projectId))
        return
      }

      if ((method === 'POST' && url.pathname === '/api/projects') || (method === 'PUT' && projectId !== undefined)) {
        const project = parseCourseProject(await readJson(request))

        if (projectId !== undefined && projectId !== project.id) {
          sendError(response, 400, {
            code: 'PROJECT_ID_MISMATCH',
            stage: 'save',
            message: 'Route project id must match the submitted project id',
            subject: projectId,
            recovery: 'Save the project at the route matching its id.',
          })
          return
        }

        const savedProject: CourseProjectV2 = await repository.save(project)
        sendJson(response, method === 'POST' ? 201 : 200, savedProject)
        return
      }

      sendError(response, 404, {
        code: 'ROUTE_NOT_FOUND',
        stage: 'config',
        message: 'Workbench route was not found',
        recovery: 'Use one of the documented /api workbench routes.',
      })
    } catch (error) {
      const { statusCode, body } = errorResponse(error)
      sendError(response, statusCode, body)
    }
  })
}

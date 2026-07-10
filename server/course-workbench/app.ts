import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { ZodError } from 'zod'
import { parseCourseProject, type CourseProjectV2 } from '../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'
import type { WorkbenchConfig } from './config.js'
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

    try {
      if (method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok' })
        return
      }

      if (method === 'GET' && url.pathname === '/api/projects') {
        sendJson(response, 200, { projects: await repository.list() })
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
